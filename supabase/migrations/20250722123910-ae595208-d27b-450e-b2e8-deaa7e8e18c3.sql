-- Add foreign key relationship between attendance_records and guards
ALTER TABLE public.attendance_records 
ADD CONSTRAINT fk_attendance_records_guard_id 
FOREIGN KEY (employee_id) 
REFERENCES public.guards(id) 
ON DELETE CASCADE;