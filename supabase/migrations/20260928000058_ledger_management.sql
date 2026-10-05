-- Ledger management page ("Quản lý sổ"):
--  1. An access level on every shared category: view · write · propose · manage.
--       view    – sees the category and its transactions, cannot file transactions in it
--       write   – also files / edits their own transactions in it
--       propose – also proposes changes (budget, subcategories, keywords, rules) for the owner to approve
--       manage  – changes apply at once (the owner is told, no approval needed)
--     Existing shares keep today's behaviour (propose).
--  2. Per-member permission overrides on top of the role (granted or withheld).
--  3. RPCs for the page: save_member_access, ledger_member_summary, member_activity, my_permissions.

-- 1. Access levels ------------------------------------------------------------------------
alter table public.category_members
  add column if not exists access_level varchar(10) not null default 'propose'
  constraint category_members_access_level_check check (access_level in ('view', 'write', 'propose', 'manage'));

-- 'owner', the level of the nearest shared ancestor (or the category itself), or null.
create or replace function public.category_access_level(p_category uuid, p_user uuid default auth.uid())
returns varchar
language sql
stable
security definer
set search_path = public, extensions
as $$
  with recursive up as (
    select c.id, c.parent_id, c.owner_id, c.is_shared, 0 as depth from public.categories c where c.id = p_category
    union all
    select c.id, c.parent_id, c.owner_id, c.is_shared, up.depth + 1 from public.categories c join up on c.id = up.parent_id
  )
  select case
    when p_user is null then null
    when exists (select 1 from up where up.owner_id = p_user) then 'owner'
    else (select m.access_level from up join public.category_members m on m.category_id = up.id
          where up.is_shared and m.user_id = p_user and m.left_at is null
          order by up.depth limit 1)
  end;
$$;

create or replace function public.can_write_category(p_category uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(public.category_access_level(p_category, p_user) in ('owner', 'write', 'propose', 'manage'), false);
$$;

grant execute on function public.category_access_level(uuid, uuid), public.can_write_category(uuid, uuid) to authenticated;

-- Filing a transaction in a category needs at least "write".
drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert to authenticated
  with check (
    public.has_ledger_permission(ledger_id, 'transaction.create')
    and coalesce(created_by, auth.uid()) = auth.uid()
    and public.owns_account(account_id)
    and (transfer_account_id is null or public.owns_account(transfer_account_id))
    and (category_id is null or public.can_write_category(category_id))
  );

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update to authenticated
  using (
    public.has_ledger_permission(ledger_id, 'transaction.update')
    and (created_by = auth.uid() or paid_by_user_id = auth.uid())
  )
  with check (
    public.has_ledger_permission(ledger_id, 'transaction.update')
    and (created_by = auth.uid() or paid_by_user_id = auth.uid())
    and (category_id is null or public.can_write_category(category_id)
         or public.can_access_category(category_id, coalesce(paid_by_user_id, created_by)))
  );

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
    if not public.can_write_category(new.category_id) then
      raise exception 'CATEGORY_READ_ONLY' using errcode = '42501',
        hint = 'The category is shared with you to view only.';
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

-- Proposals need "propose"; "manage" applies them at once.
alter function public.propose_category_change(uuid, varchar, text[], text[], uuid, text)
  rename to _propose_category_change_core;
revoke all on function public._propose_category_change_core(uuid, varchar, text[], text[], uuid, text) from public, anon, authenticated;

create or replace function public.propose_category_change(
  p_category uuid, p_action varchar, p_names text[] default '{}', p_values text[] default '{}',
  p_rule uuid default null, p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_level varchar := public.category_access_level(p_category);
  v_id uuid;
begin
  if v_level in ('view', 'write') then
    raise exception 'LEVEL_NO_PROPOSE' using errcode = '42501',
      hint = 'Your access to this category does not include proposing changes.';
  end if;
  v_id := public._propose_category_change_core(p_category, p_action, p_names, p_values, p_rule, p_note);
  if v_level = 'manage' then
    if not public.apply_category_change(v_id) then
      raise exception 'CHANGE_NOT_APPLICABLE' using errcode = '22023';
    end if;
    update public.category_change_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = 'co_manager'
    where id = v_id;
    -- The owner is told what changed instead of being asked to approve it.
    update public.notifications set type_code = 'category_change_applied', action_url = '/approvals?tab=done&id=' || v_id
    where entity_type = 'category_change_request' and entity_id = v_id;
  end if;
  return v_id;
end;
$$;
grant execute on function public.propose_category_change(uuid, varchar, text[], text[], uuid, text) to authenticated;

-- 2. Permission overrides ---------------------------------------------------------------------
create table if not exists public.ledger_member_permissions (
  member_id uuid not null references public.ledger_members (id) on delete cascade,
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  permission_code varchar(50) not null references public.permissions (code),
  granted boolean not null,
  updated_by uuid references public.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (member_id, permission_code)
);
alter table public.ledger_member_permissions enable row level security;
drop policy if exists ledger_member_permissions_read on public.ledger_member_permissions;
create policy ledger_member_permissions_read on public.ledger_member_permissions for select to authenticated
  using (public.is_ledger_member(ledger_id));
grant select on public.ledger_member_permissions to authenticated;

-- Permissions a member may be given or refused one by one (the rest follow the role).
create or replace function public.overridable_permissions()
returns text[]
language sql
immutable
as $$
  select array['transaction.create', 'transaction.update', 'transaction.delete', 'category.create', 'account.create',
               'import.create', 'recurring.create', 'budget.update', 'report.read', 'report.export', 'audit.read', 'member.invite'];
$$;

create or replace function public.has_ledger_permission(p_ledger_id uuid, p_permission character varying)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.ledger_members m
    where m.ledger_id = p_ledger_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and coalesce(
        case when m.role_code <> 'OWNER' then
          (select o.granted from public.ledger_member_permissions o
           where o.member_id = m.id and o.permission_code = p_permission) end,
        exists (select 1 from public.role_permissions rp
                where rp.role_code = m.role_code and rp.permission_code = p_permission)
      )
  );
$$;

-- What the signed-in user may do in a ledger (role + overrides), for the app's menus.
create or replace function public.my_permissions(p_ledger_id uuid)
returns setof varchar
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.code from public.permissions p
  where public.has_ledger_permission(p_ledger_id, p.code);
$$;
grant execute on function public.my_permissions(uuid) to authenticated;

-- 3. Saving a member's role, permissions and shared categories in one go -----------------------
create or replace function public.save_member_access(
  p_member uuid, p_role varchar default null, p_permissions jsonb default null, p_categories jsonb default null
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  m public.ledger_members;
  c public.categories;
  v_key text;
  v_val jsonb;
  v_default boolean;
  v_item jsonb;
  v_level text;
  v_ratio numeric;
  v_changes integer := 0;
begin
  select * into m from public.ledger_members where id = p_member and status = 'active';
  if not found or not public.is_ledger_member(m.ledger_id) then
    raise exception 'MEMBER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if m.user_id = v_uid then
    raise exception 'CANNOT_EDIT_SELF' using errcode = '42501';
  end if;

  if p_role is not null and p_role <> m.role_code then
    perform public.update_member_role(p_member, p_role);
    m.role_code := p_role;
    v_changes := v_changes + 1;
  end if;

  if p_permissions is not null and p_permissions <> '{}'::jsonb then
    if not public.has_ledger_permission(m.ledger_id, 'member.update') or m.role_code = 'OWNER'
       or public.role_rank(m.role_code) >= public.my_role_rank(m.ledger_id) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
    for v_key, v_val in select * from jsonb_each(p_permissions) loop
      if not (v_key = any (public.overridable_permissions())) then
        raise exception 'PERMISSION_NOT_OVERRIDABLE' using errcode = '22023', detail = v_key;
      end if;
      v_default := exists (select 1 from public.role_permissions where role_code = m.role_code and permission_code = v_key);
      if jsonb_typeof(v_val) = 'null' or (v_val)::boolean = v_default then
        delete from public.ledger_member_permissions where member_id = m.id and permission_code = v_key;
      else
        -- Nobody hands out what they do not have themselves.
        if (v_val)::boolean and not public.has_ledger_permission(m.ledger_id, v_key) then
          raise exception 'CANNOT_GRANT' using errcode = '42501', detail = v_key;
        end if;
        insert into public.ledger_member_permissions (member_id, ledger_id, permission_code, granted)
        values (m.id, m.ledger_id, v_key, (v_val)::boolean)
        on conflict (member_id, permission_code) do update set granted = excluded.granted, updated_by = v_uid, updated_at = now();
      end if;
      v_changes := v_changes + 1;
    end loop;
  end if;
  -- After a role change, overrides that now match the role are just noise.
  delete from public.ledger_member_permissions o
  where o.member_id = m.id
    and o.granted = exists (select 1 from public.role_permissions rp where rp.role_code = m.role_code and rp.permission_code = o.permission_code);

  for v_item in select * from jsonb_array_elements(coalesce(p_categories, '[]'::jsonb)) loop
    select * into c from public.categories
    where id = (v_item->>'category_id')::uuid and ledger_id = m.ledger_id and deleted_at is null;
    if not found or c.owner_id is distinct from v_uid then
      raise exception 'CATEGORY_NOT_OWNED' using errcode = '42501';
    end if;
    v_level := nullif(v_item->>'level', '');
    v_ratio := nullif(v_item->>'share_ratio', '')::numeric;
    if v_level is null then
      delete from public.category_members where category_id = c.id and user_id = m.user_id;
      if not exists (select 1 from public.category_members where category_id = c.id and user_id <> c.owner_id and left_at is null) then
        delete from public.category_members where category_id = c.id;
        update public.categories set is_shared = false where id = c.id and is_shared;
      end if;
    else
      if v_level not in ('view', 'write', 'propose', 'manage') then
        raise exception 'BAD_LEVEL' using errcode = '22023';
      end if;
      if v_ratio is not null and (v_ratio <= 0 or v_ratio >= 1000) then
        raise exception 'BAD_SHARE_RATIO' using errcode = '22023';
      end if;
      insert into public.category_members (category_id, user_id, role)
      values (c.id, c.owner_id, 'owner')
      on conflict (category_id, user_id) do update set left_at = null;
      insert into public.category_members (category_id, user_id, role, access_level, share_ratio)
      values (c.id, m.user_id, 'member', v_level, v_ratio)
      on conflict (category_id, user_id) do update
        set access_level = excluded.access_level, share_ratio = excluded.share_ratio, left_at = null;
      update public.categories set is_shared = true where id = c.id and not is_shared;
    end if;
    v_changes := v_changes + 1;
  end loop;

  if v_changes > 0 then
    perform public.notify_users(array[m.user_id], m.ledger_id, 'ledger_access_changed', '/ledger', 'member', m.id,
      array['actor'], array[public.user_label(v_uid)]);
  end if;
  return v_changes;
end;
$$;
grant execute on function public.save_member_access(uuid, varchar, jsonb, jsonb) to authenticated;

-- 4. Numbers and activity for the page -------------------------------------------------------
-- Counts only what the caller can see themselves.
create or replace function public.ledger_member_summary(p_ledger_id uuid)
returns table (user_id uuid, tx_count bigint, pending_requests bigint, last_active_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select m.user_id,
    (select count(*) from public.transactions t
     where t.ledger_id = p_ledger_id and t.deleted_at is null and t.created_by = m.user_id
       and public.can_see_transaction(t.created_by, t.paid_by_user_id, t.category_id)),
    (select count(*) from public.category_change_requests r
     where r.ledger_id = p_ledger_id and r.requested_by = m.user_id and r.status = 'pending'
       and (r.owner_id = auth.uid() or r.requested_by = auth.uid())),
    (select max(a.created_at) from public.audit_logs a where a.ledger_id = p_ledger_id and a.actor_user_id = m.user_id)
  from public.ledger_members m
  where m.ledger_id = p_ledger_id and m.status = 'active' and public.is_ledger_member(p_ledger_id);
$$;
grant execute on function public.ledger_member_summary(uuid) to authenticated;

create or replace function public.member_activity(p_ledger_id uuid, p_user_id uuid default null, p_limit integer default 20)
returns table (id bigint, actor_user_id uuid, action varchar, entity_type varchar, entity_label varchar, created_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select a.id, a.actor_user_id, a.action, a.entity_type, a.entity_label, a.created_at
  from public.audit_logs a
  where public.is_ledger_member(p_ledger_id)
    and a.ledger_id = p_ledger_id
    and (p_user_id is null or a.actor_user_id = p_user_id)
    and (
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
    )
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
grant execute on function public.member_activity(uuid, uuid, integer) to authenticated;

-- 5. Notifications ---------------------------------------------------------------------------
insert into public.translation_keys (key, namespace, placeholders, is_user_editable) values
  ('notification.ledger_access_changed.title', 'notification', 'actor', false),
  ('notification.ledger_access_changed.body', 'notification', null, false),
  ('notification.category_change_applied.title', 'notification', 'actor,category', false),
  ('notification.category_change_applied.body', 'notification', 'what,detail', false)
on conflict (key) do nothing;
insert into public.translations (key, language_code, value) values
  ('notification.ledger_access_changed.title', 'ja', '{{actor}} さんがあなたの権限を変更しました'),
  ('notification.ledger_access_changed.title', 'vi', '{{actor}} đã cập nhật quyền của bạn trong sổ'),
  ('notification.ledger_access_changed.title', 'en', '{{actor}} updated your access to the ledger'),
  ('notification.ledger_access_changed.body', 'ja', '役割・権限・共有カテゴリを確認してください'),
  ('notification.ledger_access_changed.body', 'vi', 'Xem lại vai trò, quyền và các danh mục được chia sẻ'),
  ('notification.ledger_access_changed.body', 'en', 'Check your role, permissions and shared categories'),
  ('notification.category_change_applied.title', 'ja', '{{actor}} さんが「{{category}}」を変更しました'),
  ('notification.category_change_applied.title', 'vi', '{{actor}} đã thay đổi "{{category}}"'),
  ('notification.category_change_applied.title', 'en', '{{actor}} changed "{{category}}"'),
  ('notification.category_change_applied.body', 'ja', '{{what}}：{{detail}} · 共同管理者として直接反映'),
  ('notification.category_change_applied.body', 'vi', '{{what}}: {{detail}} · Đồng quản lý, đã áp dụng ngay'),
  ('notification.category_change_applied.body', 'en', '{{what}}: {{detail}} · Applied directly as co-manager')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();

insert into public.notification_types (code, category_code, title_key, body_key, icon, severity, default_action_path) values
  ('ledger_access_changed', 'members', 'notification.ledger_access_changed.title', 'notification.ledger_access_changed.body', 'ShieldCheck', 'info', '/ledger'),
  ('category_change_applied', 'approvals', 'notification.category_change_applied.title', 'notification.category_change_applied.body', 'CheckCircle2', 'info', '/approvals')
on conflict (code) do nothing;
