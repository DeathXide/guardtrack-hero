-- Add description column to daily_attendance_slots
-- Carries the staffing requirement description (e.g. "[UPPAL SHOWROOM]") into each slot
ALTER TABLE public.daily_attendance_slots ADD COLUMN IF NOT EXISTS description TEXT;
