-- Fix site status: rename 'custom' to 'temp' to match frontend code
-- The database constraint used 'custom' but all frontend code uses 'temp'

-- Drop the old constraint and add the corrected one
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_status_check;
ALTER TABLE public.sites ADD CONSTRAINT sites_status_check CHECK (status IN ('active', 'inactive', 'temp'));

-- Update any existing rows that have 'custom' status to 'temp'
UPDATE public.sites SET status = 'temp' WHERE status = 'custom';
