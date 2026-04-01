-- =============================================================
-- Guard Enhancements Migration
-- 1. Add 'terminated' and 'resigned' to guard_status enum
-- 2. Add deduction_category to payments table
-- 3. Add uniform tracking fields to guards table
-- =============================================================

-- 1. Extend guard_status enum with new values
ALTER TYPE guard_status ADD VALUE IF NOT EXISTS 'terminated';
ALTER TYPE guard_status ADD VALUE IF NOT EXISTS 'resigned';

-- 2. Add deduction_category to payments table
-- Categories: 'advance', 'penalty', 'uniform', 'other' (for deductions)
-- NULL for bonuses (or could be used for bonus categories in future)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS deduction_category TEXT DEFAULT NULL;

-- Add check constraint for valid deduction categories
ALTER TABLE payments
  ADD CONSTRAINT chk_deduction_category
  CHECK (
    deduction_category IS NULL
    OR deduction_category IN ('advance', 'penalty', 'uniform', 'other')
  );

-- 3. Add uniform tracking to guards table
ALTER TABLE guards
  ADD COLUMN IF NOT EXISTS uniform_issued BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS uniform_issued_date DATE DEFAULT NULL;

-- Add index for uniform tracking queries
CREATE INDEX IF NOT EXISTS idx_guards_uniform_issued ON guards (uniform_issued);
