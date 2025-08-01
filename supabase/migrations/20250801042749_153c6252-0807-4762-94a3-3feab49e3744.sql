-- Add temporary slot support to shifts table
ALTER TABLE public.shifts 
ADD COLUMN is_temporary boolean DEFAULT false;

ALTER TABLE public.shifts 
ADD COLUMN temporary_pay_rate numeric;

ALTER TABLE public.shifts 
ADD COLUMN created_for_date date;

-- Create index for better performance when filtering temporary shifts
CREATE INDEX idx_shifts_temporary ON public.shifts(site_id, is_temporary, created_for_date);