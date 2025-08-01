-- Remove the index first
DROP INDEX IF EXISTS public.idx_shifts_temporary;

-- Remove the temporary columns from shifts table
ALTER TABLE public.shifts 
DROP COLUMN IF EXISTS is_temporary;

ALTER TABLE public.shifts 
DROP COLUMN IF EXISTS temporary_pay_rate;