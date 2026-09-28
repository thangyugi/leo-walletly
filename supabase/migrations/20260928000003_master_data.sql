-- A. Master data: currencies, time_zones, countries, exchange_rates,
-- account_types, providers. Display names live in translations via *_key columns.

create table public.currencies (
  code char(3) primary key,
  numeric_code char(3) not null unique,
  name_key varchar(150) not null references public.translation_keys (key),
  symbol varchar(10) not null,
  decimal_places smallint not null check (decimal_places between 0 and 4),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_currencies_touch before update on public.currencies
  for each row execute function public.tg_touch();

-- time_zones <-> countries reference each other; the FK from time_zones is
-- added after countries exists.
create table public.time_zones (
  code varchar(64) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  utc_offset_minutes smallint not null,
  country_code char(2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_time_zones_touch before update on public.time_zones
  for each row execute function public.tg_touch();

create table public.countries (
  code char(2) primary key,
  code3 char(3) not null unique,
  name_key varchar(150) not null references public.translation_keys (key),
  currency_code char(3) not null references public.currencies (code),
  default_timezone_code varchar(64) references public.time_zones (code),
  default_locale varchar(10),
  phone_code varchar(8),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_countries_touch before update on public.countries
  for each row execute function public.tg_touch();

alter table public.time_zones
  add constraint time_zones_country_code_fkey foreign key (country_code) references public.countries (code);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency char(3) not null references public.currencies (code),
  quote_currency char(3) not null references public.currencies (code),
  rate numeric(20, 10) not null check (rate > 0),
  rate_date date not null,
  source varchar(30) not null default 'api' check (source in ('api', 'manual')),
  fetched_at timestamptz not null default now(),
  constraint exchange_rates_distinct check (base_currency <> quote_currency),
  constraint exchange_rates_unique unique (base_currency, quote_currency, rate_date, source)
);
create index idx_exchange_rates_lookup on public.exchange_rates (base_currency, quote_currency, rate_date desc);

create table public.account_types (
  code varchar(20) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  icon varchar(50) not null,
  is_liability boolean not null default false,
  sort_order smallint not null default 0
);

create table public.providers (
  code varchar(30) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  description_key varchar(150) references public.translation_keys (key),
  account_type_code varchar(20) references public.account_types (code),
  region varchar(10) not null default 'global' check (region in ('jp', 'vn', 'global')),
  country_code char(2) references public.countries (code),
  color varchar(9) not null,
  initials varchar(4) not null,
  logo_path text,
  parser_code varchar(30),
  supports_csv boolean not null default false,
  supports_pdf boolean not null default false,
  supports_api boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_providers_touch before update on public.providers
  for each row execute function public.tg_touch();
