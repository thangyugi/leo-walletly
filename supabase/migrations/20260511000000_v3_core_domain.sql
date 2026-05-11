/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 01
   Core Domain: Organizations · Household Members · Workspaces
                Ledgers · Accounting Periods · Chart of Accounts
                Financial Accounts
   ============================================================
   Philosophy:
     Business Event ≠ Payment Instrument ≠ Funding Source
     ≠ Settlement ≠ Accounting Entry ≠ Expense Ownership
     ≠ Analytics
   ============================================================ */

create extension if not exists "uuid-ossp";
create extension if not exists "ltree";
create extension if not exists "pgcrypto";

do $$ begin
  create type transaction_status as enum ('draft','pending','posted','voided','reversed','reconciled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type journal_entry_type as enum ('standard','opening','closing','reversal','correcting','adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('asset','liability','equity','income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type normal_balance as enum ('debit', 'credit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reconciliation_status as enum ('open','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ocr_status as enum ('pending','processing','completed','failed','review_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_status as enum ('pending','parsing','normalizing','detecting_duplicates','classifying','review','committing','completed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending','approved','rejected','cancelled','escalated');
exception when duplicate_object then null; end $$;

-- Organizations V3 extensions
alter table organizations
  add column if not exists plan text not null default 'personal',
  add column if not exists country_code char(2),
  add column if not exists timezone text not null default 'Asia/Tokyo',
  add column if not exists base_currency char(3) not null default 'JPY',
  add column if not exists fiscal_year_start_month smallint not null default 1,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz;

comment on column organizations.plan is 'personal | family | household | freelancer | business | enterprise';

-- Household Members
create table if not exists household_members (
  id               uuid        primary key default gen_random_uuid(),
  organization_id  uuid        not null references organizations(id) on delete cascade,
  user_id          uuid,
  role             text        not null default 'member',
  relationship_type text,
  display_name     text        not null,
  avatar_url       text,
  color            text,
  is_active        boolean     not null default true,
  sort_order       smallint    not null default 0,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_household_members_org on household_members(organization_id);
create index if not exists idx_household_members_user on household_members(user_id) where user_id is not null;
comment on table household_members is 'Family/household participants. role: owner|member|dependent. relationship_type: husband|wife|child|parent|partner';

-- Workspaces V3 extensions
alter table workspaces
  add column if not exists workspace_type text not null default 'personal',
  add column if not exists fiscal_year_start_month smallint not null default 1,
  add column if not exists default_currency char(3) not null default 'JPY',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz;
comment on column workspaces.workspace_type is 'personal | household | freelancer | business | enterprise';

-- Ledgers V3 extensions
alter table ledgers
  add column if not exists ledger_type text not null default 'personal',
  add column if not exists currency char(3) not null default 'JPY',
  add column if not exists is_default boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz;
comment on column ledgers.ledger_type is 'personal | household | business | investment | travel';

-- Accounting Periods
create table if not exists accounting_periods (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  ledger_id    uuid        references ledgers(id) on delete set null,
  period_name  text        not null,
  period_type  text        not null,
  start_date   date        not null,
  end_date     date        not null,
  status       text        not null default 'open',
  closed_by    uuid,
  closed_at    timestamptz,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create unique index if not exists idx_accounting_periods_unique on accounting_periods(workspace_id, period_name);
create index if not exists idx_accounting_periods_dates on accounting_periods(start_date, end_date);
comment on table accounting_periods is 'Fiscal periods for journal entry locking. status: open|closed|locked';

-- Chart of Accounts
create table if not exists chart_of_accounts (
  id               uuid           primary key default gen_random_uuid(),
  workspace_id     uuid           not null references workspaces(id) on delete cascade,
  parent_id        uuid           references chart_of_accounts(id),
  account_code     text           not null,
  account_name_ja  text           not null,
  account_name_vi  text           not null,
  account_name_en  text           not null,
  account_type     account_type   not null,
  normal_balance   normal_balance not null,
  is_system        boolean        not null default false,
  is_active        boolean        not null default true,
  path             ltree,
  description_ja   text,
  description_vi   text,
  description_en   text,
  metadata         jsonb          not null default '{}'::jsonb,
  created_at       timestamptz    not null default now(),
  updated_at       timestamptz    not null default now()
);
create unique index if not exists idx_coa_code_workspace on chart_of_accounts(workspace_id, account_code);
create index if not exists idx_coa_parent on chart_of_accounts(parent_id) where parent_id is not null;
create index if not exists idx_coa_path on chart_of_accounts using gist (path);
create index if not exists idx_coa_type on chart_of_accounts(account_type);
comment on table chart_of_accounts is 'Standard double-entry chart of accounts with ja/vi/en names. account_type: asset|liability|equity|income|expense';

-- Financial Accounts
create table if not exists financial_accounts (
  id                   uuid        primary key default gen_random_uuid(),
  ledger_id            uuid        not null references ledgers(id) on delete cascade,
  chart_of_account_id  uuid        references chart_of_accounts(id),
  account_name         text        not null,
  account_type         text        not null,
  institution_name     text,
  institution_code     text,
  account_number_masked text,
  currency             char(3)     not null default 'JPY',
  current_balance      numeric(20,6) not null default 0,
  credit_limit         numeric(20,6),
  statement_day        smallint,
  payment_due_day      smallint,
  is_active            boolean     not null default true,
  is_tracked           boolean     not null default true,
  color                text,
  icon                 text,
  metadata             jsonb       not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);
create index if not exists idx_financial_accounts_ledger on financial_accounts(ledger_id);
create index if not exists idx_financial_accounts_type on financial_accounts(account_type);
create index if not exists idx_financial_accounts_active on financial_accounts(ledger_id, is_active) where deleted_at is null;
comment on table financial_accounts is 'Real money containers. account_type: bank|credit_card|e_wallet|cash|investment|crypto. NOT payment rails.';

-- RLS
alter table household_members    enable row level security;
alter table accounting_periods   enable row level security;
alter table chart_of_accounts    enable row level security;
alter table financial_accounts   enable row level security;

create policy "household_members_org_member_select" on household_members for select
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid()));
create policy "household_members_owner_all" on household_members for all
  using (organization_id in (select organization_id from organization_members where user_id = auth.uid() and role in ('owner', 'admin')));
create policy "accounting_periods_workspace_select" on accounting_periods for select
  using (workspace_id in (select workspace_id from ledger_members lm join ledgers l on l.id = lm.ledger_id where lm.user_id = auth.uid()));
create policy "chart_of_accounts_workspace_select" on chart_of_accounts for select
  using (workspace_id in (select workspace_id from ledger_members lm join ledgers l on l.id = lm.ledger_id where lm.user_id = auth.uid()));
create policy "financial_accounts_ledger_select" on financial_accounts for select
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid()));
create policy "financial_accounts_ledger_member_write" on financial_accounts for all
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid() and role in ('owner', 'admin', 'accountant')));

comment on schema public is 'Leo Walletly — Enterprise FinTech V3 Schema. Supports ja/vi/en.';