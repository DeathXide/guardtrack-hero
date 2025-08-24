-- Add status column to sites table
ALTER TABLE public.sites 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE public.sites 
ADD CONSTRAINT sites_status_check 
CHECK (status IN ('active', 'inactive', 'custom'));

-- Create unique constraint for monthly billing (one invoice per site per month)
-- This prevents duplicate invoices for the same site and month
ALTER TABLE public.invoices 
ADD CONSTRAINT unique_site_month_invoice 
UNIQUE (site_id, EXTRACT(YEAR FROM period_from), EXTRACT(MONTH FROM period_from));

-- Create index for better performance on status filtering
CREATE INDEX idx_sites_status ON public.sites(status);

-- Create index for invoice period queries
CREATE INDEX idx_invoices_period ON public.invoices(site_id, period_from, period_to);