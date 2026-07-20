-- Foundation table 8/18: currencies (ISO 4217 master data)
-- docs/database/01_foundation_schema.html#currencies

create table public.currencies (
  id uuid primary key default gen_random_uuid(),

  code char(3) not null,
  numeric_code char(3) not null,
  name varchar(100) not null,
  symbol varchar(10) not null,
  decimal_places smallint not null,
  minor_unit varchar(20),
  rounding_mode varchar(20) not null default 'HALF_UP',
  format_pattern varchar(50),
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint currencies_code_key unique (code),
  constraint currencies_numeric_code_key unique (numeric_code),
  constraint currencies_rounding_mode_check
    check (rounding_mode in ('HALF_UP', 'HALF_EVEN', 'DOWN', 'UP', 'FLOOR', 'CEILING')),
  constraint currencies_decimal_places_check check (decimal_places between 0 and 8)
);

create index idx_currencies_active on public.currencies (is_active);

create trigger trg_currencies_audit
  before update on public.currencies
  for each row execute function public.tg_set_audit_on_update();

comment on table public.currencies is
  'ISO 4217 master data. decimal_places must always be read dynamically, never hardcoded in application code.';

alter table public.currencies enable row level security;
