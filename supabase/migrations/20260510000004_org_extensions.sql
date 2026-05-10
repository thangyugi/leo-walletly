-- Migration to add enterprise fields to organizations table
-- Adding address and business_type for a more complete organization profile.

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'Enterprise';

-- Trigger schema cache reload
NOTIFY pgrst, 'reload schema';
