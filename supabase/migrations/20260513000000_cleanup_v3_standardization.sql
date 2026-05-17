-- ────────────────────────────────────────────────────────────────────────────────
-- FINAL DATABASE CLEANUP & V3 STANDARDIZATION
-- Date: 2026-05-13
-- Goal: Purge all legacy infra and rename V3 tables to standard production names.
-- ────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. DROP LEGACY TABLES (Old Architecture)
-- We drop these with CASCADE to ensure all old triggers/FKs are removed.
DROP TABLE IF EXISTS public.group_assignments CASCADE;
DROP TABLE IF EXISTS public.group_budgets CASCADE;
DROP TABLE IF EXISTS public.group_keywords CASCADE;
DROP TABLE IF EXISTS public.custom_groups CASCADE;
DROP TABLE IF EXISTS public.ledger_member_groups CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE; -- This is the OLD V2 table
DROP TABLE IF EXISTS public.audit_trails CASCADE;
DROP TABLE IF EXISTS public.receipt_scans CASCADE; -- Old scan table

-- 2. RENAME TRANSACTIONS_V3 -> TRANSACTIONS
ALTER TABLE IF EXISTS public.transactions_v3 RENAME TO transactions;

-- Rename sequences (if any) and indexes for cleanliness
ALTER INDEX IF EXISTS public.idx_txn_v3_ledger RENAME TO idx_transactions_ledger;
ALTER INDEX IF EXISTS public.idx_txn_v3_workspace RENAME TO idx_transactions_workspace;
ALTER INDEX IF EXISTS public.idx_txn_v3_status RENAME TO idx_transactions_status;
ALTER INDEX IF EXISTS public.idx_txn_v3_date RENAME TO idx_transactions_date;
ALTER INDEX IF EXISTS public.idx_txn_v3_merchant RENAME TO idx_transactions_merchant;
ALTER INDEX IF EXISTS public.idx_txn_v3_external RENAME TO idx_transactions_external;
ALTER INDEX IF EXISTS public.idx_txn_v3_hash RENAME TO idx_transactions_hash;
ALTER INDEX IF EXISTS public.idx_txn_v3_payment_instrument RENAME TO idx_transactions_payment_instrument;
ALTER INDEX IF EXISTS public.idx_txn_v3_funding_source RENAME TO idx_transactions_funding_source;
ALTER INDEX IF EXISTS public.idx_txn_v3_source RENAME TO idx_transactions_source;

-- Update triggers
ALTER TRIGGER transactions_v3_updated_at ON public.transactions RENAME TO transactions_updated_at;

-- Update Policies (Drop V3 named ones and create standard ones)
DROP POLICY IF EXISTS "transactions_v3_ledger_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_v3_ledger_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_v3_ledger_update" ON public.transactions;

CREATE POLICY "transactions_ledger_select" ON public.transactions FOR SELECT USING (ledger_id IN (SELECT ledger_id FROM ledger_members WHERE user_id = auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "transactions_ledger_insert" ON public.transactions FOR INSERT WITH CHECK (ledger_id IN (SELECT ledger_id FROM ledger_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'operator')));
CREATE POLICY "transactions_ledger_update" ON public.transactions FOR UPDATE USING (ledger_id IN (SELECT ledger_id FROM ledger_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

-- 3. RENAME AUDIT_LOGS_V3 -> AUDIT_LOGS
ALTER TABLE IF EXISTS public.audit_logs_v3 RENAME TO audit_logs;

ALTER INDEX IF EXISTS public.idx_audit_logs_v3_org RENAME TO idx_audit_logs_org;
ALTER INDEX IF EXISTS public.idx_audit_logs_v3_ledger RENAME TO idx_audit_logs_ledger;
ALTER INDEX IF EXISTS public.idx_audit_logs_v3_actor RENAME TO idx_audit_logs_actor;
ALTER INDEX IF EXISTS public.idx_audit_logs_v3_entity RENAME TO idx_audit_logs_entity;
ALTER INDEX IF EXISTS public.idx_audit_logs_v3_event RENAME TO idx_audit_logs_event;

ALTER TRIGGER audit_logs_v3_no_update ON public.audit_logs RENAME TO audit_logs_no_update;
ALTER TRIGGER audit_logs_v3_no_delete ON public.audit_logs RENAME TO audit_logs_no_delete;

DROP POLICY IF EXISTS "audit_logs_v3_org_select" ON public.audit_logs;
CREATE POLICY "audit_logs_org_select" ON public.audit_logs FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'auditor')));

-- 4. CLEAN UP TENANT TABLES
-- Remove any leftover legacy columns if they exist
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS default_group_id;
ALTER TABLE public.ledgers DROP COLUMN IF EXISTS metadata_v2;

-- 5. FINAL COMMENTS
COMMENT ON TABLE public.transactions IS 'Core Enterprise Ledger V3 Transaction Records.';
COMMENT ON TABLE public.audit_logs IS 'Immutable Compliance Audit Trail V3.';
COMMENT ON TABLE public.categories IS 'Multilingual Hierarchical Category System (ltree).';

COMMIT;
