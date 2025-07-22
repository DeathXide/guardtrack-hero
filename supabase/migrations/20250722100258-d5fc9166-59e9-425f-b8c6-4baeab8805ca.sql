-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  site_id UUID NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
  employee_type TEXT NOT NULL DEFAULT 'guard' CHECK (employee_type IN ('guard', 'supervisor', 'manager')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'present', 'absent', 'late', 'early_departure', 'replaced', 'reassigned')),
  scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_time TIMESTAMP WITH TIME ZONE NULL,
  actual_end_time TIMESTAMP WITH TIME ZONE NULL,
  break_duration INTEGER DEFAULT 0, -- in minutes
  overtime_hours NUMERIC DEFAULT 0,
  check_in_location JSONB NULL,
  check_out_location JSONB NULL,
  check_in_photo_url TEXT NULL,
  check_out_photo_url TEXT NULL,
  notes TEXT NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMP WITH TIME ZONE NULL,
  is_correction BOOLEAN DEFAULT false,
  correction_reason TEXT NULL,
  original_record_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_settings table
CREATE TABLE public.attendance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL UNIQUE,
  day_shift_start TIME WITHOUT TIME ZONE DEFAULT '08:00:00',
  day_shift_end TIME WITHOUT TIME ZONE DEFAULT '20:00:00',
  night_shift_start TIME WITHOUT TIME ZONE DEFAULT '20:00:00',
  night_shift_end TIME WITHOUT TIME ZONE DEFAULT '08:00:00',
  late_grace_period INTEGER DEFAULT 15, -- minutes
  early_departure_grace_period INTEGER DEFAULT 15, -- minutes
  require_check_in_photo BOOLEAN DEFAULT true,
  require_check_out_photo BOOLEAN DEFAULT false,
  site_latitude NUMERIC NULL,
  site_longitude NUMERIC NULL,
  location_radius INTEGER DEFAULT 100, -- meters
  allowed_break_duration INTEGER DEFAULT 30, -- minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance_records
CREATE POLICY "Allow all operations on attendance_records" 
ON public.attendance_records 
FOR ALL 
USING (true);

-- Create RLS policies for attendance_settings
CREATE POLICY "Allow all operations on attendance_settings" 
ON public.attendance_settings 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX idx_attendance_records_site_id ON public.attendance_records(site_id);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_shift_type ON public.attendance_records(shift_type);
CREATE INDEX idx_attendance_records_status ON public.attendance_records(status);
CREATE INDEX idx_attendance_settings_site_id ON public.attendance_settings(site_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_settings_updated_at
BEFORE UPDATE ON public.attendance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();