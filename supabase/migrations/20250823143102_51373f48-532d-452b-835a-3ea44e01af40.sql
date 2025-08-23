-- Create company_settings table for branding and company information
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Security Management System',
  company_motto TEXT,
  company_logo_url TEXT,
  company_address_line1 TEXT,
  company_address_line2 TEXT,
  company_address_line3 TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  gst_number TEXT,
  pan_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for company settings
CREATE POLICY "Allow all operations on company_settings" 
ON public.company_settings 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (
  company_name, 
  company_motto,
  company_address_line1
) VALUES (
  'Security Management System',
  'Your trusted security partner',
  'Enter your company address'
);