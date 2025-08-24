-- Create site_utility_charges table for managing utility billing
CREATE TABLE public.site_utility_charges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL,
    utility_type TEXT NOT NULL,
    utility_name TEXT NOT NULL,
    monthly_amount NUMERIC NOT NULL DEFAULT 0,
    billing_frequency TEXT NOT NULL DEFAULT 'monthly',
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_utility_charges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on site_utility_charges" 
ON public.site_utility_charges 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_site_utility_charges_updated_at
BEFORE UPDATE ON public.site_utility_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_site_utility_charges_site_id ON public.site_utility_charges(site_id);
CREATE INDEX idx_site_utility_charges_active ON public.site_utility_charges(is_active) WHERE is_active = true;