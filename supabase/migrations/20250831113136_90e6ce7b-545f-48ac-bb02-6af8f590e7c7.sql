-- Fix permission error step by step
-- First drop the policy that depends on the function
DROP POLICY IF EXISTS "Guards can view their own profile" ON public.guards;

-- Drop the function that accesses auth.users table directly
DROP FUNCTION IF EXISTS public.get_current_user_guard_id();

-- Create a simplified function that doesn't access auth.users
CREATE OR REPLACE FUNCTION public.get_current_user_guard_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id FROM guards g
  JOIN profiles p ON (p.email = auth.email()::text)
  WHERE (g.name = p.full_name OR p.email ILIKE '%' || g.name || '%')
  LIMIT 1;
$$;

-- Recreate the guard viewing policy
CREATE POLICY "Guards can view their own profile" ON public.guards
FOR SELECT USING (
  get_user_role(auth.uid()) = 'guard' AND
  id = get_current_user_guard_id()
);