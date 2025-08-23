-- Clear all data from tables in the correct order to handle foreign key dependencies

-- Clear attendance and payment records first (child tables)
DELETE FROM public.attendance_records;
DELETE FROM public.payments;
DELETE FROM public.leave_requests;
DELETE FROM public.daily_attendance_slots;

-- Clear shifts and staffing requirements
DELETE FROM public.shifts;
DELETE FROM public.staffing_requirements;

-- Clear attendance settings
DELETE FROM public.attendance_settings;

-- Clear guards table
DELETE FROM public.guards;

-- Clear sites table
DELETE FROM public.sites;

-- Clear employee types
DELETE FROM public.employee_types;

-- Clear company settings (keep one default record)
DELETE FROM public.company_settings;
INSERT INTO public.company_settings (company_name) VALUES ('Security Management System');