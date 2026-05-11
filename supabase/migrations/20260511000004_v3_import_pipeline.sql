/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 05
   Import Pipeline Architecture:
     import_jobs            (one import session)
     import_batches         (chunked processing)
     import_rows            (one parsed CSV/PDF row)
     import_matches         (duplicate / settlement detection)
     import_errors          (row-level parse errors)
     bank_statement_imports (bank statement file metadata)
     bank_statement_rows    (individual bank statement entries)
   ============================================================
   Import Pipeline Flow:
     CSV/PDF Upload → import_jobs → import_rows → Normalize
     → Merchant Detection → Duplicate Detection → Settlement Match
     → AI Classification → Expense Ownership Detection
     → Preview → Human Review → Commit → transactions_v3
   ============================================================ */

-- ─────────────────────────────────────────────
-- IMPORT JOBS
-- Top-level session for a single import operation
-- ─────────────────────────────────────────────
create table if not exists import_jobs (
  id                    uuid          primary key default gen_random_uuid(),
  ledger_id             uuid          not null references ledgers(id) on delete cascade,
  workspace_id          uuid          not null references workspaces(id) on delete cascade,

  -- Source file info
  file_name             text          not null,
  file_type             text          not null,   -- csv | pdf | ofx | qif | xlsx
  file_size_bytes       bigint,
  storage_path          text,

  -- Provider / format
  provider              text          not null,
  -- rakuten_pay | paypay | paypay_card | smbc | mufg | vcb | mbbank
  -- generic_csv | pdf_bank_statement | manual

  provider_format_version text,                  -- e.g. "2026-01" for format tracking

  -- Status lifecycle
  status                import_status not null default 'pending',
  current_stage         text,                    -- which pipeline stage is running

  -- Counts
  total_rows            integer       not null default 0,
  parsed_rows           integer       not null default 0,
  duplicate_rows        integer       not null default 0,
  error_rows            integer       not null default 0,
  committed_rows        integer       not null default 0,

  -- Date range of imported data
  date_range_start      date,
  date_range_end        date,

  -- Currency
  detected_currency     char(3),

  -- Timing
  started_at            timestamptz,
  completed_at          timestamptz,
  processing_ms         integer,

  -- Who imported
  imported_by           uuid,
  reviewed_by           uuid,
  committed_by          uuid,
  committed_at          timestamptz,

  -- Error summary
  error_summary         text,

  metadata              jsonb         not null default '{}'::jsonb,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

create index if not exists idx_import_jobs_ledger
  on import_jobs(ledger_id, created_at desc);
create index if not exists idx_import_jobs_status
  on import_jobs(status) where status not in ('completed', 'failed');
create index if not exists idx_import_jobs_provider
  on import_jobs(provider);

comment on table import_jobs is
  'One import session (CSV/PDF upload).
   provider: rakuten_pay|paypay|paypay_card|smbc|mufg|vcb|mbbank|generic_csv|pdf_bank_statement.
   status: pending|parsing|normalizing|detecting_duplicates|classifying|review|committing|completed|failed';

-- ─────────────────────────────────────────────
-- IMPORT BATCHES
-- Chunked processing for large files
-- ─────────────────────────────────────────────
create table if not exists import_batches (
  id                uuid        primary key default gen_random_uuid(),
  import_job_id     uuid        not null references import_jobs(id) on delete cascade,
  batch_number      integer     not null,
  row_start         integer     not null,
  row_end           integer     not null,
  status            text        not null default 'pending',
  -- pending | processing | completed | failed
  processed_at      timestamptz,
  error_message     text,
  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_import_batches_job
  on import_batches(import_job_id);

-- ─────────────────────────────────────────────
-- IMPORT ROWS
-- One row from a parsed CSV/PDF import
-- ─────────────────────────────────────────────
create table if not exists import_rows (
  id                    uuid        primary key default gen_random_uuid(),
  import_job_id         uuid        not null references import_jobs(id) on delete cascade,
  import_batch_id       uuid        references import_batches(id) on delete set null,

  -- Position in file
  row_number            integer     not null,

  -- Raw data preserved as-is from file
  raw_data              jsonb       not null default '{}'::jsonb,
  raw_date              text,
  raw_amount            text,
  raw_description       text,
  raw_balance           text,

  -- Normalized / parsed values
  parsed_date           date,
  parsed_amount         numeric(20,6),
  parsed_currency       char(3),
  parsed_description    text,
  parsed_merchant       text,
  parsed_merchant_normalized text,
  parsed_type           text,       -- expense | income | transfer | asset_transfer

  -- Provider-specific fields
  provider_transaction_id text,     -- provider's own ID
  provider_category       text,     -- provider's category label
  provider_note           text,

  -- Japanese-specific
  payment_method_label    text,     -- e.g. "楽天ポイント払い", "PayPay残高"
  points_used             numeric(20,6),
  cashback_amount         numeric(20,6),

  -- AI classification results
  suggested_category_id   uuid      references categories(id) on delete set null,
  ai_category_confidence  numeric(5,2),
  suggested_expense_scope text,
  ai_scope_confidence     numeric(5,2),

  -- Processing status
  status                  text      not null default 'pending',
  -- pending | normalized | duplicate | settlement_match | classified | review | committed | skipped | error

  is_duplicate            boolean   not null default false,
  is_settlement_match     boolean   not null default false,

  -- Linked after commit
  committed_transaction_id uuid     references transactions_v3(id) on delete set null,

  metadata                jsonb     not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_import_rows_job
  on import_rows(import_job_id);
create index if not exists idx_import_rows_status
  on import_rows(status) where status not in ('committed', 'skipped');
create index if not exists idx_import_rows_duplicate
  on import_rows(is_duplicate) where is_duplicate;
create index if not exists idx_import_rows_committed
  on import_rows(committed_transaction_id) where committed_transaction_id is not null;

comment on table import_rows is
  'Parsed rows from CSV/PDF import.
   status: pending|normalized|duplicate|settlement_match|classified|review|committed|skipped|error.
   Tracks Japanese-specific fields: points_used, cashback_amount, payment_method_label.';

-- ─────────────────────────────────────────────
-- IMPORT MATCHES
-- Duplicate detection and settlement matching results
-- ─────────────────────────────────────────────
create table if not exists import_matches (
  id                      uuid        primary key default gen_random_uuid(),
  import_row_id           uuid        not null references import_rows(id) on delete cascade,
  matched_transaction_id  uuid        references transactions_v3(id) on delete set null,
  matched_import_row_id   uuid        references import_rows(id) on delete set null,

  match_type              text        not null,
  -- duplicate           : exact same transaction already exists
  -- possible_duplicate  : high confidence likely duplicate
  -- settlement_match    : Rakuten Pay ↔ Rakuten Card statement
  -- wallet_match        : PayPay payment ↔ PayPay balance deduction
  -- transfer_match      : money moved between own accounts
  -- refund_match        : linked to a prior expense

  confidence_score        numeric(5,2) not null default 0,
  -- 0-100: how confident the matching algorithm is

  match_reason            text,       -- human-readable explanation (ja/vi/en)
  match_fields            jsonb       not null default '{}'::jsonb,
  -- which fields matched: date | amount | merchant | provider_id | hash

  -- Human decision
  decision_status         text        not null default 'pending',
  -- pending | confirmed | rejected | deferred

  decided_by              uuid,
  decided_at              timestamptz,
  decision_note           text,

  metadata                jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists idx_import_matches_row
  on import_matches(import_row_id);
create index if not exists idx_import_matches_transaction
  on import_matches(matched_transaction_id) where matched_transaction_id is not null;
create index if not exists idx_import_matches_type
  on import_matches(match_type);
create index if not exists idx_import_matches_pending
  on import_matches(decision_status) where decision_status = 'pending';

comment on table import_matches is
  'Duplicate and settlement matching results.
   match_type: duplicate|possible_duplicate|settlement_match|wallet_match|transfer_match|refund_match.
   Critical for: Rakuten Pay ↔ Rakuten Card reconciliation (prevents double counting).';

-- ─────────────────────────────────────────────
-- IMPORT ERRORS
-- Row-level parse/validation errors
-- ─────────────────────────────────────────────
create table if not exists import_errors (
  id              uuid        primary key default gen_random_uuid(),
  import_job_id   uuid        not null references import_jobs(id) on delete cascade,
  import_row_id   uuid        references import_rows(id) on delete set null,
  batch_id        uuid        references import_batches(id) on delete set null,

  error_stage     text        not null,
  -- parsing | normalization | merchant_detection | duplicate_check | classification | commit

  error_code      text        not null,
  error_message   text        not null,
  error_message_ja text,
  error_message_vi text,
  error_message_en text,

  raw_data        jsonb       not null default '{}'::jsonb,
  is_recoverable  boolean     not null default true,

  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_import_errors_job
  on import_errors(import_job_id);

comment on table import_errors is
  'Row-level errors during import pipeline. Multi-language error messages for ja/vi/en display.';

-- ─────────────────────────────────────────────
-- BANK STATEMENT IMPORTS
-- Metadata for imported bank statement files
-- ─────────────────────────────────────────────
create table if not exists bank_statement_imports (
  id                uuid        primary key default gen_random_uuid(),
  import_job_id     uuid        not null references import_jobs(id) on delete cascade,
  financial_account_id uuid     references financial_accounts(id) on delete set null,

  -- Statement metadata
  statement_period_start date,
  statement_period_end   date,
  opening_balance        numeric(20,6),
  closing_balance        numeric(20,6),
  currency_code          char(3),

  bank_name              text,
  bank_code              text,
  account_number_masked  text,

  -- Format detection
  format_detected        text,
  -- smbc_csv | mufg_csv | rakuten_bank_csv | jp_generic | vn_vcb | vn_mb
  -- ofx_v1 | ofx_v2 | qif

  metadata               jsonb   not null default '{}'::jsonb,
  created_at             timestamptz not null default now()
);

create index if not exists idx_bank_stmt_imports_job
  on bank_statement_imports(import_job_id);
create index if not exists idx_bank_stmt_imports_account
  on bank_statement_imports(financial_account_id) where financial_account_id is not null;

-- ─────────────────────────────────────────────
-- BANK STATEMENT ROWS
-- Individual entries from bank statement
-- ─────────────────────────────────────────────
create table if not exists bank_statement_rows (
  id                      uuid        primary key default gen_random_uuid(),
  bank_statement_import_id uuid       not null references bank_statement_imports(id) on delete cascade,
  import_row_id           uuid        references import_rows(id) on delete set null,

  -- Bank statement fields
  row_number              integer     not null,
  value_date              date,
  posting_date            date,
  description             text,
  reference_number        text,
  debit_amount            numeric(20,6),
  credit_amount           numeric(20,6),
  balance                 numeric(20,6),
  currency_code           char(3),

  -- Reconciliation
  is_reconciled           boolean     not null default false,
  reconciled_transaction_id uuid      references transactions_v3(id) on delete set null,

  metadata                jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists idx_bank_stmt_rows_import
  on bank_statement_rows(bank_statement_import_id);
create index if not exists idx_bank_stmt_rows_unreconciled
  on bank_statement_rows(is_reconciled) where not is_reconciled;

comment on table bank_statement_rows is
  'Individual bank statement entries. Supports Japanese banks (SMBC, MUFG, Rakuten Bank)
   and Vietnamese banks (Vietcombank, MB Bank).
   is_reconciled tracks if linked to transactions_v3 entry.';

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table import_jobs            enable row level security;
alter table import_batches         enable row level security;
alter table import_rows            enable row level security;
alter table import_matches         enable row level security;
alter table import_errors          enable row level security;
alter table bank_statement_imports enable row level security;
alter table bank_statement_rows    enable row level security;

-- Import jobs: ledger members
create policy "import_jobs_ledger_select"
  on import_jobs for select
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    )
  );

create policy "import_jobs_ledger_write"
  on import_jobs for all
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'accountant', 'operator')
    )
  );

-- Import rows: inherit from job
create policy "import_rows_select"
  on import_rows for select
  using (
    import_job_id in (
      select id from import_jobs where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- Import matches: inherit from row
create policy "import_matches_select"
  on import_matches for select
  using (
    import_row_id in (
      select id from import_rows where import_job_id in (
        select id from import_jobs where ledger_id in (
          select ledger_id from ledger_members where user_id = auth.uid()
        )
      )
    )
  );

-- Import errors: inherit from job
create policy "import_errors_select"
  on import_errors for select
  using (
    import_job_id in (
      select id from import_jobs where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- Bank statement: inherit from job
create policy "bank_statement_imports_select"
  on bank_statement_imports for select
  using (
    import_job_id in (
      select id from import_jobs where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

create policy "bank_statement_rows_select"
  on bank_statement_rows for select
  using (
    bank_statement_import_id in (
      select id from bank_statement_imports where import_job_id in (
        select id from import_jobs where ledger_id in (
          select ledger_id from ledger_members where user_id = auth.uid()
        )
      )
    )
  );

-- Triggers
create trigger import_jobs_updated_at
  before update on import_jobs
  for each row execute function update_updated_at_column();

create trigger import_rows_updated_at
  before update on import_rows
  for each row execute function update_updated_at_column();
