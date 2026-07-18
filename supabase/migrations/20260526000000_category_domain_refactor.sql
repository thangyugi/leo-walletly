-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Category Domain Refactor
-- Addresses:
-- 1. Multi-ledger budget mapping via category_budgets
-- 2. Drop redundant icon & is_recurring columns
-- 3. Budget Roll-up validation trigger
-- 4. merge_categories function
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Create category_budgets table
CREATE TABLE IF NOT EXISTS public.category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  ledger_id uuid NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
  amount numeric(20,6) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, ledger_id)
);

-- RLS for category_budgets
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets in their ledgers"
  ON public.category_budgets FOR SELECT
  USING (
    ledger_id IN (
      SELECT ledger_id FROM public.ledger_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage budgets in their ledgers"
  ON public.category_budgets FOR ALL
  USING (
    ledger_id IN (
      SELECT ledger_id FROM public.ledger_members WHERE user_id = auth.uid()
    )
  );

-- 2. Migrate existing data
INSERT INTO public.category_budgets (category_id, ledger_id, amount, currency)
SELECT
  c.id,
  l.id,
  c.budget_limit,
  l.currency
FROM public.categories c
JOIN public.ledgers l ON l.workspace_id = c.workspace_id
WHERE c.budget_limit > 0
ON CONFLICT DO NOTHING;

-- 3. Drop columns from categories
ALTER TABLE public.categories DROP COLUMN IF EXISTS icon;
ALTER TABLE public.categories DROP COLUMN IF EXISTS is_recurring;

-- Drop budget_limit (and dependencies if any)
DROP VIEW IF EXISTS public.category_balances;
ALTER TABLE public.categories DROP COLUMN IF EXISTS budget_limit;

-- Recreate category_balances view without budget_limit (since budget is now per ledger)
CREATE OR REPLACE VIEW public.category_balances AS
SELECT
  c.id                                                          AS group_id,
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
FROM public.categories c
JOIN public.transactions t ON t.category_id = c.id
WHERE t.deleted_at IS NULL
GROUP BY c.id, t.ledger_id, date_trunc('month', t.transaction_date::TIMESTAMPTZ);

-- 4. Budget Roll-up Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_category_budget_rollup()
RETURNS trigger AS $$
DECLARE
  v_parent_id uuid;
  v_parent_budget numeric(20,6);
  v_children_sum numeric(20,6);
BEGIN
  -- Find parent_id
  SELECT parent_id INTO v_parent_id
  FROM public.categories
  WHERE id = NEW.category_id;

  -- If it has a parent, validate against parent
  IF v_parent_id IS NOT NULL THEN
    -- Get parent budget
    SELECT amount INTO v_parent_budget
    FROM public.category_budgets
    WHERE category_id = v_parent_id AND ledger_id = NEW.ledger_id;

    -- If parent has a budget > 0, validate
    IF v_parent_budget IS NOT NULL AND v_parent_budget > 0 THEN
      -- Calculate sum of all children's budgets (including this new/updated one)
      SELECT COALESCE(SUM(cb.amount), 0) INTO v_children_sum
      FROM public.category_budgets cb
      JOIN public.categories c ON c.id = cb.category_id
      WHERE c.parent_id = v_parent_id
        AND cb.ledger_id = NEW.ledger_id
        AND cb.category_id != NEW.category_id; -- exclude the one being updated to add NEW.amount

      v_children_sum := v_children_sum + NEW.amount;

      IF v_children_sum > v_parent_budget THEN
        RAISE EXCEPTION 'Total child budgets (%) exceed parent budget (%)', v_children_sum, v_parent_budget;
      END IF;
    END IF;
  END IF;

  -- Also need to validate if this is a parent being updated to a lower amount!
  -- Find if this category has children with budgets
  SELECT COALESCE(SUM(cb.amount), 0) INTO v_children_sum
  FROM public.category_budgets cb
  JOIN public.categories c ON c.id = cb.category_id
  WHERE c.parent_id = NEW.category_id
    AND cb.ledger_id = NEW.ledger_id;

  IF v_children_sum > 0 AND NEW.amount > 0 AND v_children_sum > NEW.amount THEN
     RAISE EXCEPTION 'Cannot reduce parent budget (%) below the sum of child budgets (%)', NEW.amount, v_children_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_category_budget_rollup
BEFORE INSERT OR UPDATE ON public.category_budgets
FOR EACH ROW
EXECUTE FUNCTION public.validate_category_budget_rollup();

-- 5. Merge Categories Function
CREATE OR REPLACE FUNCTION public.merge_categories(p_source_id uuid, p_target_id uuid)
RETURNS void AS $$
DECLARE
  v_source_workspace_id uuid;
  v_target_workspace_id uuid;
BEGIN
  -- Verify both categories exist and belong to the same workspace
  SELECT workspace_id INTO v_source_workspace_id FROM public.categories WHERE id = p_source_id;
  SELECT workspace_id INTO v_target_workspace_id FROM public.categories WHERE id = p_target_id;

  IF v_source_workspace_id IS NULL OR v_target_workspace_id IS NULL THEN
    RAISE EXCEPTION 'One or both categories do not exist';
  END IF;

  IF v_source_workspace_id != v_target_workspace_id THEN
    RAISE EXCEPTION 'Cannot merge categories from different workspaces';
  END IF;

  -- Update transactions
  UPDATE public.transactions SET category_id = p_target_id WHERE category_id = p_source_id;
  -- Update transaction_splits
  UPDATE public.transaction_splits SET category_id = p_target_id WHERE category_id = p_source_id;
  -- Update receipt_line_items
  UPDATE public.receipt_line_items SET suggested_category_id = p_target_id WHERE suggested_category_id = p_source_id;
  -- Update import_rows
  UPDATE public.import_rows SET suggested_category_id = p_target_id WHERE suggested_category_id = p_source_id;
  -- Update category_rules
  UPDATE public.category_rules SET category_id = p_target_id WHERE category_id = p_source_id;
  
  -- Reassign child categories
  UPDATE public.categories SET parent_id = p_target_id WHERE parent_id = p_source_id;

  -- Delete source category (category_budgets and category_translations will cascade delete)
  DELETE FROM public.categories WHERE id = p_source_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
