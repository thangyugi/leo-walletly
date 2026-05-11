/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 02
   Payment Rail Architecture:
     payment_instruments (Rakuten Pay, PayPay, PASMO — NOT money)
     funding_sources     (Rakuten Credit Card, SMBC, PayPay Balance)
     settlement_profiles (instrument+source mapping)
   ============================================================
   Key: Rakuten Pay at Starbucks:
     Rail = Rakuten Pay, Funding = Rakuten Credit Card
     Settlement = Monthly credit billing
   ============================================================ */

-- Payment Instruments (payment rails — HOW you paid)
create table if not exists payment_instruments (
  id                        uuid        primary key default gen_random_uuid(),
  ledger_id                 uuid        not null references ledgers(id) on delete cascade,
  linked_financial_account_id uuid      references financial_accounts(id) on delete set null,
  type                      text        not null,
  provider                  text        not null,
  name                      text        not null,
  name_ja                   text,
  name_vi                   text,
  name_en                   text,
  settlement_type           text        not null,
  is_transit_card           boolean     not null default false,
  supports_auto_charge      boolean     not null default false,
  card_last4                text,
  expiry_month              smallint,
  expiry_year               smallint,
  is_active                 boolean     not null default true,
  is_default                boolean     not null default false,
  color                     text,
  icon                      text,
  sort_order                smallint    not null default 0,
  metadata                  jsonb       not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists idx_payment_instruments_ledger on payment_instruments(ledger_id);
create index if not exists idx_payment_instruments_provider on payment_instruments(provider);
create index if not exists idx_payment_instruments_type on payment_instruments(type);
comment on table payment_instruments is
  'Payment rails (HOW you paid): Rakuten Pay, PayPay, PASMO, Suica, Apple Pay, QUICPay. NOT money source.\n  settlement_type: prepaid|postpaid|direct_debit|credit_settlement|wallet_balance.\n  is_transit_card=true → charge is asset_transfer not expense (PASMO/Suica).\n  name_ja/name_vi/name_en: multilingual display support.';

-- Funding Sources (WHERE the money actually comes from)
create table if not exists funding_sources (
  id                    uuid        primary key default gen_random_uuid(),
  ledger_id             uuid        not null references ledgers(id) on delete cascade,
  financial_account_id  uuid        references financial_accounts(id) on delete set null,
  payment_instrument_id uuid        references payment_instruments(id) on delete set null,
  type                  text        not null,
  name                  text        not null,
  name_ja               text,
  name_vi               text,
  name_en               text,
  institution           text,
  settlement_day        smallint,
  payment_due_day       smallint,
  rewards_rate          numeric(5,4),
  rewards_currency      text,
  priority_order        integer     not null default 0,
  is_default            boolean     not null default false,
  is_active             boolean     not null default true,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_funding_sources_ledger on funding_sources(ledger_id);
create index if not exists idx_funding_sources_financial_account on funding_sources(financial_account_id) where financial_account_id is not null;
create index if not exists idx_funding_sources_instrument on funding_sources(payment_instrument_id) where payment_instrument_id is not null;
comment on table funding_sources is
  'Actual money origin: Rakuten Credit Card, PayPay Balance, SMBC Bank, Cash.\n  type: bank_account|credit_card|e_wallet_balance|prepaid_balance|cash|points_balance.\n  One payment_instrument can have multiple funding_sources (PayPay = balance+card+bank).\n  priority_order determines which funding source is charged first.';

-- Settlement Profiles (instrument+source mapping)
create table if not exists settlement_profiles (
  id                    uuid        primary key default gen_random_uuid(),
  ledger_id             uuid        not null references ledgers(id) on delete cascade,
  payment_instrument_id uuid        not null references payment_instruments(id) on delete cascade,
  funding_source_id     uuid        not null references funding_sources(id) on delete cascade,
  profile_name          text        not null,
  profile_name_ja       text,
  profile_name_vi       text,
  profile_name_en       text,
  settlement_cycle      text        not null default 'monthly',
  settlement_date_rule  text,
  is_primary            boolean     not null default true,
  condition_expression  text,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);
create unique index if not exists idx_settlement_profiles_unique on settlement_profiles(payment_instrument_id, funding_source_id);
create index if not exists idx_settlement_profiles_ledger on settlement_profiles(ledger_id);
comment on table settlement_profiles is
  'Maps payment_instrument to funding_source with settlement rules.\n  Handles: PayPay (balance→credit→bank), Rakuten Pay→Card→Monthly billing.\n  settlement_cycle: daily|weekly|monthly|per_transaction|prepaid_balance.\n  profile_name_ja/vi/en: multilingual support.';

-- RLS
alter table payment_instruments  enable row level security;
alter table funding_sources      enable row level security;
alter table settlement_profiles  enable row level security;

create policy "payment_instruments_ledger_select" on payment_instruments for select
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid()));
create policy "payment_instruments_ledger_write" on payment_instruments for all
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid() and role in ('owner','admin','accountant')));
create policy "funding_sources_ledger_select" on funding_sources for select
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid()));
create policy "funding_sources_ledger_write" on funding_sources for all
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid() and role in ('owner','admin','accountant')));
create policy "settlement_profiles_ledger_select" on settlement_profiles for select
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid()));
create policy "settlement_profiles_ledger_write" on settlement_profiles for all
  using (ledger_id in (select ledger_id from ledger_members where user_id = auth.uid() and role in ('owner','admin','accountant')));