-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: categories v2 — direct columns + category_balances view
-- Removes reliance on metadata JSONB for budget_limit, keywords,
-- is_shared, is_recurring. Adds category_balances view. Fixes category_code
-- column to support longer generated codes (VARCHAR(4) → VARCHAR(24)).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Alter category_code to support new longer codes (e.g. MSDCCP01, MS000001)
ALTER TABLE categories ALTER COLUMN category_code TYPE VARCHAR(24);

-- 2. Add budget_limit as a proper numeric column
ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_limit NUMERIC(20,6) NOT NULL DEFAULT 0;

-- 3. Add keywords as a native TEXT array column
ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';

-- 4. Add is_shared flag (was metadata.is_shared)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Add is_recurring flag (was metadata.is_recurring)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

-- 6. Migrate existing data from metadata to new columns (safe — only touches rows
--    that have the key set, leaves others at default 0 / {} / false)
UPDATE categories
SET
  budget_limit = COALESCE((metadata->>'budget_limit')::NUMERIC, 0)
WHERE metadata ? 'budget_limit'
  AND (metadata->>'budget_limit') IS NOT NULL
  AND (metadata->>'budget_limit') != '';

UPDATE categories
SET
  keywords = ARRAY(SELECT jsonb_array_elements_text(metadata->'keywords'))
WHERE metadata ? 'keywords'
  AND jsonb_typeof(metadata->'keywords') = 'array';

UPDATE categories
SET
  is_shared = (metadata->>'is_shared')::BOOLEAN
WHERE metadata ? 'is_shared'
  AND (metadata->>'is_shared') IN ('true', 'false');

UPDATE categories
SET
  is_recurring = (metadata->>'is_recurring')::BOOLEAN
WHERE metadata ? 'is_recurring'
  AND (metadata->>'is_recurring') IN ('true', 'false');

-- 7. Add GIN index for fast keyword array contains searches
CREATE INDEX IF NOT EXISTS idx_categories_keywords ON categories USING GIN(keywords);

-- 8. Index for budget-related queries
CREATE INDEX IF NOT EXISTS idx_categories_budget ON categories(workspace_id, budget_limit)
  WHERE budget_limit > 0;

-- 9. Indexes for is_shared / is_recurring filters
CREATE INDEX IF NOT EXISTS idx_categories_shared    ON categories(workspace_id, is_shared)    WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_recurring ON categories(workspace_id, is_recurring) WHERE is_recurring = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Create category_balances view
--     Aggregates transactions per category per ledger for the current and
--     previous month. Downstream code filters by ledger_id after select.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW category_balances AS
SELECT
  c.id                                                          AS group_id,
  c.name_en                                                     AS name,
  t.ledger_id,
  date_trunc('month', t.transaction_date::TIMESTAMPTZ)          AS month,
  SUM(CASE WHEN t.transaction_type = 'income'   THEN t.amount ELSE 0 END)  AS total_income,
  SUM(CASE WHEN t.transaction_type = 'expense'  THEN t.amount ELSE 0 END)  AS total_expense,
  SUM(CASE
    WHEN t.transaction_type = 'income'  THEN  t.amount
    WHEN t.transaction_type = 'expense' THEN -t.amount
    ELSE 0
  END)                                                          AS net_balance,
  COUNT(t.id)                                                   AS transaction_count
FROM categories c
JOIN transactions t ON t.category_id = c.id
WHERE t.deleted_at IS NULL
GROUP BY c.id, c.name_en, t.ledger_id, date_trunc('month', t.transaction_date::TIMESTAMPTZ);

COMMENT ON VIEW category_balances IS
  'Pre-aggregated balances per category per ledger per month.
   Filter by ledger_id and month in application queries.';
