-- D. Ledgers & membership (+ category templates they depend on, and
-- translation_overrides which can be scoped to a ledger).

create table public.category_templates (
  code varchar(30) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  description_key varchar(150) references public.translation_keys (key),
  icon varchar(50),
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

create table public.category_template_items (
  id uuid primary key default gen_random_uuid(),
  template_code varchar(30) not null references public.category_templates (code) on delete cascade,
  parent_item_id uuid references public.category_template_items (id) on delete cascade,
  slug varchar(80) not null,
  name_key varchar(150) not null references public.translation_keys (key),
  category_type varchar(20) not null default 'expense' check (category_type in ('expense', 'income', 'transfer')),
  icon varchar(50),
  color varchar(9),
  is_system boolean not null default false,
  sort_order smallint not null default 0,
  constraint category_template_items_slug_key unique (template_code, slug)
);

create table public.ledger_types (
  code varchar(20) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  description_key varchar(150) references public.translation_keys (key),
  icon varchar(50) not null,
  default_fiscal_start_month smallint not null default 1 check (default_fiscal_start_month between 1 and 12),
  default_template_code varchar(30) references public.category_templates (code),
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

create table public.ledgers (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null check (length(trim(name)) > 0),
  ledger_type_code varchar(20) not null default 'personal' references public.ledger_types (code),
  currency_code char(3) not null references public.currencies (code),
  timezone_code varchar(64) not null references public.time_zones (code),
  country_code char(2) references public.countries (code),
  locale varchar(10) not null,
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  icon varchar(50),
  color varchar(9),
  owner_user_id uuid not null references public.users (id),
  status varchar(20) not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create index idx_ledgers_owner on public.ledgers (owner_user_id);
create trigger trg_ledgers_touch before update on public.ledgers
  for each row execute function public.tg_touch_audit();

-- Ownership only moves through transfer_ledger_ownership().
create or replace function public.tg_ledgers_protect()
returns trigger
language plpgsql
as $$
begin
  if public.is_client_request() then
    new.owner_user_id := old.owner_user_id;
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;
create trigger trg_ledgers_protect before update on public.ledgers
  for each row execute function public.tg_ledgers_protect();

alter table public.user_preferences
  add constraint user_preferences_default_ledger_fkey
  foreign key (default_ledger_id) references public.ledgers (id) on delete set null;

create table public.ledger_invitations (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  email extensions.citext not null,
  role_code varchar(20) not null default 'MEMBER' references public.roles (code) check (role_code <> 'OWNER'),
  token_hash char(64) not null unique,
  status varchar(20) not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  message text,
  expires_at timestamptz not null default now() + interval '7 days',
  invited_by uuid references public.users (id) on delete set null,
  accepted_by uuid references public.users (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index ledger_invitations_one_pending on public.ledger_invitations (ledger_id, email) where status = 'pending';
create trigger trg_ledger_invitations_touch before update on public.ledger_invitations
  for each row execute function public.tg_touch();

create table public.ledger_members (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role_code varchar(20) not null default 'MEMBER' references public.roles (code),
  status varchar(20) not null default 'active' check (status in ('active', 'left', 'removed')),
  color varchar(9),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  invitation_id uuid references public.ledger_invitations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint ledger_members_unique unique (ledger_id, user_id)
);
create index idx_ledger_members_user on public.ledger_members (user_id, status);
create unique index ledger_members_one_owner on public.ledger_members (ledger_id)
  where role_code = 'OWNER' and status = 'active';
create trigger trg_ledger_members_touch before update on public.ledger_members
  for each row execute function public.tg_touch_audit();

create table public.translation_overrides (
  id uuid primary key default gen_random_uuid(),
  key varchar(150) not null references public.translation_keys (key) on delete cascade on update cascade,
  language_code varchar(10) not null references public.languages (code) on delete cascade,
  ledger_id uuid references public.ledgers (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  value text not null check (length(value) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint translation_overrides_one_scope check ((ledger_id is null) <> (user_id is null)),
  constraint translation_overrides_unique unique nulls not distinct (key, language_code, ledger_id, user_id)
);
create trigger trg_translation_overrides_touch before update on public.translation_overrides
  for each row execute function public.tg_touch_audit();

create or replace function public.tg_translation_overrides_check()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.translation_keys where key = new.key and is_user_editable) then
    raise exception 'Translation key % is not user editable', new.key using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger trg_translation_overrides_check before insert or update on public.translation_overrides
  for each row execute function public.tg_translation_overrides_check();

-- =========================================================================
-- Membership helpers used by every RLS policy. SECURITY DEFINER so policies on
-- ledger_members can call them without recursing through their own policy.
-- =========================================================================

create or replace function public.is_ledger_member(p_ledger_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.ledger_members
    where ledger_id = p_ledger_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.has_ledger_permission(p_ledger_id uuid, p_permission varchar)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.ledger_members m
    join public.role_permissions rp on rp.role_code = m.role_code
    where m.ledger_id = p_ledger_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and rp.permission_code = p_permission
  );
$$;

create or replace function public.shares_ledger_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.ledger_members me
    join public.ledger_members them on them.ledger_id = me.ledger_id
    where me.user_id = auth.uid() and me.status = 'active'
      and them.user_id = p_user_id and them.status = 'active'
  );
$$;

revoke all on function public.is_ledger_member(uuid) from public;
revoke all on function public.has_ledger_permission(uuid, varchar) from public;
revoke all on function public.shares_ledger_with(uuid) from public;
grant execute on function public.is_ledger_member(uuid) to authenticated;
grant execute on function public.has_ledger_permission(uuid, varchar) to authenticated;
grant execute on function public.shares_ledger_with(uuid) to authenticated;
