-- Foundation table 1/18: users
-- docs/database/01_foundation_schema.html#users
--
-- Deliberately does NOT carry organization_id / household_id / role_id: a user can
-- belong to many households/organizations (N-N), which is resolved by `members`.

create table public.users (
  id uuid primary key default gen_random_uuid(),

  auth_user_id uuid not null references auth.users (id) on delete cascade,
  email varchar(255) not null,
  username varchar(50),
  display_name varchar(150) not null,
  first_name varchar(100),
  last_name varchar(100),
  avatar_url text,
  phone varchar(30),
  birth_date date,
  gender varchar(20),

  language_code varchar(10) not null default 'en' references public.languages (code),
  timezone_id uuid references public.time_zones (id),
  country_code char(2) references public.countries (code),
  default_currency_code char(3) not null default 'USD' references public.currencies (code),

  status varchar(20) not null default 'active',
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  two_factor_enabled boolean not null default false,
  last_login_at timestamptz,
  last_active_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint users_auth_user_id_key unique (auth_user_id),
  constraint users_email_key unique (email),
  constraint users_username_key unique (username),
  constraint users_gender_check
    check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  constraint users_status_check
    check (status in ('active', 'inactive', 'invited', 'locked', 'deleted'))
);

create index idx_users_status on public.users (status);
create index idx_users_country on public.users (country_code);
create index idx_users_last_login on public.users (last_login_at);

create trigger trg_users_audit
  before update on public.users
  for each row execute function public.tg_set_audit_on_update();

comment on table public.users is
  'Core user profile. Do not add organization_id/household_id/role_id here — those are N-N via members.';

alter table public.users enable row level security;

-- Resolves the calling JWT (auth.uid()) to the internal users.id. Used throughout
-- RLS policies on every table that scopes access via users/members.
create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid();
$$;

comment on function public.current_user_id() is
  'Maps the authenticated auth.uid() to public.users.id. Returns null if no matching profile exists yet.';
