/* ============================================================
   ENTERPRISE FINTECH DATABASE V3 — MIGRATION 06
   Double-Entry Accounting & Reconciliation:
     journal_entries         (double-entry accounting records)
     journal_lines           (debit/credit lines per entry)
     reconciliation_sessions (one reconciliation exercise)
     reconciliation_items    (matched pairs in reconciliation)
   ============================================================
   Double-Entry Rules:
     - NEVER update posted journals
     - Only: reversal_entry + correcting_entry
     - Every journal must balance: sum(debits) = sum(credits)

   Example — Starbucks via Rakuten Pay:
     Business Event: Coffee purchase ¥680
     Payment Rail:   Rakuten Pay
     Funding Source: Rakuten Credit Card
     Journal:
       Debit  Coffee Expense        ¥680
       Credit Credit Card Liability ¥680
   ============================================================ */

-- ─────────────────────────────────────────────
-- JOURNAL ENTRIES
-- Double-entry accounting records (immutable once posted)
-- ─────────────────────────────────────────────
create table if not exists journal_entries (
  id                    uuid              primary key default gen_random_uuid(),
  ledger_id             uuid              not null references ledgers(id) on delete restrict,
  workspace_id          uuid              not null references workspaces(id) on delete restrict,
  accounting_period_id  uuid              references accounting_periods(id) on delete restrict,

  -- Entry type
  entry_type            journal_entry_type not null default 'standard',

  -- Reference to business event
  transaction_id        uuid              references transactions_v3(id) on delete restrict,

  -- Reversal linkage
  reversed_by_entry_id  uuid              references journal_entries(id),
  reverses_entry_id     uuid              references journal_entries(id),

  -- Entry metadata
  reference_number      text,             -- e.g. "JE-2026-001234"
  description           text,
  description_ja        text,
  description_vi        text,
  description_en        text,

  entry_date            date              not null,
  posting_date          date,

  -- Status: draft → approved → posted (immutable after posted)
  status                text              not null default 'draft',
  -- draft | approved | posted | voided

  -- Amounts for quick validation
  total_debit           numeric(20,6)     not null default 0,
  total_credit          numeric(20,6)     not null default 0,

  currency_code         char(3)           not null,

  -- Approval workflow
  prepared_by           uuid,
  approved_by           uuid,
  approved_at           timestamptz,
  posted_by             uuid,
  posted_at             timestamptz,

  -- Audit immutability marker
  is_locked             boolean           not null default false,

  metadata              jsonb             not null default '{}'::jsonb,
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz       not null default now()
);

create index if not exists idx_journal_entries_ledger
  on journal_entries(ledger_id, entry_date desc);
create index if not exists idx_journal_entries_period
  on journal_entries(accounting_period_id) where accounting_period_id is not null;
create index if not exists idx_journal_entries_transaction
  on journal_entries(transaction_id) where transaction_id is not null;
create index if not exists idx_journal_entries_status
  on journal_entries(status) where status != 'posted';
create index if not exists idx_journal_entries_reversal
  on journal_entries(reverses_entry_id) where reverses_entry_id is not null;

comment on table journal_entries is
  'Double-entry accounting records. Immutable after status=posted.
   entry_type: standard|opening|closing|reversal|correcting|adjustment.
   NEVER UPDATE posted entries. Create reversal_entry + correcting_entry instead.
   total_debit must equal total_credit for valid entry.';

-- Prevent updates to posted journal entries
create or replace function prevent_posted_journal_update()
returns trigger language plpgsql as $$
begin
  if old.status = 'posted' and old.is_locked then
    raise exception 'Cannot modify posted journal entry %. Create a reversal entry instead.', old.id
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger journal_entries_immutability
  before update on journal_entries
  for each row execute function prevent_posted_journal_update();

-- ─────────────────────────────────────────────
-- JOURNAL LINES
-- Individual debit/credit lines for double-entry
-- ─────────────────────────────────────────────
create table if not exists journal_lines (
  id                    uuid        primary key default gen_random_uuid(),
  journal_entry_id      uuid        not null references journal_entries(id) on delete cascade,
  chart_of_account_id   uuid        not null references chart_of_accounts(id) on delete restrict,

  -- Debit or Credit
  side                  text        not null,    -- debit | credit

  amount                numeric(20,6) not null check (amount > 0),
  currency_code         char(3)     not null,

  -- Base currency equivalent
  base_amount           numeric(20,6),
  base_currency_code    char(3),
  exchange_rate         numeric(20,10),

  -- Optional dimension linkage for analytics
  household_member_id   uuid        references household_members(id) on delete set null,
  expense_scope         text,
  -- personal | shared_household | childcare | business | reimbursable

  -- Line description
  description           text,
  description_ja        text,
  description_vi        text,
  description_en        text,

  -- Line ordering
  line_number           smallint    not null default 1,

  metadata              jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_journal_lines_entry
  on journal_lines(journal_entry_id);
create index if not exists idx_journal_lines_account
  on journal_lines(chart_of_account_id);
create index if not exists idx_journal_lines_member
  on journal_lines(household_member_id) where household_member_id is not null;

comment on table journal_lines is
  'Debit/credit lines for double-entry. side: debit|credit. Amount always positive.
   Example: Starbucks ¥680 via Rakuten Pay:
     LINE 1: debit  chart_account(Coffee Expense)        ¥680
     LINE 2: credit chart_account(Credit Card Liability) ¥680';

-- Validate journal entry balance on post
create or replace function validate_journal_balance()
returns trigger language plpgsql as $$
declare
  v_debit  numeric(20,6);
  v_credit numeric(20,6);
begin
  if new.status = 'posted' and old.status != 'posted' then
    select
      coalesce(sum(amount) filter (where side = 'debit'), 0),
      coalesce(sum(amount) filter (where side = 'credit'), 0)
    into v_debit, v_credit
    from journal_lines
    where journal_entry_id = new.id;

    if abs(v_debit - v_credit) > 0.000001 then
      raise exception 'Journal entry % is unbalanced: debit=% credit=%', new.id, v_debit, v_credit
        using errcode = 'P0002';
    end if;

    new.total_debit  := v_debit;
    new.total_credit := v_credit;
    new.is_locked    := true;
    new.posted_at    := now();
  end if;
  return new;
end;
$$;

create trigger journal_entries_balance_check
  before update on journal_entries
  for each row execute function validate_journal_balance();

-- ─────────────────────────────────────────────
-- EXCHANGE RATES
-- Currency exchange rates for multi-currency ledgers
-- ─────────────────────────────────────────────
create table if not exists exchange_rates (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id      uuid        not null references workspaces(id) on delete cascade,
  from_currency     char(3)     not null,
  to_currency       char(3)     not null,
  rate              numeric(20,10) not null check (rate > 0),
  rate_date         date        not null,
  source            text        not null default 'manual',
  -- boj | ecb | fed | xe | manual | bank_provider | wise
  is_official       boolean     not null default false,
  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create unique index if not exists idx_exchange_rates_unique
  on exchange_rates(workspace_id, from_currency, to_currency, rate_date, source);
create index if not exists idx_exchange_rates_pair_date
  on exchange_rates(from_currency, to_currency, rate_date desc);

comment on table exchange_rates is
  'Currency exchange rates. source: boj|ecb|fed|xe|manual|bank_provider|wise.
   Critical for JPY↔VND, JPY↔USD conversions in multi-currency households.';

-- ─────────────────────────────────────────────
-- RECONCILIATION SESSIONS
-- One reconciliation exercise (e.g. monthly bank statement check)
-- ─────────────────────────────────────────────
create table if not exists reconciliation_sessions (
  id                      uuid                    primary key default gen_random_uuid(),
  ledger_id               uuid                    not null references ledgers(id) on delete cascade,
  financial_account_id    uuid                    not null references financial_accounts(id) on delete cascade,
  accounting_period_id    uuid                    references accounting_periods(id) on delete set null,

  -- Session details
  session_name            text,                   -- e.g. "SMBC 2026-04 Reconciliation"
  session_type            text                    not null default 'bank_statement',
  -- bank_statement | credit_card | e_wallet | inter_account | payment_rail

  status                  reconciliation_status   not null default 'open',

  -- Balances
  statement_opening_balance numeric(20,6),
  statement_closing_balance numeric(20,6),
  statement_currency      char(3),
  statement_date          date,

  book_opening_balance    numeric(20,6),
  book_closing_balance    numeric(20,6),

  -- Difference after matching
  unreconciled_amount     numeric(20,6) generated always as
    (coalesce(statement_closing_balance, 0) - coalesce(book_closing_balance, 0)) stored,

  -- Linked bank statement
  bank_statement_import_id uuid                   references bank_statement_imports(id) on delete set null,

  -- Timing & actors
  started_by              uuid,
  started_at              timestamptz,
  completed_by            uuid,
  completed_at            timestamptz,

  notes                   text,
  metadata                jsonb                   not null default '{}'::jsonb,
  created_at              timestamptz             not null default now(),
  updated_at              timestamptz             not null default now()
);

create index if not exists idx_recon_sessions_ledger
  on reconciliation_sessions(ledger_id, created_at desc);
create index if not exists idx_recon_sessions_account
  on reconciliation_sessions(financial_account_id);
create index if not exists idx_recon_sessions_status
  on reconciliation_sessions(status) where status in ('open', 'in_progress');

comment on table reconciliation_sessions is
  'One reconciliation exercise. session_type: bank_statement|credit_card|e_wallet|inter_account|payment_rail.
   Critical for: Rakuten Pay ↔ Rakuten Card statement matching (prevent double counting).
   status: open|in_progress|completed|cancelled';

-- ─────────────────────────────────────────────
-- RECONCILIATION ITEMS
-- Individual matched/unmatched items in a reconciliation
-- ─────────────────────────────────────────────
create table if not exists reconciliation_items (
  id                          uuid        primary key default gen_random_uuid(),
  reconciliation_session_id   uuid        not null references reconciliation_sessions(id) on delete cascade,
  transaction_id              uuid        references transactions_v3(id) on delete set null,
  bank_statement_row_id       uuid        references bank_statement_rows(id) on delete set null,
  import_match_id             uuid        references import_matches(id) on delete set null,

  -- Match result
  match_type                  text        not null,
  -- matched          : transaction ↔ bank statement entry aligned
  -- unmatched_book   : in ledger but not in bank statement
  -- unmatched_statement : in bank statement but not in ledger
  -- timing_difference : amounts match but dates differ (float)
  -- amount_difference : amounts don't match exactly

  match_confidence            numeric(5,2) not null default 100,

  -- Amounts for comparison
  book_amount                 numeric(20,6),
  statement_amount            numeric(20,6),
  difference_amount           numeric(20,6) generated always as
    (coalesce(book_amount, 0) - coalesce(statement_amount, 0)) stored,

  currency_code               char(3),

  -- Human review
  is_cleared                  boolean     not null default false,
  cleared_by                  uuid,
  cleared_at                  timestamptz,
  clearing_note               text,

  metadata                    jsonb       not null default '{}'::jsonb,
  created_at                  timestamptz not null default now()
);

create index if not exists idx_recon_items_session
  on reconciliation_items(reconciliation_session_id);
create index if not exists idx_recon_items_transaction
  on reconciliation_items(transaction_id) where transaction_id is not null;
create index if not exists idx_recon_items_uncleared
  on reconciliation_items(is_cleared) where not is_cleared;
create index if not exists idx_recon_items_match_type
  on reconciliation_items(match_type);

comment on table reconciliation_items is
  'Individual items in a reconciliation session.
   match_type: matched|unmatched_book|unmatched_statement|timing_difference|amount_difference.
   Example: Rakuten Pay Starbucks ¥680 → matched to Rakuten Card statement ¥680.
   difference_amount (computed) = book_amount - statement_amount.';

-- ─────────────────────────────────────────────
-- APPROVAL WORKFLOWS
-- Multi-step approval for transactions or journal entries
-- ─────────────────────────────────────────────
create table if not exists approval_workflows (
  id                uuid            primary key default gen_random_uuid(),
  workspace_id      uuid            not null references workspaces(id) on delete cascade,
  ledger_id         uuid            references ledgers(id) on delete set null,

  -- What is being approved
  entity_type       text            not null,  -- transaction | journal_entry | import_job
  entity_id         uuid            not null,

  -- Workflow definition
  workflow_name     text,
  workflow_name_ja  text,
  workflow_name_vi  text,
  workflow_name_en  text,
  current_step      smallint        not null default 1,
  total_steps       smallint        not null default 1,

  status            approval_status not null default 'pending',

  -- Current reviewer
  assigned_to       uuid,
  due_at            timestamptz,

  -- Decision
  decided_by        uuid,
  decided_at        timestamptz,
  decision_note     text,

  -- Amount threshold that triggered this workflow
  trigger_amount    numeric(20,6),
  trigger_currency  char(3),

  metadata          jsonb           not null default '{}'::jsonb,
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now()
);

create index if not exists idx_approval_workflows_entity
  on approval_workflows(entity_type, entity_id);
create index if not exists idx_approval_workflows_pending
  on approval_workflows(status) where status = 'pending';
create index if not exists idx_approval_workflows_assignee
  on approval_workflows(assigned_to) where status = 'pending';

comment on table approval_workflows is
  'Multi-step approval: transaction|journal_entry|import_job.
   status: pending|approved|rejected|cancelled|escalated.';

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table journal_entries          enable row level security;
alter table journal_lines            enable row level security;
alter table exchange_rates           enable row level security;
alter table reconciliation_sessions  enable row level security;
alter table reconciliation_items     enable row level security;
alter table approval_workflows       enable row level security;

-- Journal entries: ledger members
create policy "journal_entries_ledger_select"
  on journal_entries for select
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    )
  );

create policy "journal_entries_accountant_write"
  on journal_entries for all
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'accountant')
    )
  );

-- Journal lines: inherit from entry
create policy "journal_lines_select"
  on journal_lines for select
  using (
    journal_entry_id in (
      select id from journal_entries where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- Exchange rates: workspace members
create policy "exchange_rates_workspace_select"
  on exchange_rates for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
  );

-- Reconciliation sessions: ledger members
create policy "reconciliation_sessions_select"
  on reconciliation_sessions for select
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid()
    )
  );

create policy "reconciliation_sessions_write"
  on reconciliation_sessions for all
  using (
    ledger_id in (
      select ledger_id from ledger_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'accountant')
    )
  );

-- Reconciliation items: inherit from session
create policy "reconciliation_items_select"
  on reconciliation_items for select
  using (
    reconciliation_session_id in (
      select id from reconciliation_sessions where ledger_id in (
        select ledger_id from ledger_members where user_id = auth.uid()
      )
    )
  );

-- Approval workflows: workspace members
create policy "approval_workflows_select"
  on approval_workflows for select
  using (
    workspace_id in (
      select workspace_id from ledger_members lm
      join ledgers l on l.id = lm.ledger_id
      where lm.user_id = auth.uid()
    )
  );

-- Triggers
create trigger journal_entries_updated_at
  before update on journal_entries
  for each row execute function update_updated_at_column();

create trigger reconciliation_sessions_updated_at
  before update on reconciliation_sessions
  for each row execute function update_updated_at_column();
