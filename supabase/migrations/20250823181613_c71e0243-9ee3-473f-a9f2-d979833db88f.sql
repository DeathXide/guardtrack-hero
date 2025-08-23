-- Fix function search path security warnings by setting search_path
CREATE OR REPLACE FUNCTION public.get_current_financial_year()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_month INTEGER := EXTRACT(MONTH FROM current_date);
    current_year INTEGER := EXTRACT(YEAR FROM current_date);
    financial_year TEXT;
BEGIN
    -- Financial year runs from April to March
    IF current_month >= 4 THEN
        -- April to December: current year to next year
        financial_year := current_year::TEXT || '-' || RIGHT((current_year + 1)::TEXT, 2);
    ELSE
        -- January to March: previous year to current year
        financial_year := (current_year - 1)::TEXT || '-' || RIGHT(current_year::TEXT, 2);
    END IF;
    
    RETURN financial_year;
END;
$$;

-- Fix function search path security warnings by setting search_path
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_fy TEXT;
    next_num INTEGER;
    invoice_number TEXT;
BEGIN
    -- Get current financial year
    current_fy := public.get_current_financial_year();
    
    -- Insert or update the sequence for current financial year
    INSERT INTO public.invoice_sequences (financial_year, next_number)
    VALUES (current_fy, 2)
    ON CONFLICT (financial_year)
    DO UPDATE SET 
        next_number = invoice_sequences.next_number + 1,
        updated_at = now()
    RETURNING next_number - 1 INTO next_num;
    
    -- If it was an insert, next_num will be 1, otherwise it's the incremented value
    IF next_num IS NULL THEN
        next_num := 1;
    END IF;
    
    -- Format: INV-2024-25-001
    invoice_number := 'INV-' || current_fy || '-' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN invoice_number;
END;
$$;

-- Fix existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.generate_badge_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;