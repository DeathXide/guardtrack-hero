-- SECURE ATTENDANCE SETTINGS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage attendance settings" ON public.attendance_settings;

-- Only admins can create attendance settings
CREATE POLICY "Only admins can create attendance settings"
ON public.attendance_settings FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin(auth.uid()));

-- Only admins can update attendance settings (critical security parameters)
CREATE POLICY "Only admins can update attendance settings"
ON public.attendance_settings FOR UPDATE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

-- Only admins can delete attendance settings
CREATE POLICY "Only admins can delete attendance settings"
ON public.attendance_settings FOR DELETE
TO authenticated
USING (public.profile_is_admin(auth.uid()));

-- Admins and supervisors can view attendance settings for operational purposes
CREATE POLICY "Admins and supervisors can view attendance settings"
ON public.attendance_settings FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  public.is_admin_or_supervisor(auth.uid())
);