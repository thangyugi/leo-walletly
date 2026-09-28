-- C1–C3. users (id = auth.users.id), user_preferences, user_sessions.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null unique,
  display_name varchar(100) not null,
  first_name varchar(100),
  last_name varchar(100),
  avatar_path text,
  phone varchar(30),
  birth_date date,
  gender varchar(20) check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  country_code char(2) references public.countries (code),
  status varchar(20) not null default 'active' check (status in ('active', 'disabled')),
  onboarded_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  version integer not null default 1
);

alter table public.users
  add constraint users_created_by_fkey foreign key (created_by) references public.users (id) on delete set null,
  add constraint users_updated_by_fkey foreign key (updated_by) references public.users (id) on delete set null;

create trigger trg_users_touch before update on public.users
  for each row execute function public.tg_touch_audit();

-- Clients may only edit profile fields; email/status/onboarded_at are owned by
-- auth triggers and SECURITY DEFINER RPCs.
create or replace function public.tg_users_protect()
returns trigger
language plpgsql
as $$
begin
  if public.is_client_request() then
    new.email := old.email;
    new.status := old.status;
    new.onboarded_at := old.onboarded_at;
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;
create trigger trg_users_protect before update on public.users
  for each row execute function public.tg_users_protect();

alter table public.translations
  add constraint translations_updated_by_fkey foreign key (updated_by) references public.users (id) on delete set null;

create table public.user_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  language_code varchar(10) not null default 'ja' references public.languages (code),
  locale varchar(10) not null default 'ja-JP',
  timezone_code varchar(64) not null default 'Asia/Tokyo' references public.time_zones (code),
  default_currency_code char(3) not null default 'JPY' references public.currencies (code),
  default_ledger_id uuid,
  date_format varchar(20) not null default 'yyyy-MM-dd',
  week_starts_on smallint not null default 0 check (week_starts_on in (0, 1)),
  theme varchar(10) not null default 'system' check (theme in ('light', 'dark', 'system')),
  dashboard_density varchar(15) not null default 'comfortable' check (dashboard_density in ('comfortable', 'compact')),
  hide_balances boolean not null default false,
  start_page varchar(50) not null default '/',
  updated_at timestamptz not null default now()
);
create trigger trg_user_preferences_touch before update on public.user_preferences
  for each row execute function public.tg_touch();

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  auth_session_id uuid unique,
  device_name varchar(100),
  device_type varchar(10) not null default 'desktop' check (device_type in ('desktop', 'mobile', 'tablet')),
  browser varchar(50),
  os varchar(50),
  ip_address inet,
  city varchar(100),
  country_code char(2) references public.countries (code),
  risk_level varchar(10) not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  is_trusted boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index idx_user_sessions_user on public.user_sessions (user_id, last_active_at desc);

-- Signup: mirror auth.users into users + user_preferences. Language comes from
-- signup metadata (the language picked on the login screen) when valid.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_lang varchar(10) := new.raw_user_meta_data ->> 'language_code';
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  if v_lang is null or not exists (select 1 from public.languages where code = v_lang and is_active) then
    v_lang := coalesce((select code from public.languages where is_default), 'ja');
  end if;

  insert into public.user_preferences (user_id, language_code, locale)
  values (new.id, v_lang, coalesce((select locale from public.languages where code = v_lang), 'ja-JP'))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_changed();
