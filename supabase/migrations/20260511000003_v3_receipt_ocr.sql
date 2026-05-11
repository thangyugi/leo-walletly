/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 04
   Receipt OCR Architecture:
     receipt_documents   (uploaded receipt/invoice files)
     receipt_line_items  (individual items on receipt)
     receipt_ocr_jobs    (OCR processing job queue)
     receipt_ocr_results (raw OCR output storage)
   ============================================================
   Supports: Google Gemini Vision, future OCR engines
   Flow: Upload → OCR Job → Process → Line Items → Link to Transaction
   ============================================================ */

-- ─────────────────────────────────────────────
-- RECEIPT DOCUMENTS
-- Uploaded receipt/invoice files awaiting or having been OCR'd
-- ─────────────────────────────────────────────
create table if not exists receipt_documents (
  id                uuid        primary key default gen_random_uuid(),
  ledger_id         uuid        not null references ledgers(id) on delete cascade,
  organization_id   uuid        not null references organizations(id),

  uploaded_by       uuid,       -- auth.users id

  -- Extracted metadata (from OCR or manual entry)
  merchant_name     text,
  merchant_name_ja  text,
  merchant_name_vi  text,
  merchant_name_en  text,

  receipt_date      timestamptz,
  total_amount      numeric(20,6),
  tax_amount        numeric(20,6),
  tip_amount        numeric(20,6),
  currency_code     char(3)     default 'JPY',

  -- File storage
  storage_path      text        not null,
  file_name         text        not null,
  file_type         text        not null,   -- image/jpeg | image/png | application/pdf
  file_size_bytes   bigint,
  thumbnail_path    text,

  -- OCR state
  ocr_status        ocr_status  not null default 'pending',
  ocr_engine        text,                   -- gemini | tesseract | aws_textract
  ocr_confidence    numeric(5,2),           -- 0-100

  -- Linkage
  linked_transaction_id uuid    references transactions_v3(id) on delete set null,
  is_matched        boolean     not null default false,

  -- Language detected in receipt
  detected_language text,                   -- ja | en | vi | mixed

  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_receipt_docs_ledger
  on receipt_documents(ledger_id);
create index if not exists idx_receipt_docs_status
  on receipt_documents(ocr_status) where ocr_status != 'completed';
create index if not exists idx_receipt_docs_unmatched
  on receipt_documents(is_matched) where not is_matched;
create index if not exists idx_receipt_docs_date
  on receipt_documents(receipt_date desc) where receipt_date is not null;

comment on table receipt_documents is
  'Uploaded receipt/invoice files. ocr_status: pending|processing|completed|failed|review_required.
   Supports Japanese receipts (レシート), Vietnamese hóa đơn, English receipts.
   Linked to transactions_v3 after matching.';

-- ─────────────────────────────────────────────
-- RECEIPT LINE ITEMS
-- Individual items parsed from receipt
-- e.g. "コーヒー ¥580", "サンドイッチ ¥420"
-- ─────────────────────────────────────────────
create table if not exists receipt_line_items (
  id                      uuid        primary key default gen_random_uuid(),
  receipt_document_id     uuid        not null references receipt_documents(id) on delete cascade,
  transaction_id          uuid        references transactions_v3(id) on delete set null,
  transaction_split_id    uuid        references transaction_splits(id) on delete set null,

  line_number             integer     not null,

  -- Raw OCR output
  raw_text                text,
  raw_text_ja             text,
  raw_text_vi             text,
  raw_text_en             text,

  -- Normalized item details
  normalized_name         text,
  normalized_name_ja      text,
  normalized_name_vi      text,
  normalized_name_en      text,

  -- Quantities & pricing
  quantity                numeric(20,6),
  unit                    text,               -- 個 | pcs | kg | g | ml | 枚
  unit_price              numeric(20,6),
  discount_amount         numeric(20,6),
  tax_rate                numeric(5,4),       -- e.g. 0.10 = 10% Japanese consumption tax
  total_amount            numeric(20,6),

  currency_code           char(3)     default 'JPY',

  -- AI classification
  suggested_category_id   uuid        references categories(id) on delete set null,
  ai_confidence           numeric(5,2),

  -- Expense ownership suggestion
  expense_scope           text,
  -- personal | shared_household | childcare | business | reimbursable

  -- Review state
  is_reviewed             boolean     not null default false,
  is_accepted             boolean     not null default false,

  metadata                jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists idx_receipt_line_items_document
  on receipt_line_items(receipt_document_id);
create index if not exists idx_receipt_line_items_transaction
  on receipt_line_items(transaction_id) where transaction_id is not null;

comment on table receipt_line_items is
  'Individual line items extracted from receipt via OCR.
   Supports Japanese (税 10%, 消費税), Vietnamese (VAT 10%), English receipts.
   expense_scope: personal|shared_household|childcare|business|reimbursable';

-- ─────────────────────────────────────────────
-- RECEIPT OCR JOBS
-- Async job queue for OCR processing
-- ─────────────────────────────────────────────
create table if not exists receipt_ocr_jobs (
  id                    uuid        primary key default gen_random_uuid(),
  receipt_document_id   uuid        not null references receipt_documents(id) on delete cascade,

  status                ocr_status  not null default 'pending',
  ocr_engine            text        not null default 'gemini',
  -- gemini | tesseract | aws_textract | azure_vision | google_vision

  -- Processing metadata
  started_at            timestamptz,
  completed_at          timestamptz,
  processing_ms         integer,              -- duration in milliseconds

  -- Cost tracking
  tokens_used           integer,
  api_cost_usd          numeric(10,6),

  -- Error details
  error_code            text,
  error_message         text,
  retry_count           smallint    not null default 0,
  max_retries           smallint    not null default 3,

  -- Input parameters
  language_hint         text,                 -- ja | en | vi | auto
  enhance_mode          text        not null default 'standard',
  -- standard | high_quality | fast

  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_ocr_jobs_document
  on receipt_ocr_jobs(receipt_document_id);
create index if not exists idx_ocr_jobs_status
  on receipt_ocr_jobs(status) where status in ('pending', 'processing');

comment on table receipt_ocr_jobs is
  'Async OCR job queue. ocr_engine: gemini|tesseract|aws_textract|azure_vision|google_vision.
   language_hint: ja|en|vi|auto — important for Japanese receipt accuracy.';

-- ─────────────────────────────────────────────
-- RECEIPT OCR RESULTS
-- Raw OCR output for debugging and re-processing
-- ─────────────────────────────────────────────
create table if not exists receipt_ocr_results (
  id                    uuid        primary key default gen_random_uuid(),
  ocr_job_id            uuid        not null references receipt_ocr_jobs(id) on delete cascade,
  receipt_document_id   uuid        not null references receipt_documents(id) on delete cascade,

  -- Raw API response
  raw_response          jsonb       not null default '{}'::jsonb,

  -- Extracted structured data
  extracted_merchant    text,
  extracted_date        text,
  extracted_total       text,
  extracted_currency    text,
  extracted_items       jsonb       not null default '[]'::jsonb,
  extracted_taxes       jsonb       not null default '[]'::jsonb,

  -- Parsing metadata
  detected_language     text,
  parsing_version       text,               -- version of parsing logic used
  confidence_score      numeric(5,2),

  created_at            timestamptz not null default now()
);

create index if not exists idx_ocr_results_job
  on receipt_ocr_results(ocr_job_id);
create index if not exists idx_ocr_results_document
  on receipt_ocr_results(receipt_document_id);

comment on table receipt_ocr_results is
  'Raw OCR API output for audit trail and re-processing. Stores full Gemini/Vision API response.';

-- ─────────────────────────────────────────────
-- ADD FK from transactions_v3 → receipt_documents
-- (deferred because transactions_v3 was created before receipt_documents)
-- ─────────────────────────────────────────────
alter table transactions_v3
  add constraint fk_txn_v3_receipt_document
    foreign key (receipt_document_id)
    references receipt_documents(id)
    on delete set null;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table receipt_documents   enable row level security;
alter table receipt_line_items  enable row level security;
alter table receipt_ocr_jobs    enable row level security;
alter table receipt_ocr_results enable row level security;

-- Receipt documents: ledger members
create policy "receipt_documents_ledger_select"
  on receipt_documents for select
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    )
  );

create policy "receipt_documents_ledger_insert"
  on receipt_documents for insert
  with check (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    )
  );

create policy "receipt_documents_ledger_update"
  on receipt_documents for update
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'accountant', 'operator')
    )
  );

-- Receipt line items: inherit from document
create policy "receipt_line_items_select"
  on receipt_line_items for select
  using (
    receipt_document_id in (
      select id from receipt_documents where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- OCR jobs: inherit from document
create policy "receipt_ocr_jobs_select"
  on receipt_ocr_jobs for select
  using (
    receipt_document_id in (
      select id from receipt_documents where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- OCR results: inherit from document
create policy "receipt_ocr_results_select"
  on receipt_ocr_results for select
  using (
    receipt_document_id in (
      select id from receipt_documents where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- Updated_at trigger
create trigger receipt_documents_updated_at
  before update on receipt_documents
  for each row execute function update_updated_at_column();
