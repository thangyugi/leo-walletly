-- B. Internationalization: languages, translation_keys, translations.
-- translation_overrides needs ledgers and lives in the ledgers migration.

create table public.languages (
  code varchar(10) primary key,
  locale varchar(10) not null unique,
  name varchar(50) not null,
  native_name varchar(50) not null,
  short_label varchar(5) not null,
  text_direction varchar(3) not null default 'ltr' check (text_direction in ('ltr', 'rtl')),
  fallback_code varchar(10) references public.languages (code),
  is_active boolean not null default false,
  is_default boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index languages_one_default on public.languages (is_default) where is_default;
create trigger trg_languages_touch before update on public.languages
  for each row execute function public.tg_touch();

create table public.translation_keys (
  key varchar(150) primary key,
  namespace varchar(50) not null,
  description text,
  placeholders varchar(200),
  max_length smallint,
  is_user_editable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint translation_keys_namespace_prefix check (key like namespace || '.%')
);

create index idx_translation_keys_namespace on public.translation_keys (namespace);
create trigger trg_translation_keys_touch before update on public.translation_keys
  for each row execute function public.tg_touch();

create table public.translations (
  key varchar(150) not null references public.translation_keys (key) on delete cascade on update cascade,
  language_code varchar(10) not null references public.languages (code) on delete cascade,
  value text not null,
  status varchar(20) not null default 'approved' check (status in ('draft', 'machine', 'approved')),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (key, language_code)
);

create index idx_translations_language on public.translations (language_code);
create trigger trg_translations_touch before update on public.translations
  for each row execute function public.tg_touch();
