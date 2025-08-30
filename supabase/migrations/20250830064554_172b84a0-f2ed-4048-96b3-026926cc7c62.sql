-- Create helper functions for role checking to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND role IN ('admin', 'supervisor')
  );
$$;

-- SECURE INVOICES TABLE
DROP POLICY IF EXISTS "Authenticated users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

-- Only admins can manage invoices (financial data)
CREATE POLICY "Only admins can create invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin(auth.uid()));

CREATE POLICY "Only admins can update invoices"
ON public.invoices FOR UPDATE  
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Only admins can delete invoices"
ON public.invoices FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Only admins can view invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (public.profile_is_admin(auth.uid()));

-- SECURE PAYMENTS TABLE  
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

-- Admins can manage all payments, guards can only view their own
CREATE POLICY "Admins can create payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin(auth.uid()));

CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Admins can delete payments"
ON public.payments FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Role-based payment viewing"
ON public.payments FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid()) OR
  -- Guards can view their own payments by matching guard_id
  (public.get_user_role(auth.uid()) = 'guard' AND guard_id = (
    SELECT g.id FROM public.guards g
    JOIN public.profiles p ON p.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    WHERE g.name = p.full_name OR p.email LIKE '%' || g.name || '%'
    LIMIT 1
  ))
);

-- SECURE COMPANY SETTINGS TABLE
DROP POLICY IF EXISTS "Authenticated users can create company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can delete company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;

-- Only admins can manage company settings (sensitive business data)
CREATE POLICY "Only admins can create company settings"
ON public.company_settings FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin(auth.uid()));

CREATE POLICY "Only admins can update company settings"
ON public.company_settings FOR UPDATE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Only admins can delete company settings"
ON public.company_settings FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Only admins can view company settings"
ON public.company_settings FOR SELECT
TO authenticated
USING (public.profile_is_admin(auth.uid()));

-- SECURE SITE UTILITY CHARGES TABLE
DROP POLICY IF EXISTS "Authenticated users can manage site utility charges" ON public.site_utility_charges;

CREATE POLICY "Admins can create site utility charges"
ON public.site_utility_charges FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin(auth.uid()));

CREATE POLICY "Admins can update site utility charges"
ON public.site_utility_charges FOR UPDATE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Admins can delete site utility charges"
ON public.site_utility_charges FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Role-based site utility charges viewing"
ON public.site_utility_charges FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid())
);

-- SECURE ATTENDANCE RECORDS TABLE
DROP POLICY IF EXISTS "Authenticated users can create attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can delete attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can update attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view attendance records" ON public.attendance_records;

CREATE POLICY "Role-based attendance record creation"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid())
);

CREATE POLICY "Role-based attendance record updates"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid())
);

CREATE POLICY "Admins can delete attendance records"
ON public.attendance_records FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Role-based attendance record viewing"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid()) OR
  -- Guards can view their own attendance records
  (public.get_user_role(auth.uid()) = 'guard' AND employee_id = (
    SELECT g.id FROM public.guards g
    JOIN public.profiles p ON p.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    WHERE g.name = p.full_name OR p.email LIKE '%' || g.name || '%'
    LIMIT 1
  ))
);

-- SECURE LEAVE REQUESTS TABLE
DROP POLICY IF EXISTS "Authenticated users can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Authenticated users can delete leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Authenticated users can update leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Authenticated users can view leave requests" ON public.leave_requests;

CREATE POLICY "Users can create their own leave requests"
ON public.leave_requests FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid()) OR
  -- Guards can create requests for themselves
  (public.get_user_role(auth.uid()) = 'guard' AND employee_id = (
    SELECT g.id FROM public.guards g
    JOIN public.profiles p ON p.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    WHERE g.name = p.full_name OR p.email LIKE '%' || g.name || '%'
    LIMIT 1
  ))
);

CREATE POLICY "Role-based leave request updates"
ON public.leave_requests FOR UPDATE
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid()) OR
  -- Guards can update their own pending requests
  (public.get_user_role(auth.uid()) = 'guard' AND status = 'pending' AND employee_id = (
    SELECT g.id FROM public.guards g
    JOIN public.profiles p ON p.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    WHERE g.name = p.full_name OR p.email LIKE '%' || g.name || '%'
    LIMIT 1
  ))
);

CREATE POLICY "Admins can delete leave requests"
ON public.leave_requests FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Role-based leave request viewing"
ON public.leave_requests FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid()) OR
  -- Guards can view their own leave requests
  (public.get_user_role(auth.uid()) = 'guard' AND employee_id = (
    SELECT g.id FROM public.guards g
    JOIN public.profiles p ON p.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    WHERE g.name = p.full_name OR p.email LIKE '%' || g.name || '%'
    LIMIT 1
  ))
);

-- SECURE DAILY ATTENDANCE SLOTS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage daily attendance slots" ON public.daily_attendance_slots;

CREATE POLICY "Role-based attendance slot creation"
ON public.daily_attendance_slots FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid())
);

CREATE POLICY "Role-based attendance slot updates"
ON public.daily_attendance_slots FOR UPDATE
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid())
);

CREATE POLICY "Admins can delete attendance slots"
ON public.daily_attendance_slots FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

CREATE POLICY "Role-based attendance slot viewing"
ON public.daily_attendance_slots FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid()) OR
  -- Guards can view slots they're assigned to
  (public.get_user_role(auth.uid()) = 'guard' AND assigned_guard_id = (
    SELECT g.id FROM public.guards g
    JOIN public.profiles p ON p.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    WHERE g.name = p.full_name OR p.email LIKE '%' || g.name || '%'
    LIMIT 1
  ))
);