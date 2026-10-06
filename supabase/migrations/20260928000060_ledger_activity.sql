-- Activity log page (Quản lý sổ › Nhật ký): filtered, paged entries with their field
-- changes, limited to what the caller may see — their own actions, ledger and member
-- changes, and changes to transactions / categories / accounts they can see.

create or replace function public.can_see_audit_entry(a public.audit_logs)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select auth.uid() is not null and (
    a.actor_user_id = auth.uid()
    or a.entity_type in ('member', 'ledger')
    or (a.entity_type = 'transaction' and exists (
          select 1 from public.transactions t where t.id = a.entity_id
            and public.can_see_transaction(t.created_by, t.paid_by_user_id, t.category_id)))
    or (a.entity_type = 'category' and public.can_access_category(a.entity_id))
    or (a.entity_type = 'budget' and exists (
          select 1 from public.budgets b where b.id = a.entity_id and b.category_id is not null and public.can_access_category(b.category_id)))
    or (a.entity_type = 'category_rule' and exists (
          select 1 from public.category_rules r where r.id = a.entity_id and public.can_access_category(r.category_id)))
    or (a.entity_type = 'account' and public.owns_account(a.entity_id))
  );
$$;
revoke all on function public.can_see_audit_entry(public.audit_logs) from public, anon;

create or replace function public.ledger_activity(
  p_ledger_id uuid,
  p_actor uuid default null,
  p_action varchar default null,
  p_entity varchar default null,
  p_since timestamptz default null,
  p_search text default null,
  p_before bigint default null,
  p_limit integer default 50
)
returns table (
  id bigint, actor_user_id uuid, action varchar, entity_type varchar, entity_id uuid,
  entity_label varchar, created_at timestamptz, changes jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select a.id, a.actor_user_id, a.action, a.entity_type, a.entity_id, a.entity_label, a.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('f', c.field_name, 'o', c.old_value, 'n', c.new_value) order by c.field_name)
              from public.audit_log_changes c where c.audit_log_id = a.id), '[]'::jsonb)
  from public.audit_logs a
  where public.is_ledger_member(p_ledger_id)
    and a.ledger_id = p_ledger_id
    and (p_actor is null or a.actor_user_id = p_actor)
    and (p_action is null or a.action = p_action)
    and (p_entity is null or a.entity_type = p_entity)
    and (p_since is null or a.created_at >= p_since)
    and (p_before is null or a.id < p_before)
    and (coalesce(p_search, '') = '' or a.entity_label ilike '%' || p_search || '%')
    and public.can_see_audit_entry(a)
  order by a.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
grant execute on function public.ledger_activity(uuid, uuid, varchar, varchar, timestamptz, text, bigint, integer) to authenticated;
