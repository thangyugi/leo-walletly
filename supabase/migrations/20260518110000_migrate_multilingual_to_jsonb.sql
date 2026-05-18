-- ────────────────────────────────────────────────────────────────────────────────
-- MIGRATION: EXTENSIBLE I18N JSONB CONVERSION & GIN INDEXING
-- Date: 2026-05-18
-- Author: Staff-Level Frontend Architect & FinTech SaaS UX Architect
-- Goal: Replace static multilingual columns with a single extensible JSONB column
--       indexed by GIN, backed by automatic synchronization triggers for
--       100% backward compatibility.
-- ────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. ADD `name_i18n` COLUMNS TO TARGET TABLES
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.chart_of_accounts 
  ADD COLUMN IF NOT EXISTS name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.payment_instruments 
  ADD COLUMN IF NOT EXISTS name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. MIGRATE EXISTING LANGUAGE DATA INTO JSONB OBJECTS
UPDATE public.categories 
SET name_i18n = jsonb_build_object(
  'en', COALESCE(name_en, ''),
  'vi', COALESCE(name_vi, ''),
  'ja', COALESCE(name_ja, '')
);

UPDATE public.chart_of_accounts 
SET name_i18n = jsonb_build_object(
  'en', COALESCE(account_name_en, ''),
  'vi', COALESCE(account_name_vi, ''),
  'ja', COALESCE(account_name_ja, '')
);

UPDATE public.payment_instruments 
SET name_i18n = jsonb_build_object(
  'en', COALESCE(name_en, name, ''),
  'vi', COALESCE(name_vi, name, ''),
  'ja', COALESCE(name_ja, name, '')
);

-- 3. CREATE GIN INDEXES FOR RAPID KEY-VALUE MULTILINGUAL LOOKUPS
CREATE INDEX IF NOT EXISTS idx_categories_name_i18n 
  ON public.categories USING gin (name_i18n);

CREATE INDEX IF NOT EXISTS idx_coa_name_i18n 
  ON public.chart_of_accounts USING gin (name_i18n);

CREATE INDEX IF NOT EXISTS idx_payment_instruments_name_i18n 
  ON public.payment_instruments USING gin (name_i18n);

COMMENT ON INDEX public.idx_categories_name_i18n IS 'Speeds up dynamic translation lookups on categories';
COMMENT ON INDEX public.idx_coa_name_i18n IS 'Speeds up chart of account tree localization filters';
COMMENT ON INDEX public.idx_payment_instruments_name_i18n IS 'Optimizes payment rail localization strings';

-- 4. CREATE COMPATIBILITY TRIGGERS FOR SEAMLESS 100% BACKWARD COMPATIBILITY
-- Triggers automatically synchronize legacy columns with the `name_i18n` column.

-- A. Categories Trigger
CREATE OR REPLACE FUNCTION public.sync_categories_i18n()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_i18n = jsonb_build_object(
    'en', COALESCE(NEW.name_en, ''),
    'vi', COALESCE(NEW.name_vi, ''),
    'ja', COALESCE(NEW.name_ja, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_categories_i18n ON public.categories;
CREATE TRIGGER trigger_categories_i18n
BEFORE INSERT OR UPDATE OF name_en, name_vi, name_ja ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.sync_categories_i18n();

-- B. Chart of Accounts Trigger
CREATE OR REPLACE FUNCTION public.sync_coa_i18n()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_i18n = jsonb_build_object(
    'en', COALESCE(NEW.account_name_en, ''),
    'vi', COALESCE(NEW.account_name_vi, ''),
    'ja', COALESCE(NEW.account_name_ja, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_coa_i18n ON public.chart_of_accounts;
CREATE TRIGGER trigger_coa_i18n
BEFORE INSERT OR UPDATE OF account_name_en, account_name_vi, account_name_ja ON public.chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION public.sync_coa_i18n();

-- C. Payment Instruments Trigger
CREATE OR REPLACE FUNCTION public.sync_payment_instruments_i18n()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_i18n = jsonb_build_object(
    'en', COALESCE(NEW.name_en, NEW.name, ''),
    'vi', COALESCE(NEW.name_vi, NEW.name, ''),
    'ja', COALESCE(NEW.name_ja, NEW.name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_instruments_i18n ON public.payment_instruments;
CREATE TRIGGER trigger_payment_instruments_i18n
BEFORE INSERT OR UPDATE OF name_en, name_vi, name_ja, name ON public.payment_instruments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_instruments_i18n();

COMMIT;
