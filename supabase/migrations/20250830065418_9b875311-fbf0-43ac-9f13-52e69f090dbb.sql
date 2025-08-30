-- Add CA role to the system and update invoice policies

-- First, let's check if there's a role constraint and update it to include 'ca'
-- If there's no constraint, this will just add the role capability
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'supervisor', 'guard', 'ca'));

-- Update invoice policies to allow CA users to view invoices
DROP POLICY IF EXISTS "Only admins can view invoices" ON public.invoices;

-- Create new policy that allows admins and CA users to view invoices
CREATE POLICY "Admins and CA users can view invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (
  public.profile_is_admin(auth.uid()) OR
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'ca'
);