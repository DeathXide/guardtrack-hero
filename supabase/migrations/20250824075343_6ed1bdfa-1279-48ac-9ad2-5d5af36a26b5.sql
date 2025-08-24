-- Fix the search path security warning for the function we just created
DROP FUNCTION IF EXISTS check_monthly_invoice_constraint();

CREATE OR REPLACE FUNCTION check_monthly_invoice_constraint()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if an invoice already exists for this site and month
    IF EXISTS (
        SELECT 1 FROM public.invoices 
        WHERE site_id = NEW.site_id 
        AND EXTRACT(YEAR FROM period_from) = EXTRACT(YEAR FROM NEW.period_from)
        AND EXTRACT(MONTH FROM period_from) = EXTRACT(MONTH FROM NEW.period_from)
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'An invoice already exists for this site and month period';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';