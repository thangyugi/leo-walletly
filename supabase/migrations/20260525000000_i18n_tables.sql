-- ────────────────────────────────────────────────────────────────────────────────
-- MIGRATION: DATABASE-DRIVEN I18N
-- Goal: Create `ui_translations` and 15 domain `[entity]_translations` tables.
-- ────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. UI Translations Table
CREATE TABLE IF NOT EXISTS public.ui_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    locale TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key, locale)
);
CREATE INDEX IF NOT EXISTS idx_ui_translations_locale ON public.ui_translations(locale);

-- 2. Domain Translation Tables
-- 2.1 chart_of_accounts
CREATE TABLE IF NOT EXISTS public.chart_of_accounts_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    account_name TEXT NOT NULL,
    description TEXT,
    UNIQUE(account_id, locale)
);

-- 2.2 categories
CREATE TABLE IF NOT EXISTS public.category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    UNIQUE(category_id, locale)
);

-- 2.3 payment_instruments
CREATE TABLE IF NOT EXISTS public.payment_instrument_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID REFERENCES public.payment_instruments(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(instrument_id, locale)
);

-- 2.4 tags
CREATE TABLE IF NOT EXISTS public.tag_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(tag_id, locale)
);

-- 2.5 settlement_profiles
CREATE TABLE IF NOT EXISTS public.settlement_profile_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.settlement_profiles(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    profile_name TEXT NOT NULL,
    UNIQUE(profile_id, locale)
);

-- 2.6 funding_sources
CREATE TABLE IF NOT EXISTS public.funding_source_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.funding_sources(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(source_id, locale)
);

-- 2.7 dimensions
CREATE TABLE IF NOT EXISTS public.dimension_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id UUID REFERENCES public.dimensions(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(dimension_id, locale)
);

-- 2.8 dimension_values
CREATE TABLE IF NOT EXISTS public.dimension_value_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value_id UUID REFERENCES public.dimension_values(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(value_id, locale)
);

-- 2.9 receipt_line_items
CREATE TABLE IF NOT EXISTS public.receipt_line_item_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.receipt_line_items(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(item_id, locale)
);

-- 2.10 journal_entries
CREATE TABLE IF NOT EXISTS public.journal_entry_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(entry_id, locale)
);

-- 2.11 journal_lines
CREATE TABLE IF NOT EXISTS public.journal_line_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID REFERENCES public.journal_lines(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(line_id, locale)
);

-- 2.12 category_rules
CREATE TABLE IF NOT EXISTS public.category_rule_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.category_rules(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(rule_id, locale)
);

-- 2.13 approval_workflows
CREATE TABLE IF NOT EXISTS public.approval_workflow_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(workflow_id, locale)
);

-- 2.14 activity_logs
CREATE TABLE IF NOT EXISTS public.activity_log_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.activity_logs(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    action_name TEXT NOT NULL,
    description TEXT,
    UNIQUE(log_id, locale)
);

-- 2.15 audit_logs
CREATE TABLE IF NOT EXISTS public.audit_log_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.audit_logs(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    action_name TEXT NOT NULL,
    description TEXT,
    UNIQUE(log_id, locale)
);

-- 3. Data Migration from JSONB (name_i18n) and dropping columns
-- We use a DO block to safely handle columns that might or might not exist across all 15 tables
DO $$
DECLARE
    r RECORD;
BEGIN
    -- For categories
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='name_i18n') THEN
        INSERT INTO public.category_translations (category_id, locale, name)
        SELECT id, key, value FROM public.categories, jsonb_each_text(name_i18n) WHERE value <> '';
    END IF;
    
    -- For chart_of_accounts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chart_of_accounts' AND column_name='name_i18n') THEN
        INSERT INTO public.chart_of_accounts_translations (account_id, locale, account_name)
        SELECT id, key, value FROM public.chart_of_accounts, jsonb_each_text(name_i18n) WHERE value <> '';
    END IF;

    -- For payment_instruments
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_instruments' AND column_name='name_i18n') THEN
        INSERT INTO public.payment_instrument_translations (instrument_id, locale, name)
        SELECT id, key, value FROM public.payment_instruments, jsonb_each_text(name_i18n) WHERE value <> '';
    END IF;
END $$;

-- 4. Cleanup old columns & triggers
-- Drop view that depends on name_en before dropping the column
DROP VIEW IF EXISTS public.category_balances CASCADE;
DROP VIEW IF EXISTS public.group_balances CASCADE;

-- Categories
DROP TRIGGER IF EXISTS trigger_categories_i18n ON public.categories;
DROP FUNCTION IF EXISTS public.sync_categories_i18n();
ALTER TABLE public.categories DROP COLUMN IF EXISTS name_ja, DROP COLUMN IF EXISTS name_vi, DROP COLUMN IF EXISTS name_en, DROP COLUMN IF EXISTS name_i18n;

-- Chart of accounts
DROP TRIGGER IF EXISTS trigger_coa_i18n ON public.chart_of_accounts;
DROP FUNCTION IF EXISTS public.sync_coa_i18n();
ALTER TABLE public.chart_of_accounts DROP COLUMN IF EXISTS account_name_ja, DROP COLUMN IF EXISTS account_name_vi, DROP COLUMN IF EXISTS account_name_en, DROP COLUMN IF EXISTS name_i18n;

-- Payment instruments
DROP TRIGGER IF EXISTS trigger_payment_instruments_i18n ON public.payment_instruments;
DROP FUNCTION IF EXISTS public.sync_payment_instruments_i18n();
ALTER TABLE public.payment_instruments DROP COLUMN IF EXISTS name_ja, DROP COLUMN IF EXISTS name_vi, DROP COLUMN IF EXISTS name_en, DROP COLUMN IF EXISTS name_i18n;

-- Drop from remaining tables (tags, settlement_profiles, etc) if they exist
ALTER TABLE public.tags DROP COLUMN IF EXISTS name_ja, DROP COLUMN IF EXISTS name_vi, DROP COLUMN IF EXISTS name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.settlement_profiles DROP COLUMN IF EXISTS profile_name_ja, DROP COLUMN IF EXISTS profile_name_vi, DROP COLUMN IF EXISTS profile_name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.funding_sources DROP COLUMN IF EXISTS name_ja, DROP COLUMN IF EXISTS name_vi, DROP COLUMN IF EXISTS name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.dimensions DROP COLUMN IF EXISTS name_ja, DROP COLUMN IF EXISTS name_vi, DROP COLUMN IF EXISTS name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.dimension_values DROP COLUMN IF EXISTS name_ja, DROP COLUMN IF EXISTS name_vi, DROP COLUMN IF EXISTS name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.receipt_line_items DROP COLUMN IF EXISTS normalized_name_ja, DROP COLUMN IF EXISTS normalized_name_vi, DROP COLUMN IF EXISTS normalized_name_en, DROP COLUMN IF EXISTS raw_text_ja, DROP COLUMN IF EXISTS raw_text_vi, DROP COLUMN IF EXISTS raw_text_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.journal_entries DROP COLUMN IF EXISTS description_ja, DROP COLUMN IF EXISTS description_vi, DROP COLUMN IF EXISTS description_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.journal_lines DROP COLUMN IF EXISTS description_ja, DROP COLUMN IF EXISTS description_vi, DROP COLUMN IF EXISTS description_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.category_rules DROP COLUMN IF EXISTS rule_name_ja, DROP COLUMN IF EXISTS rule_name_vi, DROP COLUMN IF EXISTS rule_name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.approval_workflows DROP COLUMN IF EXISTS workflow_name_ja, DROP COLUMN IF EXISTS workflow_name_vi, DROP COLUMN IF EXISTS workflow_name_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS title_ja, DROP COLUMN IF EXISTS title_vi, DROP COLUMN IF EXISTS title_en, DROP COLUMN IF EXISTS body_ja, DROP COLUMN IF EXISTS body_vi, DROP COLUMN IF EXISTS body_en, DROP COLUMN IF EXISTS name_i18n;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS description_ja, DROP COLUMN IF EXISTS description_vi, DROP COLUMN IF EXISTS description_en, DROP COLUMN IF EXISTS name_i18n;

-- Recreate category_balances without name_en
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

COMMIT;
