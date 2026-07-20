-- Foundation table 6/18: countries (ISO 3166 master data)
-- docs/database/01_foundation_schema.html#countries

create table public.countries (
  id uuid primary key default gen_random_uuid(),

  code char(2) not null,
  code3 char(3) not null,
  numeric_code char(3),
  name varchar(100) not null,
  native_name varchar(100),
  phone_code varchar(10),
  capital varchar(100),
  continent varchar(30),
  currency_code char(3) not null references public.currencies (code),
  timezone_default varchar(100),
  locale varchar(20),
  flag_emoji varchar(10),
  flag_svg_url text,
  is_supported boolean not null default true,
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint countries_code_key unique (code),
  constraint countries_code3_key unique (code3),
  constraint countries_numeric_code_key unique (numeric_code),
  constraint countries_continent_check check (
    continent is null or continent in (
      'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'
    )
  ),
  constraint countries_status_check check (status in ('active', 'inactive'))
);

create index idx_countries_currency on public.countries (currency_code);
create index idx_countries_supported on public.countries (is_supported);
create index idx_countries_status on public.countries (status);

create trigger trg_countries_audit
  before update on public.countries
  for each row execute function public.tg_set_audit_on_update();

-- Seed Data Protection (design note): once seeded, code/code3/numeric_code must never
-- change. Only display fields (name, flag, is_supported) may be updated.

alter table public.countries enable row level security;
