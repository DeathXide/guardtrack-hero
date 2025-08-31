-- Update RLS policies to ensure admins have full access to all operations

-- Guards table - ensure admins can do everything
DROP POLICY IF EXISTS "Authorized personnel can view guards" ON public.guards;
DROP POLICY IF EXISTS "Only admins can create guards" ON public.guards;
DROP POLICY IF EXISTS "Only admins can update guards" ON public.guards;
DROP POLICY IF EXISTS "Only admins can delete guards" ON public.guards;

CREATE POLICY "Admins have full access to guards" ON public.guards
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can view guards" ON public.guards
FOR SELECT USING (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can view their own profile" ON public.guards
FOR SELECT USING (
  get_user_role(auth.uid()) = 'guard' AND
  id = (
    SELECT g.id FROM guards g
    JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
    WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
    LIMIT 1
  )
);

-- Attendance records - ensure admins can do everything
DROP POLICY IF EXISTS "Role-based attendance record viewing" ON public.attendance_records;
DROP POLICY IF EXISTS "Role-based attendance record creation" ON public.attendance_records;
DROP POLICY IF EXISTS "Role-based attendance record updates" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can delete attendance records" ON public.attendance_records;

CREATE POLICY "Admins have full access to attendance records" ON public.attendance_records
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can manage attendance records" ON public.attendance_records
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can view their own attendance" ON public.attendance_records
FOR SELECT USING (
  get_user_role(auth.uid()) = 'guard' AND
  employee_id = (
    SELECT g.id FROM guards g
    JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
    WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
    LIMIT 1
  )
);

-- Daily attendance slots - ensure admins can do everything
DROP POLICY IF EXISTS "Role-based attendance slot viewing" ON public.daily_attendance_slots;
DROP POLICY IF EXISTS "Role-based attendance slot creation" ON public.daily_attendance_slots;
DROP POLICY IF EXISTS "Role-based attendance slot updates" ON public.daily_attendance_slots;
DROP POLICY IF EXISTS "Admins can delete attendance slots" ON public.daily_attendance_slots;

CREATE POLICY "Admins have full access to attendance slots" ON public.daily_attendance_slots
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can manage attendance slots" ON public.daily_attendance_slots
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can view their assigned slots" ON public.daily_attendance_slots
FOR SELECT USING (
  get_user_role(auth.uid()) = 'guard' AND
  assigned_guard_id = (
    SELECT g.id FROM guards g
    JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
    WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
    LIMIT 1
  )
);

-- Sites table - ensure admins have full access
DROP POLICY IF EXISTS "Authenticated users can view sites" ON public.sites;
DROP POLICY IF EXISTS "Authenticated users can create sites" ON public.sites;
DROP POLICY IF EXISTS "Authenticated users can update sites" ON public.sites;
DROP POLICY IF EXISTS "Authenticated users can delete sites" ON public.sites;

CREATE POLICY "Admins have full access to sites" ON public.sites
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can manage sites" ON public.sites
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can view sites" ON public.sites
FOR SELECT USING (auth.role() = 'authenticated');

-- Shifts table - ensure admins have full access
DROP POLICY IF EXISTS "Authenticated users can manage shifts" ON public.shifts;

CREATE POLICY "Admins have full access to shifts" ON public.shifts
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can manage shifts" ON public.shifts
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

-- Staffing requirements - ensure admins have full access
DROP POLICY IF EXISTS "Authenticated users can manage staffing requirements" ON public.staffing_requirements;

CREATE POLICY "Admins have full access to staffing requirements" ON public.staffing_requirements
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can manage staffing requirements" ON public.staffing_requirements
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

-- Leave requests - ensure proper access
DROP POLICY IF EXISTS "Role-based leave request viewing" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Role-based leave request updates" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can delete leave requests" ON public.leave_requests;

CREATE POLICY "Admins have full access to leave requests" ON public.leave_requests
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can manage leave requests" ON public.leave_requests
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can manage their own leave requests" ON public.leave_requests
FOR ALL USING (
  get_user_role(auth.uid()) = 'guard' AND
  employee_id = (
    SELECT g.id FROM guards g
    JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
    WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
    LIMIT 1
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'guard' AND
  employee_id = (
    SELECT g.id FROM guards g
    JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
    WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
    LIMIT 1
  )
);

-- Payments - ensure admins have full access
DROP POLICY IF EXISTS "Role-based payment viewing" ON public.payments;
DROP POLICY IF EXISTS "Admins can create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Admins have full access to payments" ON public.payments
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can view payments" ON public.payments
FOR SELECT USING (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can view their own payments" ON public.payments
FOR SELECT USING (
  get_user_role(auth.uid()) = 'guard' AND
  guard_id = (
    SELECT g.id FROM guards g
    JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
    WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
    LIMIT 1
  )
);