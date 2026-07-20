-- Foundation table 5/18: role_permissions
-- docs/database/01_foundation_schema.html#role_permissions
--
-- N-N mapping between roles and permissions. Supports allow/deny so exceptions
-- (e.g. Admin -> allow delete, but deny export) don't require schema changes.

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),

  role_id uuid not null references public.roles (id),
  permission_id uuid not null references public.permissions (id),
  effect varchar(10) not null default 'allow',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  deleted_by uuid references public.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint role_permissions_unique unique (role_id, permission_id),
  constraint role_permissions_effect_check check (effect in ('allow', 'deny'))
);

create index idx_role_permissions_role on public.role_permissions (role_id);
create index idx_role_permissions_permission on public.role_permissions (permission_id);

create trigger trg_role_permissions_audit
  before update on public.role_permissions
  for each row execute function public.tg_set_audit_on_update();

comment on table public.role_permissions is
  'Do not denormalize role_name/permission_name/resource/action here — join instead (3NF).';

alter table public.role_permissions enable row level security;
