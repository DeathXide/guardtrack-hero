-- Update site_utility_charges table to simplify structure
-- Drop columns we no longer need
ALTER TABLE site_utility_charges 
DROP COLUMN IF EXISTS utility_type,
DROP COLUMN IF EXISTS utility_name,
DROP COLUMN IF EXISTS billing_frequency;

-- Rename monthly_amount to amount 
ALTER TABLE site_utility_charges 
RENAME COLUMN monthly_amount TO amount;