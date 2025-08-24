-- Update the constraint to use 'temp' instead of 'custom'
ALTER TABLE public.sites 
DROP CONSTRAINT sites_status_check;

ALTER TABLE public.sites 
ADD CONSTRAINT sites_status_check 
CHECK (status IN ('active', 'inactive', 'temp'));