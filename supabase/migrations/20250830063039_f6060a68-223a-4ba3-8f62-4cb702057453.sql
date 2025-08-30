-- Drop existing overly permissive policies on guards table
DROP POLICY IF EXISTS "Authenticated users can create guards" ON public.guards;
DROP POLICY IF EXISTS "Authenticated users can delete guards" ON public.guards;
DROP POLICY IF EXISTS "Authenticated users can update guards" ON public.guards;
DROP POLICY IF EXISTS "Authenticated users can view guards" ON public.guards;

-- Create secure role-based policies for guards table
-- Only admins can create guards
CREATE POLICY "Only admins can create guards" 
ON public.guards 
FOR INSERT 
TO authenticated
WITH CHECK (public.profile_is_admin(auth.uid()));

-- Only admins can update guards
CREATE POLICY "Only admins can update guards" 
ON public.guards 
FOR UPDATE 
TO authenticated
USING (public.profile_is_admin(auth.uid()));

-- Only admins can delete guards
CREATE POLICY "Only admins can delete guards" 
ON public.guards 
FOR DELETE 
TO authenticated
USING (public.profile_is_admin(auth.uid()));

-- Only admins and supervisors can view guards, guards can view their own record
CREATE POLICY "Authorized personnel can view guards" 
ON public.guards 
FOR SELECT 
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'supervisor')
  ) OR
  -- Guards can view their own record if they have a user account
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'guard'
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);