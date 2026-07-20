-- Foundation table 3/18: roles
-- docs/database/01_foundation_schema.html#roles
--
-- Roles are a global RBAC catalog (no tenant/organization scoping column in the
-- design doc) — a set of Permissions. Users never hold permissions directly.
-- Flow: User -> Member -> Role -> Role Permissions -> Permissions

create table public.roles (
  id uuid primary key default gen_random_uuid(),

  code varchar(50) not null,
  name varchar(100) not null,
  description text,
  scope varchar(30) not null default 'household',
  is_system boolean not null default true,
  is_default boolean not null default false,
  priority smallint not null default 100,
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint roles_code_key unique (code),
  constraint roles_scope_check check (scope in ('household', 'organization', 'system')),
  constraint roles_status_check check (status in ('active', 'inactive'))
);

create index idx_roles_scope on public.roles (scope);
create index idx_roles_status on public.roles (status);
create index idx_roles_priority on public.roles (priority);

create trigger trg_roles_audit
  before update on public.roles
  for each row execute function public.tg_set_audit_on_update();

comment on table public.roles is
  'Never store permissions as json/array/text on this table (anti-pattern called out in the design doc) — always join through role_permissions.';

alter table public.roles enable row level security;
