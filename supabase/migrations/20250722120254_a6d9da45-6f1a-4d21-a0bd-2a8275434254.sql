-- Update the badge number generation function to use SSF-YY-XXX format
CREATE OR REPLACE FUNCTION public.generate_badge_number()
RETURNS TEXT AS $$
DECLARE
    new_badge_number TEXT;
    current_year TEXT;
    counter INTEGER := 1;
    max_existing_number INTEGER := 0;
BEGIN
    -- Get last two digits of current year
    current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Find the highest existing badge number for current year
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN badge_number ~ ('^SSF-' || current_year || '-\d{3}$')
                THEN CAST(SUBSTRING(badge_number FROM LENGTH('SSF-' || current_year || '-') + 1) AS INTEGER)
                ELSE 0
            END
        ), 0
    ) INTO max_existing_number
    FROM public.guards
    WHERE badge_number LIKE 'SSF-' || current_year || '-%';
    
    -- Start counter from next available number
    counter := max_existing_number + 1;
    
    LOOP
        new_badge_number := 'SSF-' || current_year || '-' || LPAD(counter::TEXT, 3, '0');
        
        -- Check if badge number already exists (double-check for safety)
        IF NOT EXISTS (SELECT 1 FROM public.guards WHERE badge_number = new_badge_number) THEN
            RETURN new_badge_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;