-- Create table for temporary staffing requests
CREATE TABLE public.temporary_staffing_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  request_date date NOT NULL,
  day_temp_slots integer NOT NULL DEFAULT 0,
  night_temp_slots integer NOT NULL DEFAULT 0,
  day_slot_pay_rate numeric,
  night_slot_pay_rate numeric,
  status text NOT NULL DEFAULT 'pending',
  requested_by text,
  approved_by text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temporary_staffing_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on temporary_staffing_requests" 
ON public.temporary_staffing_requests 
FOR ALL 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_temporary_staffing_requests_updated_at
BEFORE UPDATE ON public.temporary_staffing_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_temporary_staffing_requests_site_date ON public.temporary_staffing_requests(site_id, request_date);

-- Add check constraints
ALTER TABLE public.temporary_staffing_requests 
ADD CONSTRAINT check_valid_slots CHECK (day_temp_slots >= 0 AND night_temp_slots >= 0);

ALTER TABLE public.temporary_staffing_requests 
ADD CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));