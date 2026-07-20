-- Foundation table 12/18: time_zones (IANA time zone master data)
-- docs/database/01_foundation_schema.html#time_zones

create table public.time_zones (
  id uuid primary key default gen_random_uuid(),

  code varchar(100) not null,
  name varchar(150) not null,
  utc_offset_minutes smallint not null,
  supports_dst boolean not null default false,
  country_code char(2) references public.countries (code),
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint time_zones_code_key unique (code),
  constraint time_zones_status_check check (status in ('active', 'inactive'))
);

create index idx_time_zones_country on public.time_zones (country_code);
create index idx_time_zones_status on public.time_zones (status);

create trigger trg_time_zones_audit
  before update on public.time_zones
  for each row execute function public.tg_set_audit_on_update();

alter table public.time_zones enable row level security;
