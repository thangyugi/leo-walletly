-- Foundation table 10/18: fiscal_calendars (fiscal year templates)
-- docs/database/01_foundation_schema.html#fiscal_calendars
--
-- Shared reference templates (e.g. "Calendar Year", "Japan FY Apr-Mar"). Actual
-- per-year periods live in fiscal_periods.

create table public.fiscal_calendars (
  id uuid primary key default gen_random_uuid(),

  code varchar(50) not null,
  name varchar(100) not null,
  description text,
  start_month smallint not null,
  start_day smallint not null default 1,
  months_in_year smallint not null default 12,
  calendar_type varchar(20) not null default 'monthly',
  is_default boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint fiscal_calendars_code_key unique (code),
  constraint fiscal_calendars_start_month_check check (start_month between 1 and 12),
  constraint fiscal_calendars_start_day_check check (start_day between 1 and 31),
  constraint fiscal_calendars_calendar_type_check
    check (calendar_type in ('monthly', '4-4-5', 'custom'))
);

create index idx_fiscal_calendars_active on public.fiscal_calendars (is_active);

create trigger trg_fiscal_calendars_audit
  before update on public.fiscal_calendars
  for each row execute function public.tg_set_audit_on_update();

alter table public.fiscal_calendars enable row level security;
