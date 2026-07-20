-- Foundation table 4/18: permissions
-- docs/database/01_foundation_schema.html#permissions
--
-- Smallest unit in the system. Modeled as resource:action:scope, e.g.
-- transaction:create:household. Never hardcode "transaction_create" strings in app
-- code — always check the (resource, action, scope) triple.

create table public.permissions (
  id uuid primary key default gen_random_uuid(),

  code varchar(100) not null,
  resource varchar(50) not null,
  action varchar(30) not null,
  scope varchar(30) not null default 'own',
  name varchar(150) not null,
  description text,
  module varchar(50) not null,
  is_system boolean not null default true,
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint permissions_code_key unique (code),
  constraint permissions_resource_action_scope_key unique (resource, action, scope),
  constraint permissions_scope_check check (scope in ('own', 'household', 'organization', 'all')),
  constraint permissions_status_check check (status in ('active', 'inactive'))
);

create index idx_permissions_resource on public.permissions (resource);
create index idx_permissions_action on public.permissions (action);
create index idx_permissions_scope on public.permissions (scope);
create index idx_permissions_module on public.permissions (module);

create trigger trg_permissions_audit
  before update on public.permissions
  for each row execute function public.tg_set_audit_on_update();

alter table public.permissions enable row level security;
