-- Foundation table 14/18: feature_flags
-- docs/database/01_foundation_schema.html#feature_flags
--
-- No soft delete per the design doc (no deleted_at here).

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),

  code varchar(100) not null,
  name varchar(150) not null,
  description text,
  category varchar(50) not null,
  enabled_by_default boolean not null default false,
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint feature_flags_code_key unique (code),
  constraint feature_flags_status_check check (status in ('active', 'inactive'))
);

create index idx_feature_flags_category on public.feature_flags (category);

create trigger trg_feature_flags_audit
  before update on public.feature_flags
  for each row execute function public.tg_set_audit_on_update();

alter table public.feature_flags enable row level security;
