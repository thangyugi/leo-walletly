-- Foundation table 16/18: tenants (multi-tenant SaaS root)
-- docs/database/01_foundation_schema.html#tenants

create table public.tenants (
  id uuid primary key default gen_random_uuid(),

  code varchar(50) not null,
  name varchar(200) not null,
  display_name varchar(200),
  owner_user_id uuid not null references public.users (id),
  default_language_code varchar(10) not null references public.languages (code),
  default_currency_code char(3) not null references public.currencies (code),
  default_timezone_id uuid not null references public.time_zones (id),
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint tenants_code_key unique (code),
  constraint tenants_status_check check (status in ('active', 'suspended', 'deleted'))
);

create index idx_tenants_owner on public.tenants (owner_user_id);
create index idx_tenants_status on public.tenants (status);

create trigger trg_tenants_audit
  before update on public.tenants
  for each row execute function public.tg_set_audit_on_update();

alter table public.tenants enable row level security;
