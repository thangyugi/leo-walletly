-- C4–C6. Roles, permissions, role_permissions. Global catalog, seeded; clients read-only.

create table public.roles (
  code varchar(20) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  description_key varchar(150) references public.translation_keys (key),
  rank smallint not null,
  is_assignable boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_roles_touch before update on public.roles
  for each row execute function public.tg_touch();

create table public.permissions (
  code varchar(50) primary key,
  resource varchar(30) not null,
  action varchar(20) not null,
  description_key varchar(150) references public.translation_keys (key),
  constraint permissions_code_format check (code = resource || '.' || action)
);

create table public.role_permissions (
  role_code varchar(20) not null references public.roles (code) on delete cascade,
  permission_code varchar(50) not null references public.permissions (code) on delete cascade,
  primary key (role_code, permission_code)
);
create index idx_role_permissions_permission on public.role_permissions (permission_code);
