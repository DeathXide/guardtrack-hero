-- Guard Pay Model Revamp
-- 1. Make non-essential guard fields nullable for quick onboarding
-- 2. Add per_shift_rate to guards for shift-based hiring
-- 3. Add guard_pay_override to daily_attendance_slots for per-day custom guard pay

-- ============================================================
-- GUARDS TABLE: Make non-essential fields nullable
-- ============================================================

ALTER TABLE public.guards
  ALTER COLUMN dob DROP NOT NULL;

ALTER TABLE public.guards
  ALTER COLUMN current_address DROP NOT NULL;

ALTER TABLE public.guards
  ALTER COLUMN bank_name DROP NOT NULL;

ALTER TABLE public.guards
  ALTER COLUMN account_number DROP NOT NULL;

ALTER TABLE public.guards
  ALTER COLUMN monthly_pay_rate DROP NOT NULL;

-- ============================================================
-- GUARDS TABLE: Add per_shift_rate for shift-based hiring
-- ============================================================

ALTER TABLE public.guards
  ADD COLUMN per_shift_rate NUMERIC;

COMMENT ON COLUMN public.guards.per_shift_rate IS
  'Daily/shift pay rate for guards hired on shift basis. If set, takes precedence over monthly_pay_rate for daily pay calculation.';

COMMENT ON COLUMN public.guards.monthly_pay_rate IS
  'Monthly pay rate. Daily rate derived as monthly_pay_rate / actual days in month. Nullable if guard is shift-based only.';

-- ============================================================
-- DAILY_ATTENDANCE_SLOTS: Add guard_pay_override
-- ============================================================

ALTER TABLE public.daily_attendance_slots
  ADD COLUMN guard_pay_override NUMERIC;

COMMENT ON COLUMN public.daily_attendance_slots.guard_pay_override IS
  'Custom guard pay for this specific slot/day. Overrides guard default rate when set. Used for overtime, holidays, special duty, etc.';
