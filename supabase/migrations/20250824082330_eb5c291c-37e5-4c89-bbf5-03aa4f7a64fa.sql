-- First, let's see what the current constraint allows
SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conrelid = 'public.sites'::regclass 
AND contype = 'c';

-- Update the sites status check constraint to allow our new values
ALTER TABLE public.sites 
DROP CONSTRAINT IF EXISTS sites_status_check;

-- Add the new constraint with the correct values
ALTER TABLE public.sites 
ADD CONSTRAINT sites_status_check 
CHECK (status IN ('active', 'inactive', 'temp'));