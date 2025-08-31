-- Fix infinite recursion in guards table policies
-- First, drop all existing policies for guards table
DROP POLICY IF EXISTS "Admins have full access to guards" ON public.guards;
DROP POLICY IF EXISTS "Supervisors can view guards" ON public.guards;
DROP POLICY IF EXISTS "Guards can view their own profile" ON public.guards;

-- Create a security definer function to get guard ID for current user
CREATE OR REPLACE FUNCTION public.get_current_user_guard_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id FROM guards g
  JOIN profiles p ON (p.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid()))
  WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
  LIMIT 1;
$$;

-- Create new policies without recursion
CREATE POLICY "Admins have full access to guards" ON public.guards
FOR ALL USING (profile_is_admin(auth.uid()))
WITH CHECK (profile_is_admin(auth.uid()));

CREATE POLICY "Supervisors can view and manage guards" ON public.guards
FOR ALL USING (is_admin_or_supervisor(auth.uid()))
WITH CHECK (is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Guards can view their own profile" ON public.guards
FOR SELECT USING (
  get_user_role(auth.uid()) = 'guard' AND
  id = get_current_user_guard_id()
);