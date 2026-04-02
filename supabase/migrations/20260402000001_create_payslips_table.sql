-- Payslips: Frozen monthly pay calculations for guards
-- Once generated, the payslip amount is immutable (corrections via adjustments)
CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE RESTRICT,
  guard_name TEXT NOT NULL,
  month TEXT NOT NULL,                    -- 'YYYY-MM' format
  days_in_month INTEGER NOT NULL,
  total_shifts INTEGER NOT NULL DEFAULT 0,
  shifts_worked INTEGER NOT NULL DEFAULT 0,
  base_salary NUMERIC NOT NULL DEFAULT 0, -- guard's configured rate (reference)
  is_per_shift BOOLEAN NOT NULL DEFAULT false,
  shift_based_salary NUMERIC NOT NULL DEFAULT 0, -- calculated from attendance
  override_pay NUMERIC NOT NULL DEFAULT 0,       -- sum of guard_pay_override amounts
  total_bonus NUMERIC NOT NULL DEFAULT 0,
  total_deduction NUMERIC NOT NULL DEFAULT 0,
  net_pay NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guard_id, month)
);

-- RLS
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on payslips" ON public.payslips FOR ALL USING (true);

-- Index for fast lookups
CREATE INDEX idx_payslips_guard_month ON public.payslips(guard_id, month);
CREATE INDEX idx_payslips_month ON public.payslips(month);
CREATE INDEX idx_payslips_status ON public.payslips(status);
