-- F. Import pipeline and receipts (documents + OCR line items).

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  account_id uuid not null references public.financial_accounts (id),
  provider_code varchar(30) not null references public.providers (code),
  file_name varchar(255) not null,
  file_type varchar(10) not null check (file_type in ('csv', 'pdf')),
  file_path text,
  file_size integer check (file_size is null or file_size >= 0),
  checksum char(64) not null,
  status varchar(20) not null default 'parsed' check (status in ('parsed', 'importing', 'completed', 'failed', 'cancelled')),
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_rows integer not null default 0,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create index idx_import_jobs_ledger on public.import_jobs (ledger_id, created_at desc);
create index idx_import_jobs_checksum on public.import_jobs (ledger_id, checksum);
create trigger trg_import_jobs_touch before update on public.import_jobs
  for each row execute function public.tg_touch_audit();

create table public.import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid references public.import_jobs (id) on delete cascade,
  account_id uuid references public.financial_accounts (id) on delete cascade,
  target_field varchar(20) not null check (target_field in ('date', 'time', 'description', 'amount', 'debit', 'credit', 'currency', 'reference')),
  source_column varchar(100) not null,
  source_index smallint,
  date_format varchar(20),
  created_at timestamptz not null default now(),
  constraint import_column_mappings_one_owner check ((import_job_id is null) <> (account_id is null)),
  constraint import_column_mappings_job_field unique (import_job_id, target_field),
  constraint import_column_mappings_account_field unique (account_id, target_field)
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  row_number integer not null,
  raw_line text,
  parsed_date date,
  parsed_amount numeric(20, 4) check (parsed_amount is null or parsed_amount >= 0),
  parsed_type varchar(20) check (parsed_type in ('expense', 'income', 'transfer')),
  parsed_description text,
  suggested_category_id uuid references public.categories (id) on delete set null,
  status varchar(20) not null default 'new' check (status in ('new', 'duplicate', 'error', 'skipped', 'imported')),
  duplicate_of_id uuid references public.transactions (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint import_rows_unique unique (import_job_id, row_number)
);

create table public.import_row_values (
  import_row_id uuid not null references public.import_rows (id) on delete cascade,
  column_index smallint not null,
  column_name varchar(100) not null,
  value text,
  primary key (import_row_id, column_index)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  document_type varchar(20) not null default 'receipt' check (document_type in ('receipt', 'invoice', 'statement', 'other')),
  storage_path text not null,
  file_name varchar(255) not null,
  mime_type varchar(50) not null,
  file_size integer not null check (file_size between 0 and 10485760),
  ocr_status varchar(20) not null default 'pending' check (ocr_status in ('pending', 'processing', 'done', 'failed')),
  ocr_provider varchar(30),
  ocr_model varchar(50),
  ocr_raw_text text,
  extracted_merchant varchar(200),
  extracted_date date,
  extracted_total numeric(20, 4),
  extracted_tax numeric(20, 4),
  extracted_currency char(3) references public.currencies (code),
  suggested_category_id uuid references public.categories (id) on delete set null,
  confidence numeric(4, 3) check (confidence is null or confidence between 0 and 1),
  error_message text,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  version integer not null default 1
);
create index idx_documents_ledger on public.documents (ledger_id, created_at desc);
create trigger trg_documents_touch before update on public.documents
  for each row execute function public.tg_touch_audit();

create table public.document_line_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  line_number smallint not null,
  name varchar(200) not null,
  quantity numeric(10, 3) not null default 1,
  unit_price numeric(20, 4),
  amount numeric(20, 4) not null,
  tax_rate numeric(5, 2),
  category_id uuid references public.categories (id) on delete set null,
  constraint document_line_items_unique unique (document_id, line_number)
);

alter table public.transactions
  add constraint transactions_import_job_fkey foreign key (import_job_id) references public.import_jobs (id) on delete set null,
  add constraint transactions_import_row_fkey foreign key (import_row_id) references public.import_rows (id) on delete set null,
  add constraint transactions_document_fkey foreign key (document_id) references public.documents (id) on delete set null;
