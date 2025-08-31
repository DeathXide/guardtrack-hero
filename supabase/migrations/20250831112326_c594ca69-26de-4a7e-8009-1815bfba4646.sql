-- Fix permission error by updating the security definer function
-- Remove the function that accesses auth.users table directly
DROP FUNCTION IF EXISTS public.get_current_user_guard_id();

-- Create a new function that uses auth.email() instead of accessing auth.users
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