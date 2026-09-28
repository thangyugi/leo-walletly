-- E11–E16. Recurring rules, bank connections, transactions, tags, shares, settlements.

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  name varchar(100) not null check (length(trim(name)) > 0),
  transaction_type varchar(20) not null default 'expense' check (transaction_type in ('expense', 'income', 'transfer')),
  amount numeric(20, 4) not null check (amount > 0),
  currency_code char(3) not null references public.currencies (code),
  account_id uuid not null references public.financial_accounts (id),
  transfer_account_id uuid references public.financial_accounts (id),
  category_id uuid references public.categories (id) on delete set null,
  description text not null,
  notes text,
  frequency varchar(10) not null default 'monthly' check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count smallint not null default 1 check (interval_count between 1 and 365),
  day_of_month smallint check (day_of_month between 1 and 31),
  day_of_week smallint check (day_of_week between 0 and 6),
  month_of_year smallint check (month_of_year between 1 and 12),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  last_generated_date date,
  auto_post boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint recurring_rules_transfer check ((transaction_type = 'transfer') = (transfer_account_id is not null)),
  constraint recurring_rules_dates check (end_date is null or end_date >= start_date)
);
create index idx_recurring_rules_due on public.recurring_rules (next_run_date) where is_active and deleted_at is null;
create trigger trg_recurring_rules_touch before update on public.recurring_rules
  for each row execute function public.tg_touch_audit();

create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  provider_code varchar(30) not null references public.providers (code),
  account_id uuid references public.financial_accounts (id) on delete set null,
  external_connection_id varchar(255),
  vault_secret_id uuid,
  status varchar(20) not null default 'pending' check (status in ('pending', 'active', 'error', 'expired', 'revoked')),
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create trigger trg_bank_connections_touch before update on public.bank_connections
  for each row execute function public.tg_touch_audit();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  account_id uuid not null references public.financial_accounts (id),
  transfer_account_id uuid references public.financial_accounts (id),
  transaction_type varchar(20) not null check (transaction_type in ('expense', 'income', 'transfer')),
  status varchar(20) not null default 'posted' check (status in ('pending', 'posted', 'void')),
  amount numeric(20, 4) not null check (amount > 0),
  currency_code char(3) not null references public.currencies (code),
  exchange_rate numeric(20, 10) not null default 1 check (exchange_rate > 0),
  base_amount numeric(20, 4) not null default 0,
  transaction_date date not null,
  transaction_time time,
  description text not null,
  merchant_name varchar(200),
  category_id uuid references public.categories (id) on delete set null,
  categorized_by varchar(10) check (categorized_by in ('manual', 'rule', 'ai', 'import')),
  category_rule_id uuid references public.category_rules (id) on delete set null,
  needs_review boolean not null default false,
  notes text,
  paid_by_user_id uuid references public.users (id) on delete set null,
  source varchar(20) not null default 'manual' check (source in ('manual', 'import', 'scan', 'recurring', 'bank_sync')),
  import_job_id uuid,
  import_row_id uuid,
  document_id uuid,
  recurring_rule_id uuid references public.recurring_rules (id) on delete set null,
  recurring_occurrence date,
  bank_connection_id uuid references public.bank_connections (id) on delete set null,
  external_id varchar(255),
  dedupe_hash char(64),
  exclude_from_reports boolean not null default false,
  is_reconciled boolean not null default false,
  reconciled_at timestamptz,
  reconciled_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint transactions_transfer check ((transaction_type = 'transfer') = (transfer_account_id is not null)),
  constraint transactions_transfer_distinct check (transfer_account_id is null or transfer_account_id <> account_id)
);

create index idx_transactions_ledger_date on public.transactions (ledger_id, transaction_date desc) where deleted_at is null;
create index idx_transactions_category on public.transactions (ledger_id, category_id, transaction_date) where deleted_at is null;
create index idx_transactions_account on public.transactions (account_id, transaction_date) where deleted_at is null;
create index idx_transactions_description_trgm on public.transactions using gin (description extensions.gin_trgm_ops);
create unique index transactions_external_id on public.transactions (account_id, external_id)
  where external_id is not null and deleted_at is null;
create unique index transactions_dedupe on public.transactions (account_id, dedupe_hash)
  where dedupe_hash is not null and deleted_at is null;
create unique index transactions_recurring_occurrence on public.transactions (recurring_rule_id, recurring_occurrence)
  where recurring_rule_id is not null;

create trigger trg_transactions_touch before update on public.transactions
  for each row execute function public.tg_touch_audit();

-- Keeps accounts/category in the same ledger, fills base_amount, paid_by and
-- reconciliation timestamps.
create or replace function public.tg_transactions_prepare()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.financial_accounts where id = new.account_id and ledger_id = new.ledger_id) then
    raise exception 'Account does not belong to this ledger' using errcode = '23514';
  end if;
  if new.transfer_account_id is not null and not exists (
    select 1 from public.financial_accounts where id = new.transfer_account_id and ledger_id = new.ledger_id) then
    raise exception 'Transfer account does not belong to this ledger' using errcode = '23514';
  end if;
  if new.category_id is not null and not exists (
    select 1 from public.categories where id = new.category_id and ledger_id = new.ledger_id) then
    raise exception 'Category does not belong to this ledger' using errcode = '23514';
  end if;

  new.base_amount := round(new.amount * new.exchange_rate, 4);
  new.paid_by_user_id := coalesce(new.paid_by_user_id, auth.uid());

  if new.is_reconciled and new.reconciled_at is null then
    new.reconciled_at := now();
    new.reconciled_by := coalesce(new.reconciled_by, auth.uid());
  elsif not new.is_reconciled then
    new.reconciled_at := null;
    new.reconciled_by := null;
  end if;
  return new;
end;
$$;
create trigger trg_transactions_prepare before insert or update on public.transactions
  for each row execute function public.tg_transactions_prepare();

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);
create index idx_transaction_tags_tag on public.transaction_tags (tag_id);

create table public.transaction_shares (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  share_amount numeric(20, 4) not null check (share_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_shares_unique unique (transaction_id, user_id)
);
create trigger trg_transaction_shares_touch before update on public.transaction_shares
  for each row execute function public.tg_touch();

-- Shares must add up to the transaction amount (checked at commit so a client
-- can replace all shares in one transaction).
create or replace function public.tg_transaction_shares_total()
returns trigger
language plpgsql
as $$
declare
  v_tx uuid := coalesce(new.transaction_id, old.transaction_id);
  v_amount numeric;
  v_sum numeric;
begin
  select amount into v_amount from public.transactions where id = v_tx;
  if v_amount is null then
    return null;
  end if;
  select coalesce(sum(share_amount), 0) into v_sum from public.transaction_shares where transaction_id = v_tx;
  if v_sum > 0 and v_sum <> v_amount then
    raise exception 'Shares (%) must add up to the transaction amount (%)', v_sum, v_amount using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger trg_transaction_shares_total
  after insert or update or delete on public.transaction_shares
  deferrable initially deferred
  for each row execute function public.tg_transaction_shares_total();

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  from_user_id uuid not null references public.users (id),
  to_user_id uuid not null references public.users (id),
  amount numeric(20, 4) not null check (amount > 0),
  currency_code char(3) not null references public.currencies (code),
  settled_on date not null default current_date,
  note text,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1,
  constraint settlements_distinct_users check (from_user_id <> to_user_id)
);
create index idx_settlements_ledger on public.settlements (ledger_id, settled_on desc);
create trigger trg_settlements_touch before update on public.settlements
  for each row execute function public.tg_touch_audit();
