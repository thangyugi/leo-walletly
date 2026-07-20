-- Foundation table 15/18: system_settings
-- docs/database/01_foundation_schema.html#system_settings
--
-- No soft delete per the design doc (no deleted_at here). is_public gates whether
-- regular clients may read a row (vs. service_role-only settings).

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),

  key varchar(150) not null,
  value text,
  value_type varchar(20) not null default 'string',
  category varchar(50) not null,
  description text,
  is_public boolean not null default false,
  editable boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint system_settings_key_key unique (key),
  constraint system_settings_value_type_check
    check (value_type in ('string', 'number', 'boolean', 'json'))
);

create index idx_system_settings_category on public.system_settings (category);

create trigger trg_system_settings_audit
  before update on public.system_settings
  for each row execute function public.tg_set_audit_on_update();

alter table public.system_settings enable row level security;
