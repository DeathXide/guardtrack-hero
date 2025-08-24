-- Update the default rate_type to monthly and update existing records
UPDATE public.staffing_requirements 
SET rate_type = 'monthly' 
WHERE rate_type = 'shift' OR rate_type IS NULL;

-- Update the default constraint
ALTER TABLE public.staffing_requirements 
ALTER COLUMN rate_type SET DEFAULT 'monthly';