-- Fix recursive RLS policy on profiles causing 42P17 errors
-- Create a SECURITY DEFINER function to check admin role without triggering RLS recursion
create or replace function public.profile_is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _user_id and p.role = 'admin'
  );
$$;

-- Ensure authenticated users can execute the function
grant execute on function public.profile_is_admin(uuid) to authenticated;

-- Drop the recursive policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate the admin policy using the helper function (no recursion)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.profile_is_admin(auth.uid()));