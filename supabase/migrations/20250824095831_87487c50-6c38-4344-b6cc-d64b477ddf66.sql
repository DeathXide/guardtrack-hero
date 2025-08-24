-- Add rate_type column to staffing_requirements table
ALTER TABLE public.staffing_requirements 
ADD COLUMN rate_type text NOT NULL DEFAULT 'shift';

-- Add constraint to ensure valid rate types
ALTER TABLE public.staffing_requirements 
ADD CONSTRAINT rate_type_check CHECK (rate_type IN ('monthly', 'shift'));