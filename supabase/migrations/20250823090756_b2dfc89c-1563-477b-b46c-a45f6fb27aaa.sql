-- Add is_temporary field to daily_attendance_slots table
ALTER TABLE public.daily_attendance_slots 
ADD COLUMN is_temporary BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for better performance when filtering temporary slots
CREATE INDEX idx_daily_attendance_slots_temporary 
ON public.daily_attendance_slots(site_id, attendance_date, is_temporary);