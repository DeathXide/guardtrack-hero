-- Add role_type column to shifts table for temporary slots
ALTER TABLE public.shifts 
ADD COLUMN role_type text;