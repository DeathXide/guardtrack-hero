-- Fix RLS policies that directly reference auth.users table.
-- The authenticated role cannot SELECT from auth.users, causing
-- "permission denied for table users" errors.
--
-- Solution: Create a SECURITY DEFINER function to safely get the
-- current user's guard ID, replacing all direct auth.users references.

-- Helper function to get current user's guard ID (if any)
CREATE OR REPLACE FUNCTION public.get_current_user_guard_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT g.id
  FROM public.guards g
  JOIN public.profiles p ON (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_guard_id() TO authenticated;

-- ============================================================
-- Fix daily_attendance_slots guard policy
-- ============================================================
DROP POLICY IF EXISTS "Guards can view their assigned slots" ON public.daily_attendance_slots;
-- Also drop the name from my previous attempt in case it was created
DROP POLICY IF EXISTS "Role-based attendance slot viewing" ON public.daily_attendance_slots;

CREATE POLICY "Guards can view their assigned slots"
ON public.daily_attendance_slots FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'guard'
  AND assigned_guard_id = public.get_current_user_guard_id()
);

-- ============================================================
-- Fix guards guard policy
-- ============================================================
DROP POLICY IF EXISTS "Guards can view their own profile" ON public.guards;
DROP POLICY IF EXISTS "Role-based guard viewing" ON public.guards;

CREATE POLICY "Guards can view their own profile"
ON public.guards FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'guard'
  AND id = public.get_current_user_guard_id()
);

-- ============================================================
-- Fix attendance_records guard policy
-- ============================================================
DROP POLICY IF EXISTS "Guards can view their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Role-based attendance record viewing" ON public.attendance_records;

CREATE POLICY "Guards can view their own attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'guard'
  AND employee_id = public.get_current_user_guard_id()
);

-- ============================================================
-- Fix payments guard policy
-- ============================================================
DROP POLICY IF EXISTS "Guards can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Role-based payment viewing" ON public.payments;

CREATE POLICY "Guards can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'guard'
  AND guard_id = public.get_current_user_guard_id()
);

-- ============================================================
-- Fix leave_requests guard policy (if table exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Guards can manage their own leave requests" ON public.leave_requests';
    EXECUTE 'CREATE POLICY "Guards can manage their own leave requests" ON public.leave_requests FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) = ''guard'' AND employee_id = public.get_current_user_guard_id()) WITH CHECK (public.get_user_role(auth.uid()) = ''guard'' AND employee_id = public.get_current_user_guard_id())';
  END IF;
END $$;
