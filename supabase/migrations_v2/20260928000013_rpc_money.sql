-- RPCs: categories, import, bulk edits, recurring generation, budget alerts.

create or replace function public.merge_categories(p_source_id uuid, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_src public.categories;
  v_dst public.categories;
begin
  select * into v_src from public.categories where id = p_source_id and deleted_at is null;
  select * into v_dst from public.categories where id = p_target_id and deleted_at is null;
  if v_src.id is null or v_dst.id is null or v_src.ledger_id <> v_dst.ledger_id or v_src.id = v_dst.id then
    raise exception 'Both categories must exist in the same ledger' using errcode = '22023';
  end if;
  if not public.has_ledger_permission(v_src.ledger_id, 'category.delete') then
    raise exception 'Not allowed to merge categories' using errcode = '42501';
  end if;
  if v_src.is_system then
    raise exception 'System categories cannot be merged away' using errcode = '22023';
  end if;

  update public.transactions set category_id = p_target_id where category_id = p_source_id;
  update public.recurring_rules set category_id = p_target_id where category_id = p_source_id;
  update public.categories set parent_id = p_target_id where parent_id = p_source_id and id <> p_target_id;
  update public.category_rules r set category_id = p_target_id
  where r.category_id = p_source_id and r.deleted_at is null
    and not exists (
      select 1 from public.category_rules x
      where x.ledger_id = r.ledger_id and x.match_field = r.match_field and x.match_type = r.match_type
        and x.pattern = r.pattern and x.category_id = p_target_id and x.deleted_at is null
    );
  update public.category_rules set deleted_at = now() where category_id = p_source_id and deleted_at is null;
  update public.budgets set deleted_at = now() where category_id = p_source_id and deleted_at is null;
  update public.categories set deleted_at = now(), is_archived = true where id = p_source_id;
end;
$$;

-- Assigns categories to uncategorized transactions from active rules
-- (lowest priority value wins). Returns the number of transactions updated.
create or replace function public.apply_category_rules(
  p_ledger_id uuid, p_transaction_ids uuid[] default null, p_import_only boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  if auth.uid() is not null and not public.has_ledger_permission(p_ledger_id, 'transaction.update') then
    raise exception 'Not allowed to update transactions' using errcode = '42501';
  end if;

  with matches as (
    select distinct on (t.id) t.id as transaction_id, r.id as rule_id, r.category_id
    from public.transactions t
    join public.category_rules r
      on r.ledger_id = t.ledger_id and r.is_active and r.deleted_at is null
     and (not p_import_only or r.apply_on_import)
     and (r.account_id is null or r.account_id = t.account_id)
     and (r.transaction_type is null or r.transaction_type = t.transaction_type)
     and (r.amount_min is null or t.amount >= r.amount_min)
     and (r.amount_max is null or t.amount <= r.amount_max)
     and (
       case r.match_type
         when 'contains' then public.normalize_match_text(case r.match_field when 'merchant' then t.merchant_name else t.description end) like '%' || r.pattern || '%'
         when 'equals' then public.normalize_match_text(case r.match_field when 'merchant' then t.merchant_name else t.description end) = r.pattern
         when 'starts_with' then public.normalize_match_text(case r.match_field when 'merchant' then t.merchant_name else t.description end) like r.pattern || '%'
         when 'regex' then coalesce(case r.match_field when 'merchant' then t.merchant_name else t.description end, '') ~* r.pattern
       end
     )
    where t.ledger_id = p_ledger_id
      and t.deleted_at is null
      and t.category_id is null
      and (p_transaction_ids is null or t.id = any (p_transaction_ids))
    order by t.id, r.priority, r.created_at
  ),
  updated as (
    update public.transactions t
    set category_id = m.category_id, categorized_by = 'rule', category_rule_id = m.rule_id, needs_review = false
    from matches m
    where t.id = m.transaction_id
    returning m.rule_id
  ),
  hits as (
    update public.category_rules r
    set hit_count = r.hit_count + h.n, last_matched_at = now()
    from (select rule_id, count(*) as n from updated group by rule_id) h
    where r.id = h.rule_id
    returning 1
  )
  select count(*) into v_count from updated;
  return v_count;
end;
$$;

-- Import row payload: [{ "row_number", "date", "time", "amount", "type",
-- "description", "external_id", "category_id", "raw_line", "selected",
-- "values": [{ "name", "value" }] }]. jsonb is only the RPC transport
-- format — every value lands in typed columns / child tables.
create or replace function public.import_dedupe_hash(
  p_account_id uuid, p_date date, p_amount numeric, p_type varchar, p_description text, p_occurrence int
)
returns char(64)
language sql
immutable
as $$
  select public.sha256_hex(
    p_account_id::text || '|' || p_date::text || '|' || trim(to_char(p_amount, 'FM999999999999990.0000')) || '|' ||
    p_type || '|' || public.normalize_match_text(p_description) || '|' || p_occurrence::text
  );
$$;

create or replace function public.check_import_duplicates(p_account_id uuid, p_rows jsonb)
returns table (row_number int, duplicate_of_id uuid)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with rows as (
    select
      (r ->> 'row_number')::int as row_number,
      nullif(r ->> 'external_id', '') as external_id,
      public.import_dedupe_hash(
        p_account_id, (r ->> 'date')::date, abs((r ->> 'amount')::numeric), r ->> 'type', r ->> 'description',
        (row_number() over (
          partition by r ->> 'date', abs((r ->> 'amount')::numeric), r ->> 'type', public.normalize_match_text(r ->> 'description')
          order by (r ->> 'row_number')::int))::int
      ) as hash
    from jsonb_array_elements(p_rows) r
  )
  select rows.row_number, t.id
  from rows
  join public.transactions t
    on t.account_id = p_account_id and t.deleted_at is null
   and ((rows.external_id is not null and t.external_id = rows.external_id) or t.dedupe_hash = rows.hash);
$$;

create or replace function public.import_transactions(
  p_ledger_id uuid,
  p_account_id uuid,
  p_provider_code varchar,
  p_file_name varchar,
  p_file_type varchar,
  p_checksum char(64),
  p_rows jsonb,
  p_file_size integer default null,
  p_file_path text default null
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job public.import_jobs;
  v_currency char(3);
  v_row record;
  v_value jsonb;
  v_import_row uuid;
  v_dup uuid;
  v_tx uuid;
  v_new_ids uuid[] := '{}';
  v_idx int;
begin
  if not public.has_ledger_permission(p_ledger_id, 'import.create') then
    raise exception 'Not allowed to import into this ledger' using errcode = '42501';
  end if;
  select currency_code into v_currency from public.financial_accounts
  where id = p_account_id and ledger_id = p_ledger_id and deleted_at is null;
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
      coalesce(nullif(r ->> 'description', ''), '—') as description,
      nullif(r ->> 'external_id', '') as external_id,
      nullif(r ->> 'category_id', '')::uuid as category_id,
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
       or v_row.tx_type not in ('expense', 'income') then
      update public.import_rows set status = 'error', error_message = 'invalid_row' where id = v_import_row;
      continue;
    end if;

    select t.id into v_dup from public.transactions t
    where t.account_id = p_account_id and t.deleted_at is null
      and ((v_row.external_id is not null and t.external_id = v_row.external_id) or t.dedupe_hash = v_row.hash)
    limit 1;
    if v_dup is not null then
      update public.import_rows set status = 'duplicate', duplicate_of_id = v_dup where id = v_import_row;
      continue;
    end if;

    insert into public.transactions (
      ledger_id, account_id, transaction_type, amount, currency_code, transaction_date, transaction_time,
      description, category_id, categorized_by, source, import_job_id, import_row_id,
      external_id, dedupe_hash, created_by, paid_by_user_id
    ) values (
      p_ledger_id, p_account_id, v_row.tx_type, v_row.amount, v_currency, v_row.tx_date, v_row.tx_time,
      v_row.description, v_row.category_id, case when v_row.category_id is not null then 'import' end,
      'import', v_job.id, v_import_row, v_row.external_id, v_row.hash, auth.uid(), auth.uid()
    )
    returning id into v_tx;

    update public.import_rows set status = 'imported' where id = v_import_row;
    v_new_ids := v_new_ids || v_tx;
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
$$;

-- Bulk edits run as the caller so RLS enforces permissions row by row.
create or replace function public.bulk_update_transactions(
  p_ids uuid[],
  p_category_id uuid default null,
  p_account_id uuid default null,
  p_is_reconciled boolean default null,
  p_add_tag_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  update public.transactions
  set category_id = coalesce(p_category_id, category_id),
      categorized_by = case when p_category_id is not null then 'manual' else categorized_by end,
      needs_review = case when p_category_id is not null then false else needs_review end,
      account_id = coalesce(p_account_id, account_id),
      is_reconciled = coalesce(p_is_reconciled, is_reconciled)
  where id = any (p_ids) and deleted_at is null;
  get diagnostics v_count = row_count;

  if p_add_tag_id is not null then
    insert into public.transaction_tags (transaction_id, tag_id)
    select unnest(p_ids), p_add_tag_id
    on conflict do nothing;
  end if;
  return v_count;
end;
$$;

create or replace function public.bulk_delete_transactions(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  update public.transactions set deleted_at = now() where id = any (p_ids) and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =========================================================================
-- Recurring
-- =========================================================================

create or replace function public.recurring_next_date(
  p_from date, p_frequency varchar, p_interval smallint, p_day_of_month smallint, p_day_of_week smallint
)
returns date
language plpgsql
immutable
as $$
declare
  v_next date;
  v_month_start date;
begin
  case p_frequency
    when 'daily' then
      v_next := p_from + p_interval;
    when 'weekly' then
      v_next := p_from + 7 * p_interval;
      if p_day_of_week is not null then
        v_next := v_next - ((extract(dow from v_next)::int - p_day_of_week + 7) % 7);
        if v_next <= p_from then v_next := v_next + 7; end if;
      end if;
    when 'monthly' then
      v_month_start := (date_trunc('month', p_from) + make_interval(months => p_interval))::date;
      v_next := least(
        v_month_start + (coalesce(p_day_of_month, extract(day from p_from)::int) - 1),
        (v_month_start + interval '1 month - 1 day')::date
      );
    when 'yearly' then
      v_next := (p_from + make_interval(years => p_interval))::date;
  end case;
  return v_next;
end;
$$;

create or replace function public.generate_recurring_transactions(p_ledger_id uuid default null, p_until date default current_date)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rule public.recurring_rules;
  v_date date;
  v_count integer := 0;
  v_guard integer;
  v_status varchar(20);
  v_members uuid[];
begin
  if p_ledger_id is not null and auth.uid() is not null and not public.is_ledger_member(p_ledger_id) then
    raise exception 'Not a member of this ledger' using errcode = '42501';
  end if;

  for v_rule in
    select * from public.recurring_rules
    where is_active and deleted_at is null and next_run_date <= p_until
      and (p_ledger_id is null or ledger_id = p_ledger_id)
    for update skip locked
  loop
    v_date := v_rule.next_run_date;
    v_guard := 0;
    v_status := case when v_rule.auto_post then 'posted' else 'pending' end;
    while v_date <= p_until and (v_rule.end_date is null or v_date <= v_rule.end_date) and v_guard < 60 loop
      insert into public.transactions (
        ledger_id, account_id, transfer_account_id, transaction_type, status, amount, currency_code,
        transaction_date, description, notes, category_id, categorized_by, source,
        recurring_rule_id, recurring_occurrence, created_by, paid_by_user_id
      ) values (
        v_rule.ledger_id, v_rule.account_id, v_rule.transfer_account_id, v_rule.transaction_type, v_status,
        v_rule.amount, v_rule.currency_code, v_date, v_rule.description, v_rule.notes, v_rule.category_id,
        case when v_rule.category_id is not null then 'manual' end, 'recurring',
        v_rule.id, v_date, v_rule.created_by, v_rule.created_by
      )
      on conflict do nothing;
      if found then
        v_count := v_count + 1;
        if not v_rule.auto_post then
          select array_agg(user_id) into v_members from public.ledger_members
          where ledger_id = v_rule.ledger_id and status = 'active' and role_code in ('OWNER', 'ADMIN', 'MEMBER', 'ACCOUNTANT');
          perform public.notify_users(
            v_members, v_rule.ledger_id, 'recurring_pending', '/recurring', 'recurring', v_rule.id,
            array['name', 'date'], array[v_rule.name, v_date::text]
          );
        end if;
      end if;
      v_date := public.recurring_next_date(v_date, v_rule.frequency, v_rule.interval_count, v_rule.day_of_month, v_rule.day_of_week);
      v_guard := v_guard + 1;
    end loop;

    update public.recurring_rules
    set next_run_date = v_date,
        last_generated_date = greatest(coalesce(last_generated_date, v_rule.next_run_date), least(v_date - 1, p_until)),
        is_active = case when end_date is not null and v_date > end_date then false else is_active end
    where id = v_rule.id;
  end loop;
  return v_count;
end;
$$;

-- =========================================================================
-- Budget alerts: after an expense lands in a budgeted category, notify active
-- members the first time the month crosses the warning / 100% threshold.
-- =========================================================================

create or replace function public.tg_transactions_budget_alert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_month date := date_trunc('month', new.transaction_date)::date;
  v_budget record;
  v_spent numeric;
  v_before numeric;
  v_pct numeric;
  v_before_pct numeric;
  v_type varchar(40);
  v_members uuid[];
  v_category public.categories;
begin
  if new.transaction_type <> 'expense' or new.category_id is null or new.status <> 'posted' or new.deleted_at is not null then
    return null;
  end if;

  select * into v_budget from public.v_category_monthly
  where ledger_id = new.ledger_id and category_id = new.category_id and month = v_month;
  if v_budget.budget_amount is null then
    return null;
  end if;

  v_spent := v_budget.expense;
  v_before := v_spent - case when tg_op = 'INSERT' then new.base_amount else 0 end;
  v_pct := v_spent / v_budget.budget_amount * 100;
  v_before_pct := v_before / v_budget.budget_amount * 100;

  if v_pct >= 100 and v_before_pct < 100 then
    v_type := 'budget_exceeded';
  elsif v_pct >= v_budget.warning_threshold_pct and v_before_pct < v_budget.warning_threshold_pct then
    v_type := 'budget_warning';
  else
    return null;
  end if;

  select * into v_category from public.categories where id = new.category_id;
  select array_agg(user_id) into v_members from public.ledger_members
  where ledger_id = new.ledger_id and status = 'active';
  perform public.notify_users(
    v_members, new.ledger_id, v_type, '/categories/' || v_category.slug, 'category', v_category.id,
    array['category', 'pct'], array[v_category.name, round(v_pct)::text]
  );
  return null;
end;
$$;

create trigger trg_transactions_budget_alert
  after insert on public.transactions
  for each row execute function public.tg_transactions_budget_alert();
