-- A member's transaction count follows the transaction's "user" (paid_by_user_id),
-- the person shown on every transaction row and in its detail, not whoever typed
-- it in. Changing a transaction's user moves it to the new person's count.
create or replace function public.ledger_member_summary(p_ledger_id uuid)
returns table (user_id uuid, tx_count bigint, pending_requests bigint, last_active_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select m.user_id,
    (select count(*) from public.transactions t
     where t.ledger_id = p_ledger_id and t.deleted_at is null and coalesce(t.paid_by_user_id, t.created_by) = m.user_id
       and public.can_see_transaction(t.created_by, t.paid_by_user_id, t.category_id)),
    (select count(*) from public.category_change_requests r
     where r.ledger_id = p_ledger_id and r.requested_by = m.user_id and r.status = 'pending'
       and (r.owner_id = auth.uid() or r.requested_by = auth.uid())),
    (select max(a.created_at) from public.audit_logs a where a.ledger_id = p_ledger_id and a.actor_user_id = m.user_id)
  from public.ledger_members m
  where m.ledger_id = p_ledger_id and m.status = 'active' and public.is_ledger_member(p_ledger_id);
$$;
