-- Fix critical security vulnerabilities by implementing proper RLS policies

-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on guards" ON public.guards;
DROP POLICY IF EXISTS "Allow all operations on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all operations on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all operations on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow all operations on leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow all operations on company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Allow all operations on sites" ON public.sites;
DROP POLICY IF EXISTS "Allow all operations on shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow all operations on daily_attendance_slots" ON public.daily_attendance_slots;
DROP POLICY IF EXISTS "Allow all operations on staffing_requirements" ON public.staffing_requirements;
DROP POLICY IF EXISTS "Allow all operations on site_utility_charges" ON public.site_utility_charges;
DROP POLICY IF EXISTS "Allow all operations on attendance_settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Allow all operations on employee_types" ON public.employee_types;
DROP POLICY IF EXISTS "Allow all operations on invoice_sequences" ON public.invoice_sequences;

-- Create secure RLS policies for guards table (most sensitive)
CREATE POLICY "Authenticated users can view guards" 
ON public.guards 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create guards" 
ON public.guards 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update guards" 
ON public.guards 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete guards" 
ON public.guards 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for payments table
CREATE POLICY "Authenticated users can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create payments" 
ON public.payments 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for invoices table
CREATE POLICY "Authenticated users can view invoices" 
ON public.invoices 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create invoices" 
ON public.invoices 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices" 
ON public.invoices 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete invoices" 
ON public.invoices 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for attendance_records table
CREATE POLICY "Authenticated users can view attendance records" 
ON public.attendance_records 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create attendance records" 
ON public.attendance_records 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance records" 
ON public.attendance_records 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete attendance records" 
ON public.attendance_records 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for leave_requests table
CREATE POLICY "Authenticated users can view leave requests" 
ON public.leave_requests 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create leave requests" 
ON public.leave_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update leave requests" 
ON public.leave_requests 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete leave requests" 
ON public.leave_requests 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for company_settings table
CREATE POLICY "Authenticated users can view company settings" 
ON public.company_settings 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create company settings" 
ON public.company_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update company settings" 
ON public.company_settings 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete company settings" 
ON public.company_settings 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for sites table
CREATE POLICY "Authenticated users can view sites" 
ON public.sites 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create sites" 
ON public.sites 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sites" 
ON public.sites 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete sites" 
ON public.sites 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for remaining tables
CREATE POLICY "Authenticated users can manage shifts" 
ON public.shifts 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage daily attendance slots" 
ON public.daily_attendance_slots 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage staffing requirements" 
ON public.staffing_requirements 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage site utility charges" 
ON public.site_utility_charges 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage attendance settings" 
ON public.attendance_settings 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage employee types" 
ON public.employee_types 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage invoice sequences" 
ON public.invoice_sequences 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);