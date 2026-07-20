-- Foundation table 17/18: organizations
-- docs/database/01_foundation_schema.html#organizations

create table public.organizations (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants (id),
  code varchar(50) not null,
  name varchar(200) not null,
  legal_name varchar(300),
  organization_type varchar(30) not null,
  registration_number varchar(100),
  tax_number varchar(100),
  email varchar(255),
  phone varchar(30),
  website text,
  country_code char(2) references public.countries (code),
  currency_code char(3) not null references public.currencies (code),
  timezone_id uuid not null references public.time_zones (id),
  fiscal_calendar_id uuid not null references public.fiscal_calendars (id),
  owner_user_id uuid not null references public.users (id),
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  -- Code is unique per tenant, not globally (not explicit in the design doc; inferred
  -- from standard multi-tenant practice — flagged in FOUNDATION_CHECKLIST.md).
  constraint organizations_tenant_code_key unique (tenant_id, code),
  constraint organizations_type_check
    check (organization_type in ('company', 'freelancer', 'nonprofit', 'team')),
  constraint organizations_status_check check (status in ('active', 'suspended', 'deleted'))
);

create index idx_organizations_tenant on public.organizations (tenant_id);
create index idx_organizations_owner on public.organizations (owner_user_id);
create index idx_organizations_status on public.organizations (status);

create trigger trg_organizations_audit
  before update on public.organizations
  for each row execute function public.tg_set_audit_on_update();

alter table public.organizations enable row level security;
