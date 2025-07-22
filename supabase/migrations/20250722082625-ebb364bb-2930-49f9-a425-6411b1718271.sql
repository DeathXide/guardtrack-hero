-- Create ENUM types for better data integrity
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE public.guard_type AS ENUM ('permanent', 'contract');
CREATE TYPE public.guard_status AS ENUM ('active', 'inactive');
CREATE TYPE public.payment_type AS ENUM ('bonus', 'deduction');

-- Create guards table
CREATE TABLE public.guards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    gender gender_type NOT NULL,
    languages TEXT[] NOT NULL DEFAULT '{}',
    phone_number TEXT NOT NULL,
    alternate_phone_number TEXT,
    current_address TEXT NOT NULL,
    permanent_address TEXT,
    guard_type guard_type NOT NULL,
    status guard_status NOT NULL DEFAULT 'active',
    monthly_pay_rate DECIMAL(10,2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT,
    upi_id TEXT,
    aadhaar_number TEXT,
    aadhaar_card_photo_url TEXT,
    pan_card_number TEXT,
    guard_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    payment_type payment_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    note TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_month TEXT NOT NULL, -- Format: YYYY-MM for reporting
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to auto-generate badge numbers
CREATE OR REPLACE FUNCTION public.generate_badge_number()
RETURNS TEXT AS $$
DECLARE
    new_badge_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_badge_number := 'GRD' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if badge number already exists
        IF NOT EXISTS (SELECT 1 FROM public.guards WHERE badge_number = new_badge_number) THEN
            RETURN new_badge_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate badge number
CREATE OR REPLACE FUNCTION public.set_badge_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.badge_number IS NULL OR NEW.badge_number = '' THEN
        NEW.badge_number := public.generate_badge_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_badge_number
    BEFORE INSERT ON public.guards
    FOR EACH ROW
    EXECUTE FUNCTION public.set_badge_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_guards_updated_at
    BEFORE UPDATE ON public.guards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your authentication needs)
CREATE POLICY "Allow all operations on guards" ON public.guards FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_guards_badge_number ON public.guards(badge_number);
CREATE INDEX idx_guards_status ON public.guards(status);
CREATE INDEX idx_guards_guard_type ON public.guards(guard_type);
CREATE INDEX idx_payments_guard_id ON public.payments(guard_id);
CREATE INDEX idx_payments_payment_month ON public.payments(payment_month);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);