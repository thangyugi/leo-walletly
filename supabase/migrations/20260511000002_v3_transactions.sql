/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 03
   Transaction Architecture V3:
     transactions              (core event record)
     transaction_splits        (split one bill into multiple items)
     transaction_participants  (who was involved)
     expense_allocations       (household cost sharing)
     transaction_dimensions    (analytical tagging)
     transaction_attachments   (receipts, invoices)
     transaction_tags          (freeform tags)
   ============================================================
   Core principle:
     Business Event ≠ Payment Rail ≠ Funding Source
     ≠ Settlement Flow ≠ Expense Ownership ≠ Accounting
   ============================================================ */

-- ─────────────────────────────────────────────
-- CATEGORIES (workspace-level, replaces legacy custom_groups for classification)
-- ─────────────────────────────────────────────
create table if not exists categories (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references workspaces(id) on delete cascade,
  parent_id        uuid        references categories(id),
  chart_of_account_id uuid     references chart_of_accounts(id) on delete set null,

  -- Multi-language names (required for ja/vi/en support)
  name_ja          text        not null,
  name_vi          text        not null,
  name_en          text        not null,

  emoji            text,
  color            text,
  icon             text,

  -- Category classification
  category_type    text        not null default 'expense',
  -- expense | income | transfer | asset_transfer | reimbursement

  is_system        boolean     not null default false,
  is_active        boolean     not null default true,
  sort_order       smallint    not null default 0,
  path             ltree,

  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_categories_workspace
  on categories(workspace_id);
create index if not exists idx_categories_parent
  on categories(parent_id) where parent_id is not null;
create index if not exists idx_categories_path
  on categories using gist (path);
create index if not exists idx_categories_type
  on categories(category_type);

comment on table categories is
  'Workspace-level expense/income categories with ja/vi/en names.
   Replaces legacy custom_groups for classification.
   category_type: expense|income|transfer|asset_transfer|reimbursement';

-- ─────────────────────────────────────────────
-- TAGS
-- Freeform organizational labels across transactions
-- ─────────────────────────────────────────────
create table if not exists tags (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references workspaces(id) on delete cascade,
  name             text        not null,
  name_ja          text,
  name_vi          text,
  name_en          text,
  color            text,
  is_active        boolean     not null default true,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create unique index if not exists idx_tags_name_workspace
  on tags(workspace_id, lower(name));

comment on table tags is
  'Freeform tags for organizing transactions. Supports ja/vi/en names.';

-- ─────────────────────────────────────────────
-- TRANSACTIONS V3
-- Core business event record — central to the entire system
-- ─────────────────────────────────────────────
create table if not exists transactions_v3 (
  id                      uuid              primary key default gen_random_uuid(),

  -- Tenant anchors (always present)
  organization_id         uuid              not null references organizations(id),
  workspace_id            uuid              not null references workspaces(id),
  ledger_id               uuid              not null references ledgers(id),

  -- Payment rail (HOW you paid — nullable for cash)
  payment_instrument_id   uuid              references payment_instruments(id) on delete set null,

  -- Actual money source (WHERE money came from)
  funding_source_id       uuid              references funding_sources(id) on delete set null,

  -- Where settlement will land (credit card liability account)
  settlement_account_id   uuid              references financial_accounts(id) on delete set null,

  -- Classification
  category_id             uuid              references categories(id) on delete set null,

  -- Lifecycle
  status                  transaction_status not null default 'draft',

  -- Event types
  transaction_type        text              not null,
  -- expense | income | transfer | refund | asset_transfer
  -- (asset_transfer = PASMO charge: NOT expense, just moving money)

  business_event_type     text,
  -- purchase | subscription | salary | dividend | loan_repayment
  -- rent | utility | insurance | tax | reimbursement | gift | p2p_transfer

  -- Origin tracking (deduplication key)
  source                  text,
  -- manual | csv_import | pdf_import | ocr_scan | api | bank_feed | recurring

  source_reference        text,             -- import_row_id or scan_job_id
  external_id             text,             -- provider's transaction ID
  external_hash           text,             -- hash for duplicate detection

  -- Merchant information
  merchant_name           text,             -- raw merchant name from statement
  merchant_normalized     text,             -- normalized name after NLP processing
  merchant_category_code  text,             -- MCC code if available

  -- Human-readable
  description             text,
  notes                   text,

  -- Temporal
  transaction_date        timestamptz       not null,
  value_date              timestamptz,      -- when money actually moved
  posted_date             timestamptz,      -- when bank confirmed it

  -- Amount (always in original transaction currency)
  amount                  numeric(20,6)     not null,
  currency_code           char(3)           not null,

  -- Base currency equivalent (for multi-currency ledgers)
  base_amount             numeric(20,6),
  base_currency_code      char(3),
  exchange_rate           numeric(20,10),
  exchange_rate_source    text,             -- ecb | boj | manual | provider

  -- Linked receipt
  receipt_document_id     uuid,
  -- FK added after receipt_documents table is created

  -- Accounting period linkage
  accounting_period_id    uuid              references accounting_periods(id) on delete set null,

  -- Audit
  created_by              uuid,
  reviewed_by             uuid,
  reviewed_at             timestamptz,

  is_reconciled           boolean           not null default false,
  reconciled_at           timestamptz,

  metadata                jsonb             not null default '{}'::jsonb,
  created_at              timestamptz       not null default now(),
  updated_at              timestamptz       not null default now(),
  deleted_at              timestamptz
);

-- Performance indexes
create index if not exists idx_txn_v3_ledger
  on transactions_v3(ledger_id, transaction_date desc) where deleted_at is null;
create index if not exists idx_txn_v3_workspace
  on transactions_v3(workspace_id) where deleted_at is null;
create index if not exists idx_txn_v3_status
  on transactions_v3(status) where deleted_at is null;
create index if not exists idx_txn_v3_date
  on transactions_v3(transaction_date desc) where deleted_at is null;
create index if not exists idx_txn_v3_merchant
  on transactions_v3(merchant_normalized) where merchant_normalized is not null;
create index if not exists idx_txn_v3_external
  on transactions_v3(external_id) where external_id is not null;
create index if not exists idx_txn_v3_hash
  on transactions_v3(external_hash) where external_hash is not null;
create index if not exists idx_txn_v3_payment_instrument
  on transactions_v3(payment_instrument_id) where payment_instrument_id is not null;
create index if not exists idx_txn_v3_funding_source
  on transactions_v3(funding_source_id) where funding_source_id is not null;
create index if not exists idx_txn_v3_source
  on transactions_v3(source, source_reference) where source_reference is not null;

comment on table transactions_v3 is
  'Core business event table V3.
   Separates: payment_instrument (rail) vs funding_source (money) vs settlement_account.
   transaction_type: expense|income|transfer|refund|asset_transfer.
   asset_transfer = transit card charge (PASMO/Suica) — not an expense.
   source: manual|csv_import|pdf_import|ocr_scan|api|bank_feed|recurring';

-- ─────────────────────────────────────────────
-- TRANSACTION SPLITS
-- Split one transaction into multiple line items
-- e.g. supermarket receipt: food ¥2000 + household ¥500 + personal ¥300
-- ─────────────────────────────────────────────
create table if not exists transaction_splits (
  id                    uuid        primary key default gen_random_uuid(),
  transaction_id        uuid        not null references transactions_v3(id) on delete cascade,
  category_id           uuid        references categories(id) on delete set null,

  name_ja               text,
  name_vi               text,
  name_en               text,

  amount                numeric(20,6) not null,
  currency_code         char(3)     not null,

  expense_scope         text        not null default 'personal',
  -- personal | shared_household | childcare | business | reimbursable

  notes                 text,
  sort_order            smallint    not null default 0,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_txn_splits_transaction
  on transaction_splits(transaction_id);

comment on table transaction_splits is
  'Line-item splits for one transaction. expense_scope: personal|shared_household|childcare|business|reimbursable';

-- ─────────────────────────────────────────────
-- TRANSACTION PARTICIPANTS
-- Who was involved in this transaction
-- ─────────────────────────────────────────────
create table if not exists transaction_participants (
  id                    uuid        primary key default gen_random_uuid(),
  transaction_id        uuid        not null references transactions_v3(id) on delete cascade,
  household_member_id   uuid        references household_members(id) on delete set null,

  role                  text        not null,
  -- payer | beneficiary | shared_member | reviewer | approver

  notes                 text,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_txn_participants_transaction
  on transaction_participants(transaction_id);
create index if not exists idx_txn_participants_member
  on transaction_participants(household_member_id) where household_member_id is not null;

comment on table transaction_participants is
  'Household members involved in a transaction.
   role: payer|beneficiary|shared_member|reviewer|approver';

-- ─────────────────────────────────────────────
-- EXPENSE ALLOCATIONS
-- How a shared expense is divided among household members
-- ─────────────────────────────────────────────
create table if not exists expense_allocations (
  id                    uuid        primary key default gen_random_uuid(),
  transaction_id        uuid        not null references transactions_v3(id) on delete cascade,
  transaction_split_id  uuid        references transaction_splits(id) on delete set null,
  household_member_id   uuid        references household_members(id) on delete set null,

  allocation_type       text        not null,
  -- equal_split | fixed_amount | percentage | weighted | formula

  percentage            numeric(5,2),   -- used when type = percentage (0-100)
  amount                numeric(20,6),  -- used when type = fixed_amount
  weight                numeric(10,4),  -- used when type = weighted

  expense_scope         text        not null default 'personal',
  -- personal | shared_household | childcare | business | reimbursable

  is_settled            boolean     not null default false,
  settled_at            timestamptz,
  settled_by_transaction_id uuid    references transactions_v3(id) on delete set null,

  notes                 text,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_expense_alloc_transaction
  on expense_allocations(transaction_id);
create index if not exists idx_expense_alloc_member
  on expense_allocations(household_member_id) where household_member_id is not null;
create index if not exists idx_expense_alloc_unsettled
  on expense_allocations(is_settled) where not is_settled;

comment on table expense_allocations is
  'How a shared expense is split among household members.
   allocation_type: equal_split|fixed_amount|percentage|weighted|formula.
   expense_scope: personal|shared_household|childcare|business|reimbursable.
   Enables household dashboard: Husband ¥110,000 / Wife ¥70,000 / Shared ¥180,000';

-- ─────────────────────────────────────────────
-- DIMENSIONS & DIMENSION VALUES
-- Analytical dimensions beyond categories
-- ─────────────────────────────────────────────
create table if not exists dimensions (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references workspaces(id) on delete cascade,
  dimension_key    text        not null,   -- expense_scope | project | department | cost_center
  name_ja          text        not null,
  name_vi          text        not null,
  name_en          text        not null,
  is_required      boolean     not null default false,
  is_active        boolean     not null default true,
  sort_order       smallint    not null default 0,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create unique index if not exists idx_dimensions_key_workspace
  on dimensions(workspace_id, dimension_key);

create table if not exists dimension_values (
  id               uuid        primary key default gen_random_uuid(),
  dimension_id     uuid        not null references dimensions(id) on delete cascade,
  value_key        text        not null,   -- husband | wife | shared_household | personal
  name_ja          text        not null,
  name_vi          text        not null,
  name_en          text        not null,
  color            text,
  is_active        boolean     not null default true,
  sort_order       smallint    not null default 0,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create unique index if not exists idx_dim_values_key
  on dimension_values(dimension_id, value_key);

comment on table dimensions is
  'Analytical dimensions: expense_scope|household_member|project|department|cost_center|lifestyle_category';
comment on table dimension_values is
  'Values per dimension: husband|wife|child|shared_household|personal|business';

-- ─────────────────────────────────────────────
-- TRANSACTION DIMENSIONS
-- Attach dimension values to a transaction
-- ─────────────────────────────────────────────
create table if not exists transaction_dimensions (
  id                    uuid        primary key default gen_random_uuid(),
  transaction_id        uuid        not null references transactions_v3(id) on delete cascade,
  dimension_id          uuid        not null references dimensions(id) on delete cascade,
  dimension_value_id    uuid        not null references dimension_values(id) on delete cascade,
  created_at            timestamptz not null default now()
);

create unique index if not exists idx_txn_dimensions_unique
  on transaction_dimensions(transaction_id, dimension_id);
create index if not exists idx_txn_dimensions_transaction
  on transaction_dimensions(transaction_id);

comment on table transaction_dimensions is
  'Analytical dimension tags on transactions. Used for household analytics and reporting.';

-- ─────────────────────────────────────────────
-- TRANSACTION ATTACHMENTS
-- Files linked to a transaction (receipt images, invoices, etc.)
-- ─────────────────────────────────────────────
create table if not exists transaction_attachments (
  id                    uuid        primary key default gen_random_uuid(),
  transaction_id        uuid        not null references transactions_v3(id) on delete cascade,
  file_name             text        not null,
  file_type             text        not null,   -- image/jpeg | image/png | application/pdf
  storage_path          text        not null,
  file_size_bytes       bigint,
  thumbnail_path        text,
  uploaded_by           uuid,
  description           text,
  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_txn_attachments_transaction
  on transaction_attachments(transaction_id);

-- ─────────────────────────────────────────────
-- TRANSACTION TAGS (many-to-many)
-- ─────────────────────────────────────────────
create table if not exists transaction_tags (
  transaction_id  uuid not null references transactions_v3(id) on delete cascade,
  tag_id          uuid not null references tags(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

create index if not exists idx_txn_tags_tag
  on transaction_tags(tag_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table categories              enable row level security;
alter table tags                    enable row level security;
alter table transactions_v3         enable row level security;
alter table transaction_splits      enable row level security;
alter table transaction_participants enable row level security;
alter table expense_allocations     enable row level security;
alter table dimensions              enable row level security;
alter table dimension_values        enable row level security;
alter table transaction_dimensions  enable row level security;
alter table transaction_attachments enable row level security;
alter table transaction_tags        enable row level security;

-- Categories
create policy "categories_workspace_select"
  on categories for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
  );

create policy "categories_workspace_write"
  on categories for all
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin', 'accountant')
    )
  );

-- Tags
create policy "tags_workspace_select"
  on tags for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
  );

-- Transactions V3
create policy "transactions_v3_ledger_select"
  on transactions_v3 for select
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    ) and deleted_at is null
  );

create policy "transactions_v3_ledger_insert"
  on transactions_v3 for insert
  with check (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'accountant', 'operator')
    )
  );

create policy "transactions_v3_ledger_update"
  on transactions_v3 for update
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'accountant')
    )
  );

-- Transaction sub-tables: inherit via transaction ledger check
create policy "transaction_splits_select"
  on transaction_splits for select
  using (
    transaction_id in (
      select id from transactions_v3 where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

create policy "transaction_participants_select"
  on transaction_participants for select
  using (
    transaction_id in (
      select id from transactions_v3 where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

create policy "expense_allocations_select"
  on expense_allocations for select
  using (
    transaction_id in (
      select id from transactions_v3 where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

create policy "dimensions_workspace_select"
  on dimensions for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
  );

create policy "dimension_values_select"
  on dimension_values for select
  using (
    dimension_id in (
      select id from dimensions where workspace_id in (
        select workspace_id from ledger_members lm
        join ledgers l on l.id = lm.ledger_id
        where lm.user_id = auth.uid()
      )
    )
  );

create policy "transaction_dimensions_select"
  on transaction_dimensions for select
  using (
    transaction_id in (
      select id from transactions_v3 where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

create policy "transaction_attachments_select"
  on transaction_attachments for select
  using (
    transaction_id in (
      select id from transactions_v3 where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

create policy "transaction_tags_select"
  on transaction_tags for select
  using (
    transaction_id in (
      select id from transactions_v3 where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_v3_updated_at
  before update on transactions_v3
  for each row execute function update_updated_at_column();

create trigger categories_updated_at
  before update on categories
  for each row execute function update_updated_at_column();
