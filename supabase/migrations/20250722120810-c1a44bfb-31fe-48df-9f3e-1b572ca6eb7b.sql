-- Update existing guards with proper badge numbers using the new format
UPDATE public.guards 
SET badge_number = public.generate_badge_number()
WHERE badge_number = 'TEMP' OR badge_number IS NULL OR badge_number = '';

-- Also update any guards that might have the old GRD format to the new SSF format
UPDATE public.guards 
SET badge_number = public.generate_badge_number()
WHERE badge_number LIKE 'GRD%';