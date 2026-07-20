-- Foundation table 7/18: languages (ISO 639-1 master data)
-- docs/database/01_foundation_schema.html#languages

create table public.languages (
  id uuid primary key default gen_random_uuid(),

  code varchar(10) not null,
  locale varchar(20) not null,
  name varchar(100) not null,
  native_name varchar(100) not null,
  text_direction varchar(3) not null default 'ltr',
  is_supported boolean not null default true,
  is_default boolean not null default false,
  status varchar(20) not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint languages_code_key unique (code),
  constraint languages_locale_key unique (locale),
  constraint languages_text_direction_check check (text_direction in ('ltr', 'rtl')),
  constraint languages_status_check check (status in ('active', 'inactive'))
);

create index idx_languages_supported on public.languages (is_supported);

-- Business rule: exactly one language may be the system default.
create unique index languages_only_one_default on public.languages (is_default) where is_default = true;

create trigger trg_languages_audit
  before update on public.languages
  for each row execute function public.tg_set_audit_on_update();

alter table public.languages enable row level security;
