-- Clear all data from tables in the correct order to handle foreign key dependencies
-- Using IF EXISTS checks for tables that may not exist in all environments

DO $$
BEGIN
  -- Clear attendance and payment records first (child tables)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_records') THEN
    DELETE FROM public.attendance_records;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    DELETE FROM public.payments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
    DELETE FROM public.leave_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_attendance_slots') THEN
    DELETE FROM public.daily_attendance_slots;
  END IF;

  -- Clear shifts and staffing requirements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') THEN
    DELETE FROM public.shifts;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staffing_requirements') THEN
    DELETE FROM public.staffing_requirements;
  END IF;

  -- Clear attendance settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_settings') THEN
    DELETE FROM public.attendance_settings;
  END IF;

  -- Clear guards table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guards') THEN
    DELETE FROM public.guards;
  END IF;

  -- Clear sites table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    DELETE FROM public.sites;
  END IF;

  -- Clear employee types
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_types') THEN
    DELETE FROM public.employee_types;
  END IF;

  -- Clear company settings (keep one default record)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_settings') THEN
    DELETE FROM public.company_settings;
    INSERT INTO public.company_settings (company_name) VALUES ('Security Management System');
  END IF;
END $$;
