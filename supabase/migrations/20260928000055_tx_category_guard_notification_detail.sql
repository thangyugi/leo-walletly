-- 1. Editing a transaction whose category the editor can't open.
--
-- A row can sit in a category its *payer* can use but its editor can't (Leo 2
-- entered a purchase Leo Thang paid for, and Leo Thang's rule filed it in one
-- of his own categories). The update policy checked the category against the
-- editor, so every later edit of that row failed with "new row violates
-- row-level security policy". Now: keeping the category is fine when the
-- editor or the payer can use it; moving a row to a category is checked
-- against the editor (trigger below, with a clear error); and a category
-- neither of them can use any more is let go (the row becomes uncategorized).
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'transaction.update') and (created_by = auth.uid() or paid_by_user_id = auth.uid()))
  with check (public.has_ledger_permission(ledger_id, 'transaction.update') and (created_by = auth.uid() or paid_by_user_id = auth.uid())
              and (category_id is null or public.can_access_category(category_id)
                   or public.can_access_category(category_id, coalesce(paid_by_user_id, created_by))));

-- Not security definer: it must see who is asking (is_client_request).
create or replace function public.tg_transactions_category_guard()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  -- Server-side work (rules, imports, sharing changes) decides for itself.
  if not public.is_client_request() or new.category_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' or new.category_id is distinct from old.category_id then
    if not public.can_access_category(new.category_id) then
      raise exception 'CATEGORY_NOT_ACCESSIBLE' using errcode = '42501',
        hint = 'The category belongs to someone else and is not shared with you.';
    end if;
  elsif not public.can_access_category(new.category_id)
        and not public.can_access_category(new.category_id, coalesce(new.paid_by_user_id, new.created_by)) then
    new.category_id := null;
    new.categorized_by := null;
    new.category_rule_id := null;
    new.needs_review := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_transactions_category_guard on public.transactions;
create trigger trg_transactions_category_guard before insert or update on public.transactions
  for each row execute function public.tg_transactions_category_guard();

-- 2. Every change worth telling: also shop, time, status, transfer account, currency.
create or replace function public.tg_transactions_notify_changes()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_name text;
  r record;
begin
  -- Imports, schedules and other server work have no person to name.
  if v_actor is null then
    return null;
  end if;
  select coalesce(nullif(display_name, ''), split_part(email, '@', 1)) into v_name from public.users where id = v_actor;

  for r in
    with changed as (
      select n.*, (o.deleted_at is null and n.deleted_at is not null) as is_delete
      from new_rows n join old_rows o on o.id = n.id
      where (o.deleted_at is null and n.deleted_at is not null)
         or (n.deleted_at is null and (
              n.amount, n.transaction_date, n.description, n.category_id, n.account_id, n.transaction_type, n.paid_by_user_id, n.notes,
              n.merchant_name, n.transaction_time, n.status, n.transfer_account_id, n.currency_code
            ) is distinct from (
              o.amount, o.transaction_date, o.description, o.category_id, o.account_id, o.transaction_type, o.paid_by_user_id, o.notes,
              o.merchant_name, o.transaction_time, o.status, o.transfer_account_id, o.currency_code))
    ),
    audience as (
      select c.id, c.ledger_id, c.is_delete, c.description, c.amount, c.currency_code, u.uid
      from changed c
      cross join lateral unnest(
        array[c.created_by, c.paid_by_user_id] ||
        case when c.category_id is not null
              and public.can_access_category(c.category_id, coalesce(c.paid_by_user_id, c.created_by))
             then public.category_audience(c.category_id) else '{}'::uuid[] end
      ) as u(uid)
      where u.uid is not null and u.uid <> v_actor
        and exists (select 1 from public.ledger_members m where m.ledger_id = c.ledger_id and m.user_id = u.uid and m.status = 'active')
    )
    select uid, ledger_id, is_delete, count(distinct id) as n,
           (array_agg(id order by id))[1] as one_id,
           (array_agg(description order by id))[1] as one_desc,
           (array_agg(trim(to_char(amount, 'FM999,999,999,990.##')) || ' ' || currency_code order by id))[1] as one_amount
    from audience
    group by uid, ledger_id, is_delete
  loop
    if r.n = 1 then
      perform public.notify_users(array[r.uid], r.ledger_id,
        case when r.is_delete then 'transaction_deleted' else 'transaction_updated' end,
        case when r.is_delete then '/transactions' else '/transactions?tx=' || r.one_id end,
        'transaction', r.one_id,
        array['actor', 'description', 'amount'], array[coalesce(v_name, '—'), coalesce(r.one_desc, '—'), r.one_amount]);
    else
      perform public.notify_users(array[r.uid], r.ledger_id,
        case when r.is_delete then 'transactions_deleted' else 'transactions_updated' end,
        '/transactions', 'transaction', null,
        array['actor', 'count'], array[coalesce(v_name, '—'), r.n::text]);
    end if;
  end loop;
  return null;
end;
$$;


-- 3. What a notification is about, in detail, for its recipient: for
--    transaction notifications the rows it covers (as they are now, deleted
--    or not) and each field's old -> new value, read from the audit log of
--    the same database transaction (same timestamp). Only rows the recipient
--    may see are returned.
create or replace function public.notification_detail(p_notification uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  n public.notifications;
  v_tx jsonb;
  v_actor uuid;
begin
  select * into n from public.notifications where id = p_notification and user_id = auth.uid();
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if n.type_code like 'transaction%' then
    select jsonb_agg(x order by x ->> 'transaction_date' desc), min(a_actor::text)::uuid into v_tx, v_actor
    from (
      select a.actor_user_id as a_actor, jsonb_build_object(
        'id', t.id,
        'description', t.description,
        'amount', t.amount,
        'currency_code', t.currency_code,
        'transaction_type', t.transaction_type,
        'transaction_date', t.transaction_date,
        'category_id', t.category_id,
        'category_name', case when t.category_id is not null then public.category_label(t.category_id, auth.uid()) end,
        'account_id', t.account_id,
        'paid_by_user_id', t.paid_by_user_id,
        'created_by', t.created_by,
        'deleted', t.deleted_at is not null,
        'action', a.action,
        'changes', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'field', ch.field_name, 'old', ch.old_value, 'new', ch.new_value,
                   'old_label', case when ch.field_name = 'category_id' and ch.old_value is not null then public.category_label(ch.old_value::uuid, auth.uid()) end,
                   'new_label', case when ch.field_name = 'category_id' and ch.new_value is not null then public.category_label(ch.new_value::uuid, auth.uid()) end)
                 order by ch.field_name)
          from public.audit_log_changes ch
          where ch.audit_log_id = a.id
            and ch.field_name in ('amount', 'transaction_date', 'transaction_time', 'description', 'merchant_name', 'category_id',
                                  'account_id', 'transfer_account_id', 'transaction_type', 'paid_by_user_id', 'notes', 'status', 'currency_code')
        ), '[]'::jsonb)
      ) as x
      from public.audit_logs a
      join public.transactions t on t.id = a.entity_id
      where a.entity_type = 'transaction'
        and a.created_at = n.created_at
        and a.ledger_id is not distinct from n.ledger_id
        and (n.entity_id is null or a.entity_id = n.entity_id)
        and public.can_see_transaction(t.created_by, t.paid_by_user_id, t.category_id)
      limit 200
    ) s;
  end if;

  return jsonb_build_object(
    'id', n.id,
    'type_code', n.type_code,
    'created_at', n.created_at,
    'entity_type', n.entity_type,
    'entity_id', n.entity_id,
    'actor_id', v_actor,
    'actor_name', case when v_actor is not null then public.user_label(v_actor) end,
    'transactions', coalesce(v_tx, '[]'::jsonb)
  );
end;
$$;
grant execute on function public.notification_detail(uuid) to authenticated;
