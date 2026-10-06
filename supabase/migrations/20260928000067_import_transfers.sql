-- Top-ups are transfers, not income or spending.
--
-- Loading a wallet (PayPay チャージ / Top-Up) from a card moves money between two
-- of the user's own accounts. Imports used to file the wallet side as income and
-- the card side as an expense, so income was inflated, spending counted twice
-- (once on the card, again when the wallet money was spent) and the wallet
-- balance drifted.
--
-- Import rows may now be type 'transfer' with:
--   direction            'in'  money arrives in the imported account (wallet top-up)
--                        'out' money leaves it (the card's チャージ line)
--   transfer_account_id  the other account (must be the caller's, same ledger and currency)
-- A transfer is stored source → destination (account_id → transfer_account_id).
-- The same top-up seen from both statements is one transfer: a row matches an
-- existing transfer between the same two accounts, same amount, within a day.

-- The closest unclaimed transfer between the two accounts, or null.
create or replace function public.find_import_transfer(
  p_from uuid, p_to uuid, p_amount numeric, p_date date, p_claimed uuid[]
)
returns uuid
language sql
stable
set search_path = public, extensions
as $$
  select t.id from public.transactions t
  where t.transaction_type = 'transfer' and t.deleted_at is null
    and t.account_id = p_from and t.transfer_account_id = p_to
    and t.amount = p_amount
    and t.transaction_date between p_date - 1 and p_date + 1
    and not (t.id = any (coalesce(p_claimed, '{}')))
  order by abs(t.transaction_date - p_date), t.created_at
  limit 1;
$$;

create or replace function public.check_import_duplicates(p_account_id uuid, p_rows jsonb)
returns table (row_number int, duplicate_of_id uuid)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_row record;
  v_hit uuid;
  v_claimed uuid[] := '{}';
begin
  for v_row in
    select
      (r ->> 'row_number')::int as rn,
      (r ->> 'date')::date as tx_date,
      abs((r ->> 'amount')::numeric) as amount,
      r ->> 'type' as tx_type,
      r ->> 'direction' as direction,
      nullif(r ->> 'transfer_account_id', '')::uuid as other,
      nullif(r ->> 'external_id', '') as external_id,
      public.import_dedupe_hash(
        p_account_id, (r ->> 'date')::date, abs((r ->> 'amount')::numeric), r ->> 'type', r ->> 'description',
        (row_number() over (
          partition by r ->> 'date', abs((r ->> 'amount')::numeric), r ->> 'type', public.normalize_match_text(r ->> 'description')
          order by (r ->> 'row_number')::int))::int
      ) as hash
    from jsonb_array_elements(p_rows) r
    order by (r ->> 'row_number')::int
  loop
    v_hit := null;
    select t.id into v_hit from public.transactions t
    where t.account_id = p_account_id and t.deleted_at is null
      and ((v_row.external_id is not null and t.external_id = v_row.external_id) or t.dedupe_hash = v_row.hash)
    limit 1;
    if v_hit is null and v_row.tx_type = 'transfer' and v_row.other is not null then
      v_hit := case when v_row.direction = 'in'
        then public.find_import_transfer(v_row.other, p_account_id, v_row.amount, v_row.tx_date, v_claimed)
        else public.find_import_transfer(p_account_id, v_row.other, v_row.amount, v_row.tx_date, v_claimed) end;
      if v_hit is not null then v_claimed := v_claimed || v_hit; end if;
    end if;
    if v_hit is not null then
      row_number := v_row.rn; duplicate_of_id := v_hit;
      return next;
    end if;
  end loop;
end;
$$;

CREATE OR REPLACE FUNCTION public.import_transactions(p_ledger_id uuid, p_account_id uuid, p_provider_code character varying, p_file_name character varying, p_file_type character varying, p_checksum character, p_rows jsonb, p_file_size integer DEFAULT NULL::integer, p_file_path text DEFAULT NULL::text)
 RETURNS import_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_job public.import_jobs;
  v_currency char(3);
  v_row record;
  v_value jsonb;
  v_import_row uuid;
  v_dup uuid;
  v_tx uuid;
  v_new_ids uuid[] := '{}';
  v_claimed uuid[] := '{}';
  v_idx int;
  v_from uuid;
  v_to uuid;
begin
  if not public.has_ledger_permission(p_ledger_id, 'import.create') then
    raise exception 'Not allowed to import into this ledger' using errcode = '42501';
  end if;
  select currency_code into v_currency from public.financial_accounts
  where id = p_account_id and ledger_id = p_ledger_id and owner_id = auth.uid() and deleted_at is null;
  if v_currency is null then
    raise exception 'Account not found in this ledger' using errcode = '22023';
  end if;

  insert into public.import_jobs (
    ledger_id, account_id, provider_code, file_name, file_type, file_path, file_size, checksum,
    status, total_rows, created_by
  ) values (
    p_ledger_id, p_account_id, p_provider_code, p_file_name, p_file_type, p_file_path, p_file_size, p_checksum,
    'importing', jsonb_array_length(p_rows), auth.uid()
  )
  returning * into v_job;

  for v_row in
    select
      r,
      (r ->> 'row_number')::int as row_number,
      (r ->> 'date')::date as tx_date,
      nullif(r ->> 'time', '')::time as tx_time,
      abs((r ->> 'amount')::numeric) as amount,
      r ->> 'type' as tx_type,
      r ->> 'direction' as direction,
      (select a.id from public.financial_accounts a
        where a.id = nullif(r ->> 'transfer_account_id', '')::uuid and a.id <> p_account_id
          and a.ledger_id = p_ledger_id and a.owner_id = auth.uid() and a.deleted_at is null
          and a.currency_code = v_currency) as other,
      coalesce(nullif(r ->> 'description', ''), '—') as description,
      nullif(r ->> 'external_id', '') as external_id,
      case when public.can_access_category(nullif(r ->> 'category_id', '')::uuid)
           then nullif(r ->> 'category_id', '')::uuid end as category_id,
      coalesce((r ->> 'selected')::boolean, true) as selected,
      public.import_dedupe_hash(
        p_account_id, (r ->> 'date')::date, abs((r ->> 'amount')::numeric), r ->> 'type', r ->> 'description',
        (row_number() over (
          partition by r ->> 'date', abs((r ->> 'amount')::numeric), r ->> 'type', public.normalize_match_text(r ->> 'description')
          order by (r ->> 'row_number')::int))::int
      ) as hash
    from jsonb_array_elements(p_rows) r
    order by (r ->> 'row_number')::int
  loop
    insert into public.import_rows (
      import_job_id, row_number, raw_line, parsed_date, parsed_amount, parsed_type, parsed_description,
      suggested_category_id, status
    ) values (
      v_job.id, v_row.row_number, v_row.r ->> 'raw_line', v_row.tx_date, v_row.amount, v_row.tx_type,
      v_row.description, v_row.category_id, 'new'
    )
    returning id into v_import_row;

    v_idx := 0;
    for v_value in select * from jsonb_array_elements(coalesce(v_row.r -> 'values', '[]'::jsonb)) loop
      insert into public.import_row_values (import_row_id, column_index, column_name, value)
      values (v_import_row, v_idx, left(coalesce(v_value ->> 'name', 'col' || v_idx), 100), v_value ->> 'value');
      v_idx := v_idx + 1;
    end loop;

    if not v_row.selected then
      update public.import_rows set status = 'skipped' where id = v_import_row;
      continue;
    end if;
    if v_row.tx_date is null or v_row.amount is null or v_row.amount = 0
       or v_row.tx_type not in ('expense', 'income', 'transfer')
       or (v_row.tx_type = 'transfer' and (v_row.other is null or v_row.direction not in ('in', 'out'))) then
      update public.import_rows set status = 'error', error_message = 'invalid_row' where id = v_import_row;
      continue;
    end if;

    v_from := null; v_to := null;
    if v_row.tx_type = 'transfer' then
      v_from := case when v_row.direction = 'in' then v_row.other else p_account_id end;
      v_to := case when v_row.direction = 'in' then p_account_id else v_row.other end;
    end if;

    select t.id into v_dup from public.transactions t
    where t.account_id = p_account_id and t.deleted_at is null
      and ((v_row.external_id is not null and t.external_id = v_row.external_id) or t.dedupe_hash = v_row.hash)
    limit 1;
    -- The other statement already brought this top-up in.
    if v_dup is null and v_row.tx_type = 'transfer' then
      v_dup := public.find_import_transfer(v_from, v_to, v_row.amount, v_row.tx_date, v_claimed);
      if v_dup is not null then v_claimed := v_claimed || v_dup; end if;
    end if;
    if v_dup is not null then
      update public.import_rows set status = 'duplicate', duplicate_of_id = v_dup where id = v_import_row;
      continue;
    end if;

    insert into public.transactions (
      ledger_id, account_id, transfer_account_id, transaction_type, amount, currency_code, transaction_date, transaction_time,
      description, category_id, categorized_by, source, import_job_id, import_row_id,
      external_id, dedupe_hash, created_by, paid_by_user_id
    ) values (
      p_ledger_id, coalesce(v_from, p_account_id), v_to, v_row.tx_type, v_row.amount, v_currency, v_row.tx_date, v_row.tx_time,
      v_row.description,
      case when v_row.tx_type <> 'transfer' then v_row.category_id end,
      case when v_row.tx_type <> 'transfer' and v_row.category_id is not null then 'import' end,
      'import', v_job.id, v_import_row, v_row.external_id, v_row.hash, auth.uid(), auth.uid()
    )
    returning id into v_tx;

    update public.import_rows set status = 'imported' where id = v_import_row;
    -- Rules classify spending and income; a transfer stays uncategorized.
    if v_row.tx_type <> 'transfer' then
      v_new_ids := v_new_ids || v_tx;
    end if;
    v_claimed := v_claimed || v_tx;
  end loop;

  if array_length(v_new_ids, 1) > 0 then
    perform public.apply_category_rules(p_ledger_id, v_new_ids, true);
  end if;

  update public.import_jobs j
  set status = 'completed',
      completed_at = now(),
      imported_rows = s.imported,
      duplicate_rows = s.duplicate,
      skipped_rows = s.skipped,
      error_rows = s.error
  from (
    select
      count(*) filter (where status = 'imported') as imported,
      count(*) filter (where status = 'duplicate') as duplicate,
      count(*) filter (where status = 'skipped') as skipped,
      count(*) filter (where status = 'error') as error
    from public.import_rows where import_job_id = v_job.id
  ) s
  where j.id = v_job.id
  returning j.* into v_job;

  perform public.notify_users(
    array[auth.uid()], p_ledger_id, 'import_done', '/transactions', 'import', v_job.id,
    array['count', 'duplicates', 'file'],
    array[v_job.imported_rows::text, v_job.duplicate_rows::text, p_file_name]
  );
  return v_job;
end;
$function$;

-- One-time fix of top-ups already imported (the owner agreed to it).
-- For each owner with one PayPay wallet and one PayPay card in a ledger:
--   wallet rows imported as income from a card top-up ("Top-Up … Credit", "チャージ … クレジット")
--   and card rows imported as expense "チャージ"
-- become transfers card → wallet, uncategorized. When both statements hold the
-- same top-up, the wallet copy is removed (soft delete) so it counts once.
do $$
declare
  p record;
  top record;
  v_twin uuid;
  v_paired uuid[] := '{}';
begin
  for p in
    select w.ledger_id, w.owner_id, w.id as wallet, c.id as card
    from public.financial_accounts w
    join public.financial_accounts c
      on c.ledger_id = w.ledger_id and c.owner_id = w.owner_id
     and c.provider_code = 'paypay_card' and c.deleted_at is null and c.currency_code = w.currency_code
    where w.provider_code = 'paypay' and w.account_type_code = 'e_wallet' and w.deleted_at is null
      and (select count(*) from public.financial_accounts x
           where x.ledger_id = w.ledger_id and x.owner_id = w.owner_id and x.deleted_at is null
             and x.provider_code in ('paypay', 'paypay_card')) = 2
  loop
    -- Card side first: its rows are the card's own record of the charge.
    update public.transactions t
       set transaction_type = 'transfer', transfer_account_id = p.wallet,
           category_id = null, categorized_by = null, category_rule_id = null, needs_review = false
     where t.account_id = p.card and t.transaction_type = 'expense' and t.deleted_at is null
       and t.source = 'import'
       and public.normalize_match_text(t.description) in (public.normalize_match_text('チャージ'), public.normalize_match_text('PayPayチャージ'));

    for top in
      select tx.id, tx.amount, tx.transaction_date
      from public.transactions tx
      join public.import_rows r on r.id = tx.import_row_id
      where tx.account_id = p.wallet and tx.transaction_type = 'income' and tx.deleted_at is null
        and tx.source = 'import'
        and (r.raw_line ~* 'top-?up' or r.raw_line like '%チャージ%')
        and (r.raw_line ~* 'credit' or r.raw_line like '%クレジット%' or r.raw_line like '%カード%')
      order by tx.transaction_date, tx.created_at
    loop
      -- The same top-up from the card statement, not yet paired.
      select o.id into v_twin from public.transactions o
      join public.import_jobs j on j.id = o.import_job_id and j.account_id = p.card
      where o.account_id = p.card and o.transfer_account_id = p.wallet and o.deleted_at is null
        and o.amount = top.amount and o.transaction_date between top.transaction_date - 1 and top.transaction_date + 1
        and not (o.id = any (v_paired))
      order by abs(o.transaction_date - top.transaction_date)
      limit 1;
      if v_twin is not null then
        v_paired := v_paired || v_twin;
        update public.transactions set deleted_at = now() where id = top.id;
      else
        update public.transactions
           set account_id = p.card, transfer_account_id = p.wallet, transaction_type = 'transfer',
               category_id = null, categorized_by = null, category_rule_id = null, needs_review = false
         where id = top.id;
      end if;
    end loop;
  end loop;
end $$;
