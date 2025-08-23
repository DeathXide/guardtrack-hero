-- Create daily_attendance_slots table
CREATE TABLE public.daily_attendance_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
  role_type TEXT NOT NULL,
  slot_number INTEGER NOT NULL,
  assigned_guard_id UUID REFERENCES public.guards(id) ON DELETE SET NULL,
  is_present BOOLEAN DEFAULT NULL,
  pay_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, attendance_date, shift_type, role_type, slot_number)
);

-- Enable RLS
ALTER TABLE public.daily_attendance_slots ENABLE ROW LEVEL SECURITY;

-- Create policy for daily_attendance_slots
CREATE POLICY "Allow all operations on daily_attendance_slots" 
ON public.daily_attendance_slots 
FOR ALL 
USING (true);

-- Add foreign key reference to daily_attendance_slots in attendance_records
ALTER TABLE public.attendance_records 
ADD COLUMN slot_id UUID REFERENCES public.daily_attendance_slots(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_daily_attendance_slots_site_date ON public.daily_attendance_slots(site_id, attendance_date);
CREATE INDEX idx_daily_attendance_slots_guard ON public.daily_attendance_slots(assigned_guard_id);
CREATE INDEX idx_daily_attendance_slots_date_shift ON public.daily_attendance_slots(attendance_date, shift_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_attendance_slots_updated_at
BEFORE UPDATE ON public.daily_attendance_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();