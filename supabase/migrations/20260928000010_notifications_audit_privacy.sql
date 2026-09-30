-- G. Notifications + audit log, H. privacy exports + API tokens.

create table public.notification_categories (
  code varchar(30) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  description_key varchar(150) references public.translation_keys (key),
  is_mandatory boolean not null default false,
  sort_order smallint not null default 0
);

create table public.notification_channels (
  code varchar(20) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  icon varchar(50) not null,
  is_available boolean not null default true,
  sort_order smallint not null default 0
);

-- Default on/off for each category x channel when the user has no row yet.
create table public.notification_defaults (
  category_code varchar(30) not null references public.notification_categories (code) on delete cascade,
  channel_code varchar(20) not null references public.notification_channels (code) on delete cascade,
  is_enabled boolean not null,
  primary key (category_code, channel_code)
);

create table public.notification_types (
  code varchar(40) primary key,
  category_code varchar(30) not null references public.notification_categories (code),
  title_key varchar(150) not null references public.translation_keys (key),
  body_key varchar(150) not null references public.translation_keys (key),
  icon varchar(50) not null,
  severity varchar(10) not null default 'info' check (severity in ('info', 'success', 'warning', 'danger')),
  default_action_path varchar(200),
  is_active boolean not null default true
);

create table public.user_notification_settings (
  user_id uuid not null references public.users (id) on delete cascade,
  category_code varchar(30) not null references public.notification_categories (code) on delete cascade,
  channel_code varchar(20) not null references public.notification_channels (code) on delete cascade,
  is_enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, category_code, channel_code)
);
create trigger trg_user_notification_settings_touch before update on public.user_notification_settings
  for each row execute function public.tg_touch();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ledger_id uuid references public.ledgers (id) on delete cascade,
  type_code varchar(40) not null references public.notification_types (code),
  action_url text,
  entity_type varchar(30),
  entity_id uuid,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index idx_notifications_user on public.notifications (user_id, read_at, created_at desc);

-- Clients may only mark notifications read/archived.
create or replace function public.tg_notifications_protect()
returns trigger
language plpgsql
as $$
begin
  if public.is_client_request() then
    if (new.user_id, new.ledger_id, new.type_code, new.action_url, new.entity_type, new.entity_id, new.created_at)
       is distinct from
       (old.user_id, old.ledger_id, old.type_code, old.action_url, old.entity_type, old.entity_id, old.created_at) then
      raise exception 'Only read_at / archived_at can be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_notifications_protect before update on public.notifications
  for each row execute function public.tg_notifications_protect();

create table public.notification_params (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  name varchar(50) not null,
  value text not null,
  primary key (notification_id, name)
);

-- Creates one in-app notification per recipient, honouring each user's
-- in_app setting (or the default). params: alternating name/value pairs.
create or replace function public.notify_users(
  p_user_ids uuid[],
  p_ledger_id uuid,
  p_type_code varchar,
  p_action_url text,
  p_entity_type varchar,
  p_entity_id uuid,
  p_param_names text[],
  p_param_values text[]
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_category varchar(30);
  v_user uuid;
  v_id uuid;
  v_count integer := 0;
begin
  select category_code into v_category from public.notification_types where code = p_type_code and is_active;
  if v_category is null then
    return 0;
  end if;

  foreach v_user in array coalesce(p_user_ids, '{}') loop
    if coalesce(
      (select is_enabled from public.user_notification_settings
        where user_id = v_user and category_code = v_category and channel_code = 'in_app'),
      (select is_enabled from public.notification_defaults
        where category_code = v_category and channel_code = 'in_app'),
      true
    ) or exists (select 1 from public.notification_categories where code = v_category and is_mandatory) then
      insert into public.notifications (user_id, ledger_id, type_code, action_url, entity_type, entity_id)
      values (v_user, p_ledger_id, p_type_code, p_action_url, p_entity_type, p_entity_id)
      returning id into v_id;

      insert into public.notification_params (notification_id, name, value)
      select v_id, n, v
      from unnest(coalesce(p_param_names, '{}'), coalesce(p_param_values, '{}')) as t(n, v)
      where n is not null and v is not null;

      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.notify_users(uuid[], uuid, varchar, text, varchar, uuid, text[], text[]) from public;

-- =========================================================================
-- Audit log
-- =========================================================================

create table public.audit_logs (
  id bigint generated always as identity primary key,
  ledger_id uuid references public.ledgers (id) on delete set null,
  actor_user_id uuid references public.users (id) on delete set null,
  action varchar(30) not null,
  entity_type varchar(30) not null,
  entity_id uuid,
  entity_label varchar(200),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_actor on public.audit_logs (actor_user_id, created_at desc);
create index idx_audit_logs_ledger on public.audit_logs (ledger_id, created_at desc);

create table public.audit_log_changes (
  audit_log_id bigint not null references public.audit_logs (id) on delete cascade,
  field_name varchar(50) not null,
  old_value text,
  new_value text,
  primary key (audit_log_id, field_name)
);

-- Generic row-change auditor. Diffs OLD/NEW in memory (jsonb is only used as a
-- transient value here, never stored) and writes one audit_log_changes row per
-- changed column. Bookkeeping columns are skipped.
create or replace function public.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  v_row jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_action varchar(30);
  v_log_id bigint;
  v_ledger uuid;
  v_key text;
  v_skip text[] := array['created_at', 'updated_at', 'updated_by', 'version', 'created_by', 'base_amount'];
begin
  v_action := case tg_op when 'INSERT' then 'create' when 'DELETE' then 'delete' else 'update' end;
  if tg_op = 'UPDATE' and (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null then
    v_action := 'delete';
  end if;
  if tg_op = 'UPDATE' and v_old - v_skip = v_new - v_skip then
    return null;
  end if;

  v_ledger := case when tg_table_name = 'ledgers' then (v_row ->> 'id')::uuid else (v_row ->> 'ledger_id')::uuid end;
  -- Rows removed together with their ledger (cascade / account deletion) keep
  -- their log entry but lose the ledger link.
  if v_ledger is not null and not exists (select 1 from public.ledgers where id = v_ledger) then
    v_ledger := null;
  end if;

  insert into public.audit_logs (ledger_id, actor_user_id, action, entity_type, entity_id, entity_label)
  values (
    v_ledger,
    auth.uid(),
    v_action,
    tg_argv[0],
    (v_row ->> 'id')::uuid,
    left(coalesce(v_row ->> 'name', v_row ->> 'description', v_row ->> 'pattern'), 200)
  )
  returning id into v_log_id;

  for v_key in select jsonb_object_keys(v_old || v_new) loop
    continue when v_key = any (v_skip);
    if (v_old -> v_key) is distinct from (v_new -> v_key) then
      insert into public.audit_log_changes (audit_log_id, field_name, old_value, new_value)
      values (v_log_id, left(v_key, 50), v_old ->> v_key, v_new ->> v_key);
    end if;
  end loop;
  return null;
end;
$$;

create trigger trg_audit_ledgers after insert or update or delete on public.ledgers
  for each row execute function public.tg_audit('ledger');
create trigger trg_audit_ledger_members after insert or update or delete on public.ledger_members
  for each row execute function public.tg_audit('member');
create trigger trg_audit_financial_accounts after insert or update or delete on public.financial_accounts
  for each row execute function public.tg_audit('account');
create trigger trg_audit_categories after insert or update or delete on public.categories
  for each row execute function public.tg_audit('category');
create trigger trg_audit_category_rules after insert or update or delete on public.category_rules
  for each row execute function public.tg_audit('category_rule');
create trigger trg_audit_budgets after insert or update or delete on public.budgets
  for each row execute function public.tg_audit('budget');
create trigger trg_audit_transactions after insert or update or delete on public.transactions
  for each row execute function public.tg_audit('transaction');
create trigger trg_audit_recurring_rules after insert or update or delete on public.recurring_rules
  for each row execute function public.tg_audit('recurring');
create trigger trg_audit_settlements after insert or update or delete on public.settlements
  for each row execute function public.tg_audit('settlement');

-- =========================================================================
-- Privacy & developer tokens (UI planned: /settings/privacy, /settings/developer)
-- =========================================================================

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ledger_id uuid references public.ledgers (id) on delete cascade,
  request_type varchar(10) not null check (request_type in ('export', 'delete')),
  file_format varchar(10) check (file_format in ('csv', 'xlsx')),
  status varchar(20) not null default 'pending' check (status in ('pending', 'processing', 'ready', 'completed', 'failed', 'cancelled')),
  file_path text,
  expires_at timestamptz,
  error_message text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_data_requests_user on public.data_requests (user_id, requested_at desc);

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  name varchar(100) not null,
  token_prefix varchar(8) not null,
  token_hash char(64) not null unique,
  access_level varchar(10) not null default 'read' check (access_level in ('read', 'write')),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_api_tokens_user on public.api_tokens (user_id);
