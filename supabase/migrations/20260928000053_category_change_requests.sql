-- Shared categories: members propose, the owner approves.
--
-- Someone a category is shared with may change its budget, its sub-categories,
-- its keywords and its rules like the owner, but nothing changes until the
-- owner approves. A proposal is a request row plus one row per field (old →
-- new value, like audit_log_changes). The owner is notified (in-app + push),
-- approves or rejects; approving applies the change. Also: members may delete
-- their own transactions, a history feed per category, and web push delivery.

-- 1. Members delete their own transactions ---------------------------------------
-- (RLS still limits it to rows they entered or paid.)
insert into public.role_permissions (role_code, permission_code) values ('MEMBER', 'transaction.delete')
on conflict do nothing;

-- 2. Requests ------------------------------------------------------------------------
create table public.category_change_requests (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  -- Who decides: the category's owner when it was proposed.
  owner_id uuid not null references public.users (id) on delete cascade,
  -- The category changed (for subcategory.create: the parent).
  category_id uuid not null references public.categories (id) on delete cascade,
  rule_id uuid references public.category_rules (id) on delete cascade,
  action varchar(30) not null check (action in (
    'subcategory.create', 'category.update', 'category.delete', 'budget.set',
    'keyword.add', 'keyword.remove', 'rule.create', 'rule.toggle')),
  status varchar(12) not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'obsolete')),
  note varchar(500),
  requested_by uuid not null default auth.uid() references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note varchar(500),
  -- What approving created (the new sub-category / rule).
  result_id uuid
);
create index idx_ccr_owner on public.category_change_requests (owner_id, status, created_at desc);
create index idx_ccr_requester on public.category_change_requests (requested_by, status, created_at desc);
create index idx_ccr_category on public.category_change_requests (category_id, status);

create table public.category_change_request_fields (
  request_id uuid not null references public.category_change_requests (id) on delete cascade,
  field_name varchar(30) not null,
  old_value text,
  new_value text,
  primary key (request_id, field_name)
);

alter table public.category_change_requests enable row level security;
alter table public.category_change_request_fields enable row level security;
-- Only the two people involved see a request. Writes go through the functions below.
create policy ccr_read on public.category_change_requests for select to authenticated
  using (owner_id = auth.uid() or requested_by = auth.uid());
create policy ccr_fields_read on public.category_change_request_fields for select to authenticated
  using (exists (select 1 from public.category_change_requests r
                 where r.id = request_id and (r.owner_id = auth.uid() or r.requested_by = auth.uid())));
grant select on public.category_change_requests, public.category_change_request_fields to authenticated;

-- 3. Notification texts and types --------------------------------------------------
insert into public.translation_keys (key, namespace, placeholders, is_user_editable) values
  ('notification_category.approvals.name', 'notification_category', null, false),
  ('notification.category_change_requested.title', 'notification', 'actor,category', false),
  ('notification.category_change_requested.body', 'notification', 'what,detail', false),
  ('notification.category_change_approved.title', 'notification', 'actor', false),
  ('notification.category_change_approved.body', 'notification', 'what,detail,category', false),
  ('notification.category_change_rejected.title', 'notification', 'actor', false),
  ('notification.category_change_rejected.body', 'notification', 'what,detail,category,note', false),
  ('approvals.act.subcategory.create', 'approvals', null, false),
  ('approvals.act.category.update', 'approvals', null, false),
  ('approvals.act.category.delete', 'approvals', null, false),
  ('approvals.act.budget.set', 'approvals', null, false),
  ('approvals.act.keyword.add', 'approvals', null, false),
  ('approvals.act.keyword.remove', 'approvals', null, false),
  ('approvals.act.rule.create', 'approvals', null, false),
  ('approvals.act.rule.toggle', 'approvals', null, false),
  ('approvals.on', 'approvals', null, false),
  ('approvals.off', 'approvals', null, false),
  ('approvals.noBudget', 'approvals', null, false),
  ('approvals.obsoleteNote', 'approvals', null, false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('notification_category.approvals.name', 'ja', '承認'), ('notification_category.approvals.name', 'vi', 'Phê duyệt'), ('notification_category.approvals.name', 'en', 'Approvals'),
  ('notification.category_change_requested.title', 'ja', '{{actor}} さんが「{{category}}」の変更を提案しました'),
  ('notification.category_change_requested.title', 'vi', '{{actor}} đề xuất thay đổi ở "{{category}}"'),
  ('notification.category_change_requested.title', 'en', '{{actor}} proposed a change to "{{category}}"'),
  ('notification.category_change_requested.body', 'ja', '{{what}}：{{detail}} · 承認が必要です'),
  ('notification.category_change_requested.body', 'vi', '{{what}}: {{detail}} · Cần bạn duyệt'),
  ('notification.category_change_requested.body', 'en', '{{what}}: {{detail}} · Needs your approval'),
  ('notification.category_change_approved.title', 'ja', '{{actor}} さんが提案を承認しました'),
  ('notification.category_change_approved.title', 'vi', '{{actor}} đã duyệt đề xuất của bạn'),
  ('notification.category_change_approved.title', 'en', '{{actor}} approved your proposal'),
  ('notification.category_change_approved.body', 'ja', '{{category}} · {{what}}：{{detail}}'),
  ('notification.category_change_approved.body', 'vi', '{{category}} · {{what}}: {{detail}}'),
  ('notification.category_change_approved.body', 'en', '{{category}} · {{what}}: {{detail}}'),
  ('notification.category_change_rejected.title', 'ja', '{{actor}} さんが提案を却下しました'),
  ('notification.category_change_rejected.title', 'vi', '{{actor}} đã từ chối đề xuất của bạn'),
  ('notification.category_change_rejected.title', 'en', '{{actor}} declined your proposal'),
  ('notification.category_change_rejected.body', 'ja', '{{category}} · {{what}}：{{detail}}{{note}}'),
  ('notification.category_change_rejected.body', 'vi', '{{category}} · {{what}}: {{detail}}{{note}}'),
  ('notification.category_change_rejected.body', 'en', '{{category}} · {{what}}: {{detail}}{{note}}'),
  ('approvals.act.subcategory.create', 'ja', 'サブカテゴリを追加'), ('approvals.act.subcategory.create', 'vi', 'Thêm nhóm con'), ('approvals.act.subcategory.create', 'en', 'Add sub-category'),
  ('approvals.act.category.update', 'ja', 'サブカテゴリを編集'), ('approvals.act.category.update', 'vi', 'Sửa nhóm con'), ('approvals.act.category.update', 'en', 'Edit sub-category'),
  ('approvals.act.category.delete', 'ja', 'サブカテゴリを削除'), ('approvals.act.category.delete', 'vi', 'Xoá nhóm con'), ('approvals.act.category.delete', 'en', 'Delete sub-category'),
  ('approvals.act.budget.set', 'ja', '予算'), ('approvals.act.budget.set', 'vi', 'Ngân sách'), ('approvals.act.budget.set', 'en', 'Budget'),
  ('approvals.act.keyword.add', 'ja', 'キーワードを追加'), ('approvals.act.keyword.add', 'vi', 'Thêm từ khoá'), ('approvals.act.keyword.add', 'en', 'Add keyword'),
  ('approvals.act.keyword.remove', 'ja', 'キーワードを削除'), ('approvals.act.keyword.remove', 'vi', 'Xoá từ khoá'), ('approvals.act.keyword.remove', 'en', 'Remove keyword'),
  ('approvals.act.rule.create', 'ja', 'ルールを追加'), ('approvals.act.rule.create', 'vi', 'Thêm quy tắc'), ('approvals.act.rule.create', 'en', 'Add rule'),
  ('approvals.act.rule.toggle', 'ja', 'ルールのオン/オフ'), ('approvals.act.rule.toggle', 'vi', 'Bật/tắt quy tắc'), ('approvals.act.rule.toggle', 'en', 'Turn rule on/off'),
  ('approvals.on', 'ja', 'オン'), ('approvals.on', 'vi', 'Bật'), ('approvals.on', 'en', 'On'),
  ('approvals.off', 'ja', 'オフ'), ('approvals.off', 'vi', 'Tắt'), ('approvals.off', 'en', 'Off'),
  ('approvals.noBudget', 'ja', '予算なし'), ('approvals.noBudget', 'vi', 'Bỏ ngân sách'), ('approvals.noBudget', 'en', 'No budget'),
  ('approvals.obsoleteNote', 'ja', ' · 対象が変更・削除されたため適用できませんでした'), ('approvals.obsoleteNote', 'vi', ' · Không áp dụng được vì mục đã bị thay đổi hoặc xoá'), ('approvals.obsoleteNote', 'en', ' · Could not be applied: the item was changed or deleted')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();

insert into public.notification_categories (code, name_key, is_mandatory, sort_order) values
  ('approvals', 'notification_category.approvals.name', false, 3)
on conflict (code) do nothing;

-- Approvals are the one thing worth a push by default (the owner has to act).
insert into public.notification_defaults (category_code, channel_code, is_enabled) values
  ('approvals', 'in_app', true), ('approvals', 'email', false), ('approvals', 'push', true), ('approvals', 'sms', false)
on conflict (category_code, channel_code) do nothing;

insert into public.notification_types (code, category_code, title_key, body_key, icon, severity, default_action_path) values
  ('category_change_requested', 'approvals', 'notification.category_change_requested.title', 'notification.category_change_requested.body', 'GitPullRequestArrow', 'warning', '/approvals'),
  ('category_change_approved', 'approvals', 'notification.category_change_approved.title', 'notification.category_change_approved.body', 'CheckCircle2', 'success', '/approvals'),
  ('category_change_rejected', 'approvals', 'notification.category_change_rejected.title', 'notification.category_change_rejected.body', 'XCircle', 'danger', '/approvals')
on conflict (code) do nothing;

-- 4. Helpers -------------------------------------------------------------------------
-- A text in the user's language (their preference, else English, else the key).
create or replace function public.tr_for(p_key text, p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select t.value from public.translations t join public.user_preferences p on p.language_code = t.language_code
      where t.key = p_key and p.user_id = p_user),
    (select value from public.translations where key = p_key and language_code = 'en'),
    p_key);
$$;
revoke all on function public.tr_for(text, uuid) from public;

-- Value of one field in the (names[], values[]) pair a request was sent with.
create or replace function public.ccr_field(p_names text[], p_values text[], p_name text)
returns text language sql immutable as $$
  select v from unnest(coalesce(p_names, '{}'), coalesce(p_values, '{}')) as t(n, v) where n = p_name limit 1;
$$;

-- The category's monthly budget (0 = none).
create or replace function public.category_budget(p_category uuid)
returns numeric language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select amount from public.budgets where category_id = p_category and period_type = 'monthly'
                   and period_start is null and deleted_at is null), 0);
$$;

-- Short, readable "what changed" for notifications ("¥30,000", "コーヒー", "Cà phê").
create or replace function public.ccr_detail(p_request uuid, p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  r public.category_change_requests;
  v_new text;
  v_cur text;
begin
  select * into r from public.category_change_requests where id = p_request;
  select currency_code into v_cur from public.ledgers where id = r.ledger_id;
  case r.action
    when 'budget.set' then
      select new_value into v_new from public.category_change_request_fields where request_id = r.id and field_name = 'amount';
      return case when coalesce(v_new::numeric, 0) <= 0 then public.tr_for('approvals.noBudget', p_user)
                  else trim(to_char(v_new::numeric, 'FM999,999,999,990.##')) || ' ' || coalesce(v_cur, '') end;
    when 'rule.toggle' then
      select new_value into v_new from public.category_change_request_fields where request_id = r.id and field_name = 'is_active';
      return (select pattern from public.category_rules where id = r.rule_id) || ' → '
             || public.tr_for(case when v_new = 'true' then 'approvals.on' else 'approvals.off' end, p_user);
    when 'category.delete' then
      return public.category_label(r.category_id, p_user);
    else
      select coalesce(max(new_value) filter (where field_name in ('name', 'pattern')),
                      max(old_value) filter (where field_name in ('name', 'pattern')),
                      public.category_label(r.category_id, p_user))
        into v_new from public.category_change_request_fields where request_id = r.id;
      return v_new;
  end case;
end;
$$;
revoke all on function public.ccr_detail(uuid, uuid) from public;

-- A category's name as p_user sees it (their language; seeded names follow it).
create or replace function public.category_label(p_category uuid, p_user uuid)
returns text language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select ct.name from public.category_translations ct join public.user_preferences p on p.language_code = ct.language_code
      where ct.category_id = c.id and p.user_id = p_user),
    case when c.name_key is not null then nullif(public.tr_for(c.name_key, p_user), c.name_key) end,
    c.name)
  from public.categories c where c.id = p_category;
$$;
revoke all on function public.category_label(uuid, uuid) from public;

create or replace function public.user_label(p_user uuid)
returns text language sql stable security definer set search_path = public, extensions as $$
  select coalesce(nullif(display_name, ''), split_part(email, '@', 1), '—') from public.users where id = p_user;
$$;
revoke all on function public.user_label(uuid) from public;

-- 5. Propose -------------------------------------------------------------------------
-- p_names / p_values: the proposed values, per action:
--   subcategory.create  name, icon, color, budget, slug (a suggestion)
--   category.update     any of name, icon, color, description
--   category.delete     (none)
--   budget.set          amount (0 = remove the budget)
--   keyword.add/remove  pattern
--   rule.create         match_field, match_type, pattern
--   rule.toggle         is_active ('true' / 'false'), with p_rule
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
  v_uid uuid := auth.uid();
  c public.categories;
  v_rule public.category_rules;
  v_perm varchar;
  v_is_top boolean;
  v_id uuid;
  v_val text;
  v_cur numeric;
  v_f text;
  v_fields text[] := '{}';
  v_old text[] := '{}';
  v_new text[] := '{}';
begin
  if v_uid is null then
    raise exception 'NOT_SIGNED_IN' using errcode = '42501';
  end if;
  select * into c from public.categories where id = p_category and deleted_at is null;
  if not found then
    raise exception 'CATEGORY_NOT_FOUND' using errcode = 'P0002';
  end if;
  if c.owner_id = v_uid then
    raise exception 'OWNER_EDITS_DIRECTLY' using errcode = '22023';
  end if;
  if not public.can_access_category(c.id) then
    raise exception 'NO_ACCESS' using errcode = '42501';
  end if;
  v_perm := case p_action
    when 'subcategory.create' then 'category.create'
    when 'rule.create' then 'category.create'
    when 'keyword.add' then 'category.create'
    when 'category.delete' then 'category.delete'
    when 'keyword.remove' then 'category.delete'
    when 'budget.set' then 'budget.update'
    else 'category.update' end;
  if not public.has_ledger_permission(c.ledger_id, v_perm) then
    raise exception 'NO_PERMISSION' using errcode = '42501';
  end if;
  -- The category that was shared with you (no visible parent) keeps its name,
  -- look and existence; only what is inside it can be proposed.
  v_is_top := c.parent_id is null or not public.can_access_category(c.parent_id);

  case p_action
    when 'subcategory.create' then
      v_val := nullif(trim(public.ccr_field(p_names, p_values, 'name')), '');
      if v_val is null or length(v_val) > 100 then
        raise exception 'NAME_REQUIRED' using errcode = '22023';
      end if;
      v_fields := array['name']; v_old := array[null]; v_new := array[v_val];
      foreach v_f in array array['icon', 'color', 'slug'] loop
        v_val := nullif(trim(public.ccr_field(p_names, p_values, v_f)), '');
        if v_val is not null then
          v_fields := v_fields || v_f; v_old := v_old || null::text; v_new := v_new || left(v_val, 80);
        end if;
      end loop;
      v_val := public.ccr_field(p_names, p_values, 'budget');
      if coalesce(v_val, '') <> '' and v_val::numeric > 0 then
        v_fields := v_fields || 'budget'::text; v_old := v_old || null::text; v_new := v_new || (v_val::numeric)::text;
      end if;

    when 'category.update' then
      if v_is_top then
        raise exception 'SHARED_ROOT_LOCKED' using errcode = '42501';
      end if;
      foreach v_f in array array['name', 'icon', 'color', 'description'] loop
        v_val := public.ccr_field(p_names, p_values, v_f);
        continue when v_val is null;
        v_val := nullif(trim(v_val), '');
        if v_f = 'name' and v_val is null then
          raise exception 'NAME_REQUIRED' using errcode = '22023';
        end if;
        if v_val is distinct from (case v_f when 'name' then c.name when 'icon' then c.icon when 'color' then c.color else c.description end) then
          v_fields := v_fields || v_f;
          v_old := v_old || (case v_f when 'name' then c.name when 'icon' then c.icon when 'color' then c.color else c.description end)::text;
          v_new := v_new || v_val;
        end if;
      end loop;

    when 'category.delete' then
      if v_is_top then
        raise exception 'SHARED_ROOT_LOCKED' using errcode = '42501';
      end if;
      if c.is_system then
        raise exception 'SYSTEM_CATEGORY' using errcode = '42501';
      end if;
      v_fields := array['name']; v_old := array[c.name]; v_new := array[null];

    when 'budget.set' then
      v_val := coalesce(nullif(public.ccr_field(p_names, p_values, 'amount'), ''), '0');
      if v_val::numeric < 0 then
        raise exception 'INVALID_AMOUNT' using errcode = '22023';
      end if;
      v_cur := public.category_budget(c.id);
      if v_val::numeric <> v_cur then
        v_fields := array['amount']; v_old := array[v_cur::text]; v_new := array[(v_val::numeric)::text];
      end if;

    when 'keyword.add', 'keyword.remove' then
      v_val := lower(trim(coalesce(public.ccr_field(p_names, p_values, 'pattern'), '')));
      if v_val = '' or length(v_val) > 200 then
        raise exception 'PATTERN_REQUIRED' using errcode = '22023';
      end if;
      if p_action = 'keyword.add' then
        if exists (select 1 from public.category_rules where ledger_id = c.ledger_id and match_field = 'description'
                   and match_type = 'contains' and pattern = v_val and deleted_at is null) then
          raise exception 'KEYWORD_TAKEN' using errcode = '23505';
        end if;
        v_fields := array['pattern']; v_old := array[null]; v_new := array[v_val];
      else
        if not exists (select 1 from public.category_rules where category_id = c.id and match_field = 'description'
                       and match_type = 'contains' and pattern = v_val and deleted_at is null) then
          raise exception 'KEYWORD_NOT_FOUND' using errcode = 'P0002';
        end if;
        v_fields := array['pattern']; v_old := array[v_val]; v_new := array[null];
      end if;

    when 'rule.create' then
      v_val := trim(coalesce(public.ccr_field(p_names, p_values, 'pattern'), ''));
      if v_val = '' or length(v_val) > 200 then
        raise exception 'PATTERN_REQUIRED' using errcode = '22023';
      end if;
      if coalesce(public.ccr_field(p_names, p_values, 'match_field'), 'description') not in ('description', 'merchant')
         or coalesce(public.ccr_field(p_names, p_values, 'match_type'), 'contains') not in ('contains', 'equals', 'starts_with', 'regex') then
        raise exception 'INVALID_RULE' using errcode = '22023';
      end if;
      if exists (select 1 from public.category_rules where ledger_id = c.ledger_id and deleted_at is null and pattern = v_val
                 and match_field = coalesce(public.ccr_field(p_names, p_values, 'match_field'), 'description')
                 and match_type = coalesce(public.ccr_field(p_names, p_values, 'match_type'), 'contains')) then
        raise exception 'KEYWORD_TAKEN' using errcode = '23505';
      end if;
      v_fields := array['match_field', 'match_type', 'pattern'];
      v_old := array[null, null, null];
      v_new := array[coalesce(public.ccr_field(p_names, p_values, 'match_field'), 'description'),
                     coalesce(public.ccr_field(p_names, p_values, 'match_type'), 'contains'), v_val];

    when 'rule.toggle' then
      select * into v_rule from public.category_rules where id = p_rule and category_id = c.id and deleted_at is null;
      if not found then
        raise exception 'RULE_NOT_FOUND' using errcode = 'P0002';
      end if;
      v_val := case when public.ccr_field(p_names, p_values, 'is_active') = 'true' then 'true' else 'false' end;
      if v_val <> v_rule.is_active::text then
        v_fields := array['is_active']; v_old := array[v_rule.is_active::text]; v_new := array[v_val];
      end if;

    else
      raise exception 'UNKNOWN_ACTION' using errcode = '22023';
  end case;

  if coalesce(array_length(v_fields, 1), 0) = 0 then
    raise exception 'NO_CHANGE' using errcode = '22023';
  end if;

  -- One open proposal per thing: a newer budget / edit / switch replaces yours.
  if p_action in ('budget.set', 'category.update', 'rule.toggle', 'category.delete') then
    update public.category_change_requests
    set status = 'cancelled', reviewed_at = now(), review_note = 'superseded'
    where requested_by = v_uid and status = 'pending' and action = p_action and category_id = c.id
      and rule_id is not distinct from p_rule;
    update public.notifications n set read_at = coalesce(n.read_at, now())
    from public.category_change_requests r
    where n.entity_type = 'category_change_request' and n.entity_id = r.id and r.review_note = 'superseded'
      and r.requested_by = v_uid and r.category_id = c.id and n.read_at is null;
  elsif exists (
    select 1 from public.category_change_requests r join public.category_change_request_fields f on f.request_id = r.id
    where r.requested_by = v_uid and r.status = 'pending' and r.action = p_action and r.category_id = c.id
      and f.field_name in ('pattern', 'name') and f.new_value is not distinct from v_new[array_position(v_fields, f.field_name)]
  ) then
    raise exception 'ALREADY_PROPOSED' using errcode = '23505';
  end if;

  insert into public.category_change_requests (ledger_id, owner_id, category_id, rule_id, action, note, requested_by)
  values (c.ledger_id, c.owner_id, c.id, p_rule, p_action, nullif(left(trim(coalesce(p_note, '')), 500), ''), v_uid)
  returning id into v_id;
  insert into public.category_change_request_fields (request_id, field_name, old_value, new_value)
  select v_id, f, o, n from unnest(v_fields, v_old, v_new) as t(f, o, n);

  perform public.notify_users(array[c.owner_id], c.ledger_id, 'category_change_requested',
    '/approvals?id=' || v_id, 'category_change_request', v_id,
    array['actor', 'category', 'what', 'detail'],
    array[public.user_label(v_uid), public.category_label(c.id, c.owner_id), public.tr_for('approvals.act.' || p_action, c.owner_id), public.ccr_detail(v_id, c.owner_id)]);
  return v_id;
end;
$$;

-- 6. Apply (approval) ------------------------------------------------------------------
-- Returns false when the change no longer fits (target gone, keyword taken…).
create or replace function public.apply_category_change(p_request uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.category_change_requests;
  c public.categories;
  v_names text[];
  v_values text[];
  v_id uuid;
  v_slug text;
  v_base text;
  v_i integer := 1;
  v_amount numeric;
  v_n integer;
begin
  select * into r from public.category_change_requests where id = p_request;
  select array_agg(field_name), array_agg(new_value) into v_names, v_values
  from public.category_change_request_fields where request_id = r.id;
  select * into c from public.categories where id = r.category_id and deleted_at is null;
  if not found or c.owner_id <> r.owner_id then
    return false;
  end if;

  case r.action
    when 'subcategory.create' then
      v_base := public.slugify(coalesce(public.ccr_field(v_names, v_values, 'slug'), public.ccr_field(v_names, v_values, 'name')));
      v_slug := v_base;
      while exists (select 1 from public.categories where ledger_id = c.ledger_id and owner_id = c.owner_id
                    and slug = v_slug and deleted_at is null) loop
        v_i := v_i + 1;
        v_slug := v_base || '-' || v_i;
      end loop;
      insert into public.categories (ledger_id, parent_id, slug, name, category_type, kind_code, icon, color, sort_order, owner_id, created_by)
      values (c.ledger_id, c.id, v_slug, public.ccr_field(v_names, v_values, 'name'), c.category_type, c.kind_code,
              coalesce(public.ccr_field(v_names, v_values, 'icon'), c.icon), coalesce(public.ccr_field(v_names, v_values, 'color'), c.color),
              coalesce((select max(sort_order) from public.categories where parent_id = c.id), 0) + 1, c.owner_id, c.owner_id)
      returning id into v_id;
      v_amount := coalesce(nullif(public.ccr_field(v_names, v_values, 'budget'), '')::numeric, 0);
      if v_amount > 0 then
        insert into public.budgets (ledger_id, category_id, amount, created_by) values (c.ledger_id, v_id, v_amount, c.owner_id);
      end if;
      update public.category_change_requests set result_id = v_id where id = r.id;

    when 'category.update' then
      update public.categories set
        name = coalesce(nullif(public.ccr_field(v_names, v_values, 'name'), ''), name),
        name_key = case when 'name' = any (v_names) then null else name_key end,
        icon = case when 'icon' = any (v_names) then public.ccr_field(v_names, v_values, 'icon') else icon end,
        color = case when 'color' = any (v_names) then public.ccr_field(v_names, v_values, 'color') else color end,
        description = case when 'description' = any (v_names) then public.ccr_field(v_names, v_values, 'description') else description end
      where id = c.id;

    when 'category.delete' then
      update public.categories set deleted_at = now(), is_archived = true where id = c.id;

    when 'budget.set' then
      v_amount := coalesce(nullif(public.ccr_field(v_names, v_values, 'amount'), '')::numeric, 0);
      if v_amount <= 0 then
        update public.budgets set deleted_at = now()
        where category_id = c.id and period_type = 'monthly' and period_start is null and deleted_at is null;
      else
        -- One monthly row per category, kept (and revived) rather than re-inserted.
        update public.budgets set amount = v_amount, deleted_at = null
        where ledger_id = c.ledger_id and category_id = c.id and period_type = 'monthly' and period_start is null;
        if not found then
          insert into public.budgets (ledger_id, category_id, amount, created_by) values (c.ledger_id, c.id, v_amount, c.owner_id);
        end if;
      end if;

    when 'keyword.add', 'rule.create' then
      if exists (select 1 from public.category_rules where ledger_id = c.ledger_id and deleted_at is null
                 and match_field = coalesce(public.ccr_field(v_names, v_values, 'match_field'), 'description')
                 and match_type = coalesce(public.ccr_field(v_names, v_values, 'match_type'), 'contains')
                 and pattern = public.ccr_field(v_names, v_values, 'pattern')) then
        return false;
      end if;
      insert into public.category_rules (ledger_id, category_id, match_field, match_type, pattern, created_by)
      values (c.ledger_id, c.id, coalesce(public.ccr_field(v_names, v_values, 'match_field'), 'description'),
              coalesce(public.ccr_field(v_names, v_values, 'match_type'), 'contains'), public.ccr_field(v_names, v_values, 'pattern'), c.owner_id)
      returning id into v_id;
      update public.category_change_requests set result_id = v_id where id = r.id;

    when 'keyword.remove' then
      update public.category_rules set deleted_at = now()
      where category_id = c.id and match_field = 'description' and match_type = 'contains' and deleted_at is null
        and pattern = (select old_value from public.category_change_request_fields where request_id = r.id and field_name = 'pattern');
      get diagnostics v_n = row_count;
      if v_n = 0 then return false; end if;

    when 'rule.toggle' then
      update public.category_rules set is_active = (public.ccr_field(v_names, v_values, 'is_active') = 'true')
      where id = r.rule_id and deleted_at is null;
      get diagnostics v_n = row_count;
      if v_n = 0 then return false; end if;
  end case;
  return true;
end;
$$;
revoke all on function public.apply_category_change(uuid) from public;

-- 7. Review / cancel -----------------------------------------------------------------------
create or replace function public.review_category_change(p_request uuid, p_approve boolean, p_note text default null)
returns varchar
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  r public.category_change_requests;
  v_status varchar;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
  v_cat text;
begin
  select * into r from public.category_change_requests where id = p_request for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if r.owner_id <> v_uid then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED' using errcode = '22023';
  end if;

  if not p_approve then
    v_status := 'rejected';
  elsif public.apply_category_change(r.id) then
    v_status := 'approved';
  else
    v_status := 'obsolete';
  end if;
  update public.category_change_requests
  set status = v_status, reviewed_by = v_uid, reviewed_at = now(), review_note = v_note
  where id = r.id;
  -- The owner's "please review" notification is done with.
  update public.notifications set read_at = coalesce(read_at, now())
  where entity_type = 'category_change_request' and entity_id = r.id and user_id = v_uid;

  v_cat := public.category_label(r.category_id, r.requested_by);
  perform public.notify_users(array[r.requested_by], r.ledger_id,
    case when v_status = 'approved' then 'category_change_approved' else 'category_change_rejected' end,
    '/approvals?tab=sent&id=' || r.id, 'category_change_request', r.id,
    array['actor', 'category', 'what', 'detail', 'note'],
    array[public.user_label(v_uid), coalesce(v_cat, '—'), public.tr_for('approvals.act.' || r.action, r.requested_by),
          coalesce(public.ccr_detail(r.id, r.requested_by), '—'),
          case when v_status = 'obsolete' then public.tr_for('approvals.obsoleteNote', r.requested_by)
               when v_note is not null then ' · “' || v_note || '”' else '' end]);
  return v_status;
end;
$$;

create or replace function public.cancel_category_change(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.category_change_requests;
begin
  select * into r from public.category_change_requests where id = p_request for update;
  if not found or r.requested_by <> auth.uid() then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if r.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED' using errcode = '22023';
  end if;
  update public.category_change_requests set status = 'cancelled', reviewed_at = now() where id = r.id;
  -- Nothing left for the owner to decide.
  update public.notifications set read_at = coalesce(read_at, now())
  where entity_type = 'category_change_request' and entity_id = r.id;
end;
$$;

grant execute on function public.propose_category_change(uuid, varchar, text[], text[], uuid, text) to authenticated;
grant execute on function public.review_category_change(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_category_change(uuid) to authenticated;

-- 8. History of a category ------------------------------------------------------------------
-- Everything that happened to a category and its sub-categories, for anyone who
-- can see it: edits of the categories, their budgets and rules, the
-- transactions in them (visible ones only) and the proposals about them.
create or replace function public.category_history(p_category uuid, p_limit integer default 60, p_before timestamptz default null)
returns table (
  at timestamptz, actor_id uuid, actor_name text, source text, action text, entity_type text, entity_id uuid,
  entity_label text, category_id uuid, request_status text, reviewer_name text,
  field_names text[], old_values text[], new_values text[]
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null or not public.can_access_category(p_category) then
    raise exception 'NO_ACCESS' using errcode = '42501';
  end if;
  select owner_id into v_owner from public.categories where id = p_category;
  return query
  with recursive branch as (
    select id from public.categories where id = p_category
    union all
    select c.id from public.categories c join branch b on c.parent_id = b.id
  ),
  logs as (
    -- Categories themselves.
    select a.id, a.created_at, a.actor_user_id, a.action, a.entity_type, a.entity_id, a.entity_label, a.entity_id as cat
    from public.audit_logs a
    where a.entity_type = 'category' and a.entity_id in (select id from branch)
    union all
    -- Their budgets and rules (keywords).
    select a.id, a.created_at, a.actor_user_id, a.action, a.entity_type, a.entity_id,
           coalesce(a.entity_label, (select name from public.categories where id = coalesce(bu.category_id, ru.category_id))),
           coalesce(bu.category_id, ru.category_id)
    from public.audit_logs a
    left join public.budgets bu on a.entity_type = 'budget' and bu.id = a.entity_id
    left join public.category_rules ru on a.entity_type = 'category_rule' and ru.id = a.entity_id
    where a.entity_type in ('budget', 'category_rule')
      and coalesce(bu.category_id, ru.category_id) in (select id from branch)
    union all
    -- Transactions that are (or were) in it and that the viewer may see.
    select a.id, a.created_at, a.actor_user_id, a.action, a.entity_type, a.entity_id, a.entity_label, t.category_id
    from public.audit_logs a
    join public.transactions t on t.id = a.entity_id
    where a.entity_type = 'transaction'
      and (t.category_id in (select id from branch)
           or exists (select 1 from public.audit_log_changes ch where ch.audit_log_id = a.id and ch.field_name = 'category_id'
                      and ch.old_value::uuid in (select id from branch)))
      and public.can_see_transaction(t.created_by, t.paid_by_user_id, t.category_id)
  )
  select * from (
    select l.created_at, l.actor_user_id, public.user_label(l.actor_user_id), 'audit'::text, l.action::text, l.entity_type::text, l.entity_id,
           l.entity_label::text, l.cat, null::text, null::text,
           coalesce(array_agg(ch.field_name::text order by ch.field_name) filter (where ch.field_name is not null), '{}'),
           coalesce(array_agg(ch.old_value order by ch.field_name) filter (where ch.field_name is not null), '{}'),
           coalesce(array_agg(ch.new_value order by ch.field_name) filter (where ch.field_name is not null), '{}')
    from logs l
    left join public.audit_log_changes ch on ch.audit_log_id = l.id
      and ch.field_name not in ('version', 'updated_by', 'base_amount', 'is_archived', 'hit_count', 'last_matched_at', 'fx_rate', 'search_vector')
      -- A new row: only what names it.
      and (l.action <> 'create' or ch.field_name in ('name', 'amount', 'pattern', 'description', 'transaction_type', 'match_type', 'match_field'))
    -- Rows written by approving a proposal are told by the proposal itself.
    where not exists (select 1 from public.category_change_requests r
                      where r.status = 'approved' and r.reviewed_by = l.actor_user_id and r.reviewed_at = l.created_at
                        and r.category_id in (select id from branch))
    group by l.id, l.created_at, l.actor_user_id, l.action, l.entity_type, l.entity_id, l.entity_label, l.cat
    union all
    -- Proposals: the two people involved see every state, others the approved ones.
    select coalesce(r.reviewed_at, r.created_at), r.requested_by, public.user_label(r.requested_by), 'request', r.action::text,
           'category_change_request', r.id, public.category_label(r.category_id, v_uid), r.category_id,
           r.status::text, public.user_label(r.reviewed_by),
           coalesce(array_agg(f.field_name::text order by f.field_name) filter (where f.field_name is not null), '{}'),
           coalesce(array_agg(f.old_value order by f.field_name) filter (where f.field_name is not null), '{}'),
           coalesce(array_agg(f.new_value order by f.field_name) filter (where f.field_name is not null), '{}')
    from public.category_change_requests r
    left join public.category_change_request_fields f on f.request_id = r.id
    where r.category_id in (select id from branch) and r.status <> 'cancelled'
      and (r.status = 'approved' or v_uid in (r.owner_id, r.requested_by))
    group by r.id
  ) h(at, actor_id, actor_name, source, action, entity_type, entity_id, entity_label, category_id, request_status, reviewer_name, field_names, old_values, new_values)
  where p_before is null or h.at < p_before
  order by h.at desc
  limit greatest(1, least(p_limit, 200));
end;
$$;
grant execute on function public.category_history(uuid, integer, timestamptz) to authenticated;

-- 9. Web push --------------------------------------------------------------------------------
-- Devices that asked for push; the browser's subscription keys.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent varchar(300),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index idx_push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

update public.notification_channels set is_available = true where code = 'push';

-- Where the app's push sender lives and the shared secret it checks. Not
-- reachable through the API (own schema, no grants); set once per environment:
--   insert into private.app_settings values ('push_endpoint', 'https://<app>/api/push/send'), ('push_secret', '<random>')
--   on conflict (key) do update set value = excluded.value;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_settings (
  key text primary key,
  value text not null
);
create extension if not exists pg_net;

-- A notification's title and body in the recipient's language.
create or replace function public.render_notification(p_notification uuid)
returns table (title text, body text, url text)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  n public.notifications;
  ty public.notification_types;
  v_title text;
  v_body text;
  p record;
begin
  select * into n from public.notifications where id = p_notification;
  select * into ty from public.notification_types where code = n.type_code;
  v_title := public.tr_for(ty.title_key, n.user_id);
  v_body := public.tr_for(ty.body_key, n.user_id);
  for p in select name, value from public.notification_params where notification_id = n.id loop
    v_title := replace(v_title, '{{' || p.name || '}}', p.value);
    v_body := replace(v_body, '{{' || p.name || '}}', p.value);
  end loop;
  return query select regexp_replace(v_title, '\{\{\w+\}\}', '', 'g'), regexp_replace(v_body, '\{\{\w+\}\}', '', 'g'),
                      coalesce(n.action_url, ty.default_action_path, '/notifications')::text;
end;
$$;
revoke all on function public.render_notification(uuid) from public;

-- At commit (the params are written after the row), hand each new notification
-- to the push sender if the user wants push for it and has a device. Never
-- blocks or fails the transaction that created the notification.
create or replace function public.tg_notifications_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
  v_category varchar;
  v_subs jsonb;
  v_msg record;
begin
  select value into v_url from private.app_settings where key = 'push_endpoint';
  select value into v_secret from private.app_settings where key = 'push_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;
  select category_code into v_category from public.notification_types where code = new.type_code;
  if not coalesce(
       (select is_enabled from public.user_notification_settings where user_id = new.user_id and category_code = v_category and channel_code = 'push'),
       (select is_enabled from public.notification_defaults where category_code = v_category and channel_code = 'push'),
       false) then
    return null;
  end if;
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', jsonb_build_object('p256dh', p256dh, 'auth', auth)))
    into v_subs from public.push_subscriptions where user_id = new.user_id;
  if v_subs is null then
    return null;
  end if;
  select * into v_msg from public.render_notification(new.id);
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('id', new.id, 'title', v_msg.title, 'body', v_msg.body, 'url', v_msg.url,
                               'tag', coalesce(new.entity_id::text, new.id::text), 'subscriptions', v_subs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Push-Secret', v_secret),
    timeout_milliseconds := 5000);
  update public.push_subscriptions set last_used_at = now() where user_id = new.user_id;
  return null;
exception when others then
  raise warning 'push not sent: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists trg_notifications_push on public.notifications;
create constraint trigger trg_notifications_push
  after insert on public.notifications
  deferrable initially deferred
  for each row execute function public.tg_notifications_push();

-- The sender reports devices the push service no longer knows (410 Gone).
create or replace function public.push_forget(p_secret text, p_endpoints text[])
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_n integer;
begin
  if p_secret is null or p_secret is distinct from (select value from private.app_settings where key = 'push_secret') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
grant execute on function public.push_forget(text, text[]) to anon, authenticated;

-- 10. Live updates ------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.category_change_requests;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
