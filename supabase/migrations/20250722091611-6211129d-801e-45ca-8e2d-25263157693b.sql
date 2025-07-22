-- Create employee_types table for different types of workers
CREATE TABLE public.employee_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default employee types
INSERT INTO public.employee_types (name, description) VALUES 
    ('guard', 'Security Guard'),
    ('caretaker', 'Facility Caretaker'),
    ('supervisor', 'Site Supervisor'),
    ('maintenance', 'Maintenance Staff'),
    ('cleaner', 'Cleaning Staff');

-- Create attendance_records table
CREATE TABLE public.attendance_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL,
    employee_type TEXT NOT NULL DEFAULT 'guard',
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
    
    -- Attendance timing
    scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Status and verification
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'present', 'absent', 'late', 'early_departure', 'on_leave', 'overtime')),
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Location and verification
    check_in_location JSONB, -- {lat, lng, address}
    check_out_location JSONB,
    check_in_photo_url TEXT,
    check_out_photo_url TEXT,
    
    -- Additional info
    notes TEXT,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    break_duration INTEGER DEFAULT 0, -- in minutes
    
    -- Approval workflow
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    correction_reason TEXT,
    is_correction BOOLEAN DEFAULT false,
    original_record_id UUID REFERENCES public.attendance_records(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique attendance per employee per day per site per shift
    UNIQUE(employee_id, employee_type, site_id, attendance_date, shift_type)
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL,
    employee_type TEXT NOT NULL DEFAULT 'guard',
    
    leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_settings table for site-specific configurations
CREATE TABLE public.attendance_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    
    -- Grace periods (in minutes)
    late_grace_period INTEGER DEFAULT 15,
    early_departure_grace_period INTEGER DEFAULT 15,
    
    -- Shift timings
    day_shift_start TIME DEFAULT '08:00',
    day_shift_end TIME DEFAULT '20:00',
    night_shift_start TIME DEFAULT '20:00',
    night_shift_end TIME DEFAULT '08:00',
    
    -- Location settings
    location_radius INTEGER DEFAULT 100, -- meters
    site_latitude DECIMAL(10, 8),
    site_longitude DECIMAL(11, 8),
    
    -- Photo requirements
    require_check_in_photo BOOLEAN DEFAULT true,
    require_check_out_photo BOOLEAN DEFAULT false,
    
    -- Break settings
    allowed_break_duration INTEGER DEFAULT 30, -- minutes
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(site_id)
);

-- Enable Row Level Security
ALTER TABLE public.employee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on employee_types" 
ON public.employee_types FOR ALL USING (true);

CREATE POLICY "Allow all operations on attendance_records" 
ON public.attendance_records FOR ALL USING (true);

CREATE POLICY "Allow all operations on leave_requests" 
ON public.leave_requests FOR ALL USING (true);

CREATE POLICY "Allow all operations on attendance_settings" 
ON public.attendance_settings FOR ALL USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_settings_updated_at
BEFORE UPDATE ON public.attendance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();