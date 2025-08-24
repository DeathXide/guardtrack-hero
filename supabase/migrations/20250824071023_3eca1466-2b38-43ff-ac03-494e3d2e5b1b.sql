-- Add personal billing support to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN personal_billing_names JSONB DEFAULT '[]'::jsonb;

-- Add personal billing name assignment to sites table
ALTER TABLE public.sites 
ADD COLUMN personal_billing_name TEXT;

-- Update existing sites to have null personal_billing_name by default
-- This ensures compatibility with existing data