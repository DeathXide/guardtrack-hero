-- Create shifts table to store guard assignments to sites
CREATE TABLE public.shifts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    guard_id UUID REFERENCES public.guards(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('day', 'night')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique guard per shift type per site
    UNIQUE(site_id, guard_id, type)
);

-- Enable Row Level Security
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for shifts
CREATE POLICY "Allow all operations on shifts" 
ON public.shifts 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();