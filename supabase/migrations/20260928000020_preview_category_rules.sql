-- Import preview: which category the ledger's own rules would give each parsed
-- row, without writing anything. Same matching as apply_category_rules with
-- p_import_only = true (what commit_import runs on new rows), so the preview
-- shows exactly what the import will do. Imported rows have no merchant name,
-- so merchant rules never match here either.
-- p_rows: [{ "row_number", "type", "amount", "description" }]
create or replace function public.preview_category_rules(p_ledger_id uuid, p_account_id uuid, p_rows jsonb)
returns table (row_number int, category_id uuid, rule_id uuid)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with rows as (
    select (x ->> 'row_number')::int as row_number,
           x ->> 'type' as tx_type,
           (x ->> 'amount')::numeric as amount,
           x ->> 'description' as description
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as x
  )
  select distinct on (t.row_number) t.row_number, r.category_id, r.id
  from rows t
  join public.category_rules r
    on r.ledger_id = p_ledger_id and r.is_active and r.deleted_at is null and r.apply_on_import
   and (r.account_id is null or r.account_id = p_account_id)
   and (r.transaction_type is null or r.transaction_type = t.tx_type)
   and (r.amount_min is null or t.amount >= r.amount_min)
   and (r.amount_max is null or t.amount <= r.amount_max)
   and (
     case r.match_type
       when 'contains' then public.normalize_match_text(case r.match_field when 'merchant' then null else t.description end) like '%' || r.pattern || '%'
       when 'equals' then public.normalize_match_text(case r.match_field when 'merchant' then null else t.description end) = r.pattern
       when 'starts_with' then public.normalize_match_text(case r.match_field when 'merchant' then null else t.description end) like r.pattern || '%'
       when 'regex' then coalesce(case r.match_field when 'merchant' then null else t.description end, '') ~* r.pattern
     end
   )
  order by t.row_number, r.priority, r.created_at;
$$;

grant execute on function public.preview_category_rules(uuid, uuid, jsonb) to authenticated;
