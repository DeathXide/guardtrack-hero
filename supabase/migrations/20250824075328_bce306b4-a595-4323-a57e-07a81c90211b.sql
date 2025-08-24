-- Add status column to sites table
ALTER TABLE public.sites 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE public.sites 
ADD CONSTRAINT sites_status_check 
CHECK (status IN ('active', 'inactive', 'custom'));

-- Create index for better performance on status filtering
CREATE INDEX idx_sites_status ON public.sites(status);

-- Create index for invoice period queries
CREATE INDEX idx_invoices_period ON public.invoices(site_id, period_from, period_to);

-- Create function to check monthly billing constraint
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
$$ LANGUAGE plpgsql;

-- Create trigger for monthly billing constraint
CREATE TRIGGER trigger_check_monthly_invoice
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_monthly_invoice_constraint();