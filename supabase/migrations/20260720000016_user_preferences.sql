-- Foundation table 13/18: user_preferences
-- docs/database/01_foundation_schema.html#user_preferences
--
-- Keeps display/personal settings out of `users`. 1:1 with users. No soft delete
-- per the design doc (deliberately no deleted_at here).

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.users (id),
  language_code varchar(10) not null references public.languages (code),
  currency_code char(3) not null references public.currencies (code),
  timezone_id uuid not null references public.time_zones (id),

  date_format varchar(30) not null default 'YYYY-MM-DD',
  time_format varchar(10) not null default '24h',
  week_starts_on smallint not null default 1,
  fiscal_year_start_month smallint not null default 1,
  theme varchar(20) not null default 'system',
  accent_color varchar(20),
  number_format varchar(30) not null default '1,234.56',
  decimal_separator varchar(2) not null default '.',
  thousand_separator varchar(2) not null default ',',
  dashboard_layout varchar(30) not null default 'default',
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  marketing_notifications boolean not null default false,
  auto_categorization boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,

  constraint user_preferences_user_id_key unique (user_id),
  constraint user_preferences_time_format_check check (time_format in ('12h', '24h')),
  constraint user_preferences_week_starts_on_check check (week_starts_on in (0, 1)),
  constraint user_preferences_fiscal_month_check
    check (fiscal_year_start_month between 1 and 12),
  constraint user_preferences_theme_check check (theme in ('light', 'dark', 'system'))
);

create trigger trg_user_preferences_audit
  before update on public.user_preferences
  for each row execute function public.tg_set_audit_on_update();

alter table public.user_preferences enable row level security;
