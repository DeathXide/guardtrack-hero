-- Add temporary flag to shifts table
ALTER TABLE public.shifts 
ADD COLUMN is_temporary boolean DEFAULT false;

-- Add temporary slot pay rate
ALTER TABLE public.shifts 
ADD COLUMN temporary_pay_rate numeric;

-- Create index for better performance when filtering temporary shifts
CREATE INDEX idx_shifts_temporary ON public.shifts(site_id, is_temporary);