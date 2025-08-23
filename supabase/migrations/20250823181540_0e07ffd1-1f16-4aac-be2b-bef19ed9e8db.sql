-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  site_id UUID NOT NULL,
  site_name TEXT NOT NULL,
  site_gst TEXT,
  company_name TEXT NOT NULL,
  company_gst TEXT,
  client_name TEXT NOT NULL,
  client_address TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL,
  gst_type TEXT NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice sequences table for tracking sequential numbers
CREATE TABLE public.invoice_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_year TEXT NOT NULL UNIQUE, -- Format: "2024-25"
  next_number INTEGER NOT NULL DEFAULT 1,
  prefix TEXT NOT NULL DEFAULT 'INV',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on invoices" 
ON public.invoices 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on invoice_sequences" 
ON public.invoice_sequences 
FOR ALL 
USING (true);

-- Function to get current financial year
CREATE OR REPLACE FUNCTION public.get_current_financial_year()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on invoices
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on invoice_sequences
CREATE TRIGGER update_invoice_sequences_updated_at
  BEFORE UPDATE ON public.invoice_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();