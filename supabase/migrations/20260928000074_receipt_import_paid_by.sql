-- Receipts and imports can be booked for another member of the ledger ("User"
-- on the review screens), like a transaction entered by hand. Anyone not an
-- active member of the ledger falls back to the person saving.
drop function if exists public.save_receipt(uuid, uuid, character varying, date, text, numeric, text, uuid, jsonb, jsonb);
drop function if exists public.import_transactions(uuid, uuid, character varying, character varying, character varying, character, jsonb, integer, text);

CREATE OR REPLACE FUNCTION public.save_receipt(p_ledger_id uuid, p_account_id uuid, p_type character varying, p_date date, p_merchant text, p_total numeric, p_notes text DEFAULT NULL::text, p_fallback_category_id uuid DEFAULT NULL::uuid, p_document jsonb DEFAULT NULL::jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_paid_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_currency char(3);
  v_dp int;
  v_doc uuid;
  v_sum numeric;
  v_left numeric;
  v_share numeric;
  v_tx uuid;
  v_ids uuid[] := '{}';
  g record;
  v_n int;
  v_i int := 0;
begin
  if not public.has_ledger_permission(p_ledger_id, 'transaction.create') then
    raise exception 'Not allowed to add transactions' using errcode = '42501';
  end if;
  if p_type not in ('expense', 'income') or p_total is null or p_total <= 0 then
    raise exception 'A receipt needs a positive total' using errcode = '22023';
  end if;
  select a.currency_code, c.decimal_places into v_currency, v_dp
  from public.financial_accounts a join public.currencies c on c.code = a.currency_code
  where a.id = p_account_id and a.ledger_id = p_ledger_id and a.owner_id = auth.uid() and a.deleted_at is null;
  if v_currency is null then
    raise exception 'Account not in this ledger' using errcode = '22023';
  end if;
  if p_fallback_category_id is not null and not public.can_access_category(p_fallback_category_id) then
    p_fallback_category_id := null;
  end if;
  perform set_config('client_min_messages', 'warning', true);
  -- Categories must belong to the ledger (anything else is dropped to "uncategorized").
  drop table if exists _items;
  create temp table _items on commit drop as
  select x.n::smallint as line_number,
         left(coalesce(nullif(trim(x.v ->> 'name'), ''), '—'), 200) as name,
         coalesce((x.v ->> 'quantity')::numeric, 1) as quantity,
         (x.v ->> 'unit_price')::numeric as unit_price,
         coalesce((x.v ->> 'amount')::numeric, 0) as amount,
         (select c.id from public.categories c where c.id = (x.v ->> 'category_id')::uuid and c.ledger_id = p_ledger_id and c.deleted_at is null
                                           and public.can_access_category(c.id)) as category_id,
         case when x.v ->> 'categorized_by' in ('manual', 'rule', 'ai') then x.v ->> 'categorized_by' end as categorized_by
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as x(v, n);

  if p_document is not null then
    insert into public.documents (
      ledger_id, document_type, storage_path, file_name, mime_type, file_size, ocr_status, ocr_provider,
      extracted_merchant, extracted_date, extracted_total, extracted_tax, extracted_currency, extracted_payment_method
    ) values (
      p_ledger_id, 'receipt', p_document ->> 'storage_path', left(p_document ->> 'file_name', 255),
      left(coalesce(p_document ->> 'mime_type', 'image/jpeg'), 50), coalesce((p_document ->> 'file_size')::int, 0),
      coalesce(p_document ->> 'ocr_status', 'done'), p_document ->> 'ocr_provider',
      left(coalesce(p_document ->> 'extracted_merchant', p_merchant), 200), coalesce((p_document ->> 'extracted_date')::date, p_date),
      coalesce((p_document ->> 'extracted_total')::numeric, p_total), (p_document ->> 'extracted_tax')::numeric, v_currency,
      left(p_document ->> 'extracted_payment_method', 30)
    ) returning id into v_doc;
    insert into public.document_line_items (document_id, line_number, name, quantity, unit_price, amount, category_id)
    select v_doc, line_number, name, quantity, unit_price, amount, category_id from _items;
  end if;

  -- Per-category totals; a category whose lines net to ≤ 0 (a discount on its
  -- own line) folds into the largest one.
  drop table if exists _groups;
  create temp table _groups on commit drop as
  select category_id, sum(amount) as amount,
         case when bool_or(categorized_by = 'manual') then 'manual'
              when bool_or(categorized_by = 'rule') then 'rule'
              when bool_or(categorized_by = 'ai') then 'ai' end as categorized_by
  from _items group by category_id;

  select coalesce(sum(amount), 0) into v_sum from _groups where amount > 0;
  if v_sum <= 0 then
    delete from _groups;
    insert into _groups values (p_fallback_category_id, p_total, case when p_fallback_category_id is not null then 'manual' end);
    v_sum := p_total;
  else
    delete from _groups where amount <= 0;
  end if;

  select count(*) into v_n from _groups;
  v_left := p_total;
  for g in select * from _groups order by amount desc, category_id nulls last loop
    v_i := v_i + 1;
    -- The largest group (first) takes the rounding remainder at the end.
    v_share := case when v_i = 1 then 0 else round(p_total * g.amount / v_sum, v_dp) end;
    if v_i > 1 then v_left := v_left - v_share; end if;
    insert into public.transactions (
      ledger_id, account_id, transaction_type, amount, currency_code, transaction_date,
      description, merchant_name, category_id, categorized_by, needs_review, notes, source, document_id, created_by, paid_by_user_id
    ) values (
      p_ledger_id, p_account_id, p_type, greatest(coalesce(nullif(v_share, 0), p_total), 0.0001), v_currency, p_date,
      coalesce(nullif(trim(p_merchant), ''), '—'), left(nullif(trim(p_merchant), ''), 200), g.category_id,
      case when g.category_id is not null then coalesce(g.categorized_by, 'manual') end, false,
      nullif(trim(p_notes), ''), 'scan', v_doc, auth.uid(), (case when p_paid_by is not null and exists (select 1 from public.ledger_members m where m.ledger_id = p_ledger_id and m.user_id = p_paid_by and m.status = 'active') then p_paid_by else auth.uid() end)
    ) returning id into v_tx;
    v_ids := v_ids || v_tx;
    if v_doc is not null then
      update public.document_line_items set transaction_id = v_tx
      where document_id = v_doc and category_id is not distinct from g.category_id;
    end if;
  end loop;

  -- Now that the others are known, give the largest group what is left.
  update public.transactions set amount = v_left where id = v_ids[1];
  if v_left <= 0 then
    raise exception 'Receipt lines do not add up to the total' using errcode = '22023';
  end if;

  -- Lines of a folded (≤ 0) category go with the largest transaction.
  if v_doc is not null then
    update public.document_line_items set transaction_id = v_ids[1] where document_id = v_doc and transaction_id is null;
    update public.documents set transaction_id = v_ids[1] where id = v_doc;
  end if;

  return jsonb_build_object('document_id', v_doc, 'transaction_ids', to_jsonb(v_ids));
end;
$function$;

CREATE OR REPLACE FUNCTION public.import_transactions(p_ledger_id uuid, p_account_id uuid, p_provider_code character varying, p_file_name character varying, p_file_type character varying, p_checksum character, p_rows jsonb, p_file_size integer DEFAULT NULL::integer, p_file_path text DEFAULT NULL::text, p_paid_by uuid DEFAULT NULL::uuid)
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
      'import', v_job.id, v_import_row, v_row.external_id, v_row.hash, auth.uid(), (case when p_paid_by is not null and exists (select 1 from public.ledger_members m where m.ledger_id = p_ledger_id and m.user_id = p_paid_by and m.status = 'active') then p_paid_by else auth.uid() end)
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

grant execute on function public.save_receipt(uuid, uuid, character varying, date, text, numeric, text, uuid, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.import_transactions(uuid, uuid, character varying, character varying, character varying, character, jsonb, integer, text, uuid) to authenticated;
revoke execute on function public.import_transactions(uuid, uuid, character varying, character varying, character varying, character, jsonb, integer, text, uuid) from public, anon;
