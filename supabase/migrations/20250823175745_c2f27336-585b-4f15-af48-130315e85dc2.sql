-- Add company seal image URL field to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN company_seal_image_url text;