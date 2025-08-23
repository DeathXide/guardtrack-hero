-- Add separate address line columns to sites table
ALTER TABLE public.sites 
ADD COLUMN address_line1 text,
ADD COLUMN address_line2 text,
ADD COLUMN address_line3 text;

-- Update existing records to use address_line1 for backward compatibility
UPDATE public.sites 
SET address_line1 = address 
WHERE address IS NOT NULL AND address != '';

-- We'll keep the original address column for now to avoid breaking existing code