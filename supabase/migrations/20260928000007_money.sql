-- E1–E10. Accounts, categories (+ translations/members/accounts/rules), budgets, tags.

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  name varchar(100) not null check (length(trim(name)) > 0),
  account_type_code varchar(20) not null references public.account_types (code),
  provider_code varchar(30) references public.providers (code),
  institution_name varchar(100),
  account_number_last4 varchar(4) check (account_number_last4 ~ '^[0-9]{1,4}$'),
  currency_code char(3) not null references public.currencies (code),
  opening_balance numeric(20, 4) not null default 0,
  opening_date date not null default current_date,
  credit_limit numeric(20, 4) check (credit_limit is null or credit_limit >= 0),
  color varchar(9),
  icon varchar(50),
  include_in_net_worth boolean not null default true,
  is_archived boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create index idx_financial_accounts_ledger on public.financial_accounts (ledger_id) where deleted_at is null;
create trigger trg_financial_accounts_touch before update on public.financial_accounts
  for each row execute function public.tg_touch_audit();

-- Organisational kind shown on category cards (Trung tâm chi phí, Dự án…). Lookup so new kinds need no schema change.
create table public.category_kinds (
  code varchar(30) primary key,
  name_key varchar(150) not null references public.translation_keys (key),
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  parent_id uuid references public.categories (id) on delete set null,
  slug varchar(80) not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name varchar(100) not null check (length(trim(name)) > 0),
  name_key varchar(150) references public.translation_keys (key),
  description text,
  category_type varchar(20) not null default 'expense' check (category_type in ('expense', 'income', 'transfer')),
  kind_code varchar(30) not null default 'cost_center' references public.category_kinds (code),
  icon varchar(50),
  color varchar(9),
  sort_order smallint not null default 0,
  is_system boolean not null default false,
  is_shared boolean not null default false,
  is_archived boolean not null default false,
  archived_at timestamptz,
  template_item_id uuid references public.category_template_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create unique index categories_ledger_slug on public.categories (ledger_id, slug) where deleted_at is null;
create index idx_categories_parent on public.categories (parent_id);
create trigger trg_categories_touch before update on public.categories
  for each row execute function public.tg_touch_audit();

-- Parent must be in the same ledger, max depth 3, no cycles; archived_at follows is_archived.
create or replace function public.tg_categories_check()
returns trigger
language plpgsql
as $$
declare
  v_depth int := 1;
  v_cursor uuid := new.parent_id;
  v_parent_ledger uuid;
begin
  if new.parent_id is not null then
    select ledger_id into v_parent_ledger from public.categories where id = new.parent_id;
    if v_parent_ledger is distinct from new.ledger_id then
      raise exception 'Parent category must belong to the same ledger' using errcode = '23514';
    end if;
    while v_cursor is not null loop
      if v_cursor = new.id then
        raise exception 'Category hierarchy cannot contain a cycle' using errcode = '23514';
      end if;
      v_depth := v_depth + 1;
      if v_depth > 3 then
        raise exception 'Category hierarchy is limited to 3 levels' using errcode = '23514';
      end if;
      select parent_id into v_cursor from public.categories where id = v_cursor;
    end loop;
  end if;

  if new.is_archived and new.archived_at is null then
    new.archived_at := now();
  elsif not new.is_archived then
    new.archived_at := null;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_system and public.is_client_request() then
      new.is_system := true;
      new.category_type := old.category_type;
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_categories_check before insert or update on public.categories
  for each row execute function public.tg_categories_check();

create table public.category_translations (
  category_id uuid not null references public.categories (id) on delete cascade,
  language_code varchar(10) not null references public.languages (code) on delete cascade,
  name varchar(100) not null check (length(trim(name)) > 0),
  description text,
  updated_at timestamptz not null default now(),
  primary key (category_id, language_code)
);
create trigger trg_category_translations_touch before update on public.category_translations
  for each row execute function public.tg_touch();

create table public.category_members (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role varchar(10) not null default 'member' check (role in ('owner', 'member')),
  share_ratio numeric(7, 4) check (share_ratio is null or share_ratio > 0),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint category_members_unique unique (category_id, user_id)
);

create table public.category_accounts (
  category_id uuid not null references public.categories (id) on delete cascade,
  account_id uuid not null references public.financial_accounts (id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (category_id, account_id)
);
create unique index category_accounts_one_default on public.category_accounts (category_id) where is_default;

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  match_field varchar(20) not null default 'description' check (match_field in ('description', 'merchant')),
  match_type varchar(20) not null default 'contains' check (match_type in ('contains', 'equals', 'starts_with', 'regex')),
  pattern varchar(200) not null check (length(trim(pattern)) > 0),
  account_id uuid references public.financial_accounts (id) on delete cascade,
  transaction_type varchar(20) check (transaction_type in ('expense', 'income', 'transfer')),
  amount_min numeric(20, 4),
  amount_max numeric(20, 4),
  priority smallint not null default 100,
  apply_on_import boolean not null default true,
  is_active boolean not null default true,
  hit_count integer not null default 0,
  last_matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint category_rules_amount_range check (amount_min is null or amount_max is null or amount_min <= amount_max)
);
create unique index category_rules_unique on public.category_rules (ledger_id, match_field, match_type, pattern)
  where deleted_at is null;
create index idx_category_rules_category on public.category_rules (category_id);
create trigger trg_category_rules_touch before update on public.category_rules
  for each row execute function public.tg_touch_audit();

create or replace function public.tg_category_rules_normalize()
returns trigger
language plpgsql
as $$
begin
  if new.match_type <> 'regex' then
    new.pattern := public.normalize_match_text(trim(new.pattern));
  end if;
  return new;
end;
$$;
create trigger trg_category_rules_normalize before insert or update of pattern, match_type on public.category_rules
  for each row execute function public.tg_category_rules_normalize();

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  period_type varchar(10) not null default 'monthly' check (period_type in ('monthly', 'yearly')),
  period_start date,
  amount numeric(20, 4) not null check (amount > 0),
  warning_threshold_pct smallint not null default 80 check (warning_threshold_pct between 1 and 100),
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint budgets_unique unique nulls not distinct (ledger_id, category_id, period_type, period_start)
);
create trigger trg_budgets_touch before update on public.budgets
  for each row execute function public.tg_touch_audit();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  name varchar(50) not null check (length(trim(name)) > 0),
  color varchar(9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create unique index tags_ledger_name on public.tags (ledger_id, lower(name)) where deleted_at is null;
create trigger trg_tags_touch before update on public.tags
  for each row execute function public.tg_touch_audit();

-- Cross-ledger guards for link tables.
create or replace function public.tg_same_ledger_links()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'category_members' then
    if not exists (
      select 1 from public.categories c
      join public.ledger_members m on m.ledger_id = c.ledger_id
      where c.id = new.category_id and m.user_id = new.user_id and m.status = 'active'
    ) then
      raise exception 'User is not an active member of the category''s ledger' using errcode = '23514';
    end if;
  elsif tg_table_name = 'category_accounts' then
    if not exists (
      select 1 from public.categories c
      join public.financial_accounts a on a.ledger_id = c.ledger_id
      where c.id = new.category_id and a.id = new.account_id
    ) then
      raise exception 'Account and category must belong to the same ledger' using errcode = '23514';
    end if;
  elsif tg_table_name = 'category_rules' then
    if not exists (select 1 from public.categories where id = new.category_id and ledger_id = new.ledger_id)
       or (new.account_id is not null and not exists (
         select 1 from public.financial_accounts where id = new.account_id and ledger_id = new.ledger_id)) then
      raise exception 'Rule category/account must belong to the rule''s ledger' using errcode = '23514';
    end if;
  elsif tg_table_name = 'budgets' then
    if new.category_id is not null and not exists (
      select 1 from public.categories where id = new.category_id and ledger_id = new.ledger_id) then
      raise exception 'Budget category must belong to the budget''s ledger' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_category_members_ledger before insert or update on public.category_members
  for each row execute function public.tg_same_ledger_links();
create trigger trg_category_accounts_ledger before insert or update on public.category_accounts
  for each row execute function public.tg_same_ledger_links();
create trigger trg_category_rules_ledger before insert or update on public.category_rules
  for each row execute function public.tg_same_ledger_links();
create trigger trg_budgets_ledger before insert or update on public.budgets
  for each row execute function public.tg_same_ledger_links();
