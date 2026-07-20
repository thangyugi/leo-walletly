-- Foundation table 18/18: households
-- docs/database/01_foundation_schema.html#households
--
-- Net-new concept: this entity does not exist anywhere in the current app.

create table public.households (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants (id),
  code varchar(50) not null,
  name varchar(200) not null,
  owner_user_id uuid not null references public.users (id),
  country_code char(2) references public.countries (code),
  currency_code char(3) not null references public.currencies (code),
  timezone_id uuid not null references public.time_zones (id),
  fiscal_calendar_id uuid not null references public.fiscal_calendars (id),
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint households_tenant_code_key unique (tenant_id, code),
  constraint households_status_check check (status in ('active', 'suspended', 'deleted'))
);

create index idx_households_tenant on public.households (tenant_id);
create index idx_households_owner on public.households (owner_user_id);
create index idx_households_status on public.households (status);

create trigger trg_households_audit
  before update on public.households
  for each row execute function public.tg_set_audit_on_update();

alter table public.households enable row level security;
