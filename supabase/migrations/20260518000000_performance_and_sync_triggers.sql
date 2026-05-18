-- ────────────────────────────────────────────────────────────────────────────────
-- MIGRATION: PERFORMANCE INDEXES & PROFILE SYNC TRIGGER
-- Date: 2026-05-18
-- Author: Staff-Level Frontend Architect & FinTech SaaS UX Architect
-- Goal: Address core design gaps by improving reconciliation performance and
--       resolving profile synchronization discrepancies.
-- ────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. ADD TEMPORAL PERFORMANCE INDEXES FOR BANK RECONCILIATION
-- Speeds up financial accounts reconciliation and bank statement matching lookup queries.
CREATE INDEX IF NOT EXISTS idx_transactions_value_date 
  ON public.transactions(ledger_id, value_date desc) 
  WHERE value_date IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_posted_date 
  ON public.transactions(ledger_id, posted_date desc) 
  WHERE posted_date IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX public.idx_transactions_value_date IS 'Speeds up timing bank reconciliations (float matching)';
COMMENT ON INDEX public.idx_transactions_posted_date IS 'Optimizes credit card statement billing cycle lookups';

-- 2. CREATE PROFILE SYNCHRONIZATION FUNCTION & TRIGGER
-- Prevents split-brain state by auto-propagating full name and avatar updates
-- from the `public.profiles` table to `public.household_members`.
CREATE OR REPLACE FUNCTION public.sync_profile_to_household_members()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.household_members
  SET 
    display_name = COALESCE(NEW.full_name, display_name),
    avatar_url = COALESCE(NEW.avatar_url, avatar_url),
    updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to guarantee idempotency
DROP TRIGGER IF EXISTS trigger_sync_profile_to_household_members ON public.profiles;

CREATE TRIGGER trigger_sync_profile_to_household_members
AFTER UPDATE OF full_name, avatar_url ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_household_members();

COMMENT ON FUNCTION public.sync_profile_to_household_members() IS 'Synchronizes name and avatar updates from user profiles to household memberships';

COMMIT;
