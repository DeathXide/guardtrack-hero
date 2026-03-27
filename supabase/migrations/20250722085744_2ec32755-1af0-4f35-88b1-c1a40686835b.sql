-- Create sites table
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  gst_number TEXT NOT NULL,
  gst_type TEXT NOT NULL CHECK (gst_type IN ('GST', 'NGST', 'RCM', 'PERSONAL')),
  address TEXT NOT NULL,
  site_category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staffing_requirements table (normalized approach)
CREATE TABLE public.staffing_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  budget_per_slot NUMERIC NOT NULL CHECK (budget_per_slot >= 0),
  day_slots INTEGER NOT NULL DEFAULT 0 CHECK (day_slots >= 0),
  night_slots INTEGER NOT NULL DEFAULT 0 CHECK (night_slots >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_requirements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sites
CREATE POLICY "Allow all operations on sites" 
ON public.sites 
FOR ALL 
USING (true);

-- Create RLS policies for staffing_requirements
CREATE POLICY "Allow all operations on staffing_requirements" 
ON public.staffing_requirements 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_staffing_requirements_site_id ON public.staffing_requirements(site_id);
CREATE INDEX idx_sites_site_name ON public.sites(site_name);
CREATE INDEX idx_sites_organization_name ON public.sites(organization_name);

-- Create trigger for automatic timestamp updates on sites
CREATE TRIGGER update_sites_updated_at
BEFORE UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on staffing_requirements
CREATE TRIGGER update_staffing_requirements_updated_at
BEFORE UPDATE ON public.staffing_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();