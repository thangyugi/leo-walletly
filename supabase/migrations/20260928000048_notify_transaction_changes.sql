-- Edits and deletions of a transaction are announced to everyone who can see
-- it (its creator, its payer and — for a shared category — the people it is
-- shared with), except the person who made the change. One statement = one
-- notification per person: deleting 30 rows at once says "deleted 30".

-- Texts ------------------------------------------------------------------------
insert into public.translation_keys (key, namespace, placeholders, is_user_editable) values
  ('notification.transaction_updated.title', 'notification', 'actor', false),
  ('notification.transaction_updated.body', 'notification', 'actor,description,amount', false),
  ('notification.transactions_updated.title', 'notification', 'actor,count', false),
  ('notification.transactions_updated.body', 'notification', 'actor,count', false),
  ('notification.transaction_deleted.title', 'notification', 'actor', false),
  ('notification.transaction_deleted.body', 'notification', 'actor,description,amount', false),
  ('notification.transactions_deleted.title', 'notification', 'actor,count', false),
  ('notification.transactions_deleted.body', 'notification', 'actor,count', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('notification.transaction_updated.title', 'ja', '{{actor}} さんが取引を編集しました'),
  ('notification.transaction_updated.title', 'vi', '{{actor}} đã sửa một giao dịch'),
  ('notification.transaction_updated.title', 'en', '{{actor}} edited a transaction'),
  ('notification.transaction_updated.body', 'ja', '「{{description}}」 {{amount}}'),
  ('notification.transaction_updated.body', 'vi', '"{{description}}" · {{amount}}'),
  ('notification.transaction_updated.body', 'en', '"{{description}}" · {{amount}}'),
  ('notification.transactions_updated.title', 'ja', '{{actor}} さんが {{count}} 件の取引を編集しました'),
  ('notification.transactions_updated.title', 'vi', '{{actor}} đã sửa {{count}} giao dịch'),
  ('notification.transactions_updated.title', 'en', '{{actor}} edited {{count}} transactions'),
  ('notification.transactions_updated.body', 'ja', '取引一覧で変更内容を確認できます'),
  ('notification.transactions_updated.body', 'vi', 'Xem thay đổi trong lịch sử giao dịch'),
  ('notification.transactions_updated.body', 'en', 'See the changes in the transaction history'),
  ('notification.transaction_deleted.title', 'ja', '{{actor}} さんが取引を削除しました'),
  ('notification.transaction_deleted.title', 'vi', '{{actor}} đã xoá một giao dịch'),
  ('notification.transaction_deleted.title', 'en', '{{actor}} deleted a transaction'),
  ('notification.transaction_deleted.body', 'ja', '「{{description}}」 {{amount}}'),
  ('notification.transaction_deleted.body', 'vi', '"{{description}}" · {{amount}}'),
  ('notification.transaction_deleted.body', 'en', '"{{description}}" · {{amount}}'),
  ('notification.transactions_deleted.title', 'ja', '{{actor}} さんが {{count}} 件の取引を削除しました'),
  ('notification.transactions_deleted.title', 'vi', '{{actor}} đã xoá {{count}} giao dịch'),
  ('notification.transactions_deleted.title', 'en', '{{actor}} deleted {{count}} transactions'),
  ('notification.transactions_deleted.body', 'ja', '削除された取引は一覧に表示されません'),
  ('notification.transactions_deleted.body', 'vi', 'Các giao dịch đã xoá không còn trong danh sách'),
  ('notification.transactions_deleted.body', 'en', 'Deleted transactions no longer appear in the list')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();

insert into public.notification_types (code, category_code, title_key, body_key, icon, severity, default_action_path) values
  ('transaction_updated', 'transactions', 'notification.transaction_updated.title', 'notification.transaction_updated.body', 'Pencil', 'info', '/transactions'),
  ('transactions_updated', 'transactions', 'notification.transactions_updated.title', 'notification.transactions_updated.body', 'Pencil', 'info', '/transactions'),
  ('transaction_deleted', 'transactions', 'notification.transaction_deleted.title', 'notification.transaction_deleted.body', 'Trash2', 'warning', '/transactions'),
  ('transactions_deleted', 'transactions', 'notification.transactions_deleted.title', 'notification.transactions_deleted.body', 'Trash2', 'warning', '/transactions')
on conflict (code) do nothing;

-- Trigger ----------------------------------------------------------------------
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
              n.amount, n.transaction_date, n.description, n.category_id, n.account_id, n.transaction_type, n.paid_by_user_id, n.notes
            ) is distinct from (
              o.amount, o.transaction_date, o.description, o.category_id, o.account_id, o.transaction_type, o.paid_by_user_id, o.notes))
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

drop trigger if exists trg_transactions_notify_changes on public.transactions;
create trigger trg_transactions_notify_changes
  after update on public.transactions
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.tg_transactions_notify_changes();
