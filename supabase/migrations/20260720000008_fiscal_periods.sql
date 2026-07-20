-- Foundation table 11/18: fiscal_periods
-- docs/database/01_foundation_schema.html#fiscal_periods
--
-- NOTE: the Foundation design doc does not give this table a tenant/organization
-- scope column — periods are generated per fiscal_calendar template, not per org.
-- Flagged in docs/database/FOUNDATION_CHECKLIST.md to reconcile against
-- 03_accounting_core_schema.html before opening this up to client writes.

create table public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),

  fiscal_calendar_id uuid not null references public.fiscal_calendars (id),
  fiscal_year integer not null,
  period_number smallint not null,
  period_code varchar(20) not null,
  period_name varchar(50) not null,
  start_date date not null,
  end_date date not null,
  period_type varchar(20) not null default 'normal',
  status varchar(20) not null default 'open',
  closed_at timestamptz,
  closed_by uuid references public.users (id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint fiscal_periods_unique_period unique (fiscal_calendar_id, fiscal_year, period_number),
  constraint fiscal_periods_period_type_check check (period_type in ('normal', 'adjustment')),
  constraint fiscal_periods_status_check check (status in ('open', 'closed', 'locked')),
  constraint fiscal_periods_dates_check check (end_date >= start_date)
);

create index idx_fiscal_periods_calendar on public.fiscal_periods (fiscal_calendar_id);
create index idx_fiscal_periods_year on public.fiscal_periods (fiscal_year);
create index idx_fiscal_periods_status on public.fiscal_periods (status);

create trigger trg_fiscal_periods_audit
  before update on public.fiscal_periods
  for each row execute function public.tg_set_audit_on_update();

comment on table public.fiscal_periods is
  'Once status=locked, no Journal Entries may be created/edited/deleted for that period (enforced at application/accounting-core layer, not here).';

alter table public.fiscal_periods enable row level security;
