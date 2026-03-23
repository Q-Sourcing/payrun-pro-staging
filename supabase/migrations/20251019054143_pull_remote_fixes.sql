-- Pull remote fixes: enum and constraint updates
-- This migration captures the fixes already applied in the remote database

-- Fix pay_frequency enum to include "Daily Rate"
ALTER TYPE public.pay_frequency ADD VALUE IF NOT EXISTS 'Daily Rate';

-- Fix pay_type enum to include "daily_rate"  
ALTER TYPE public.pay_type ADD VALUE IF NOT EXISTS 'daily_rate';

-- Fix employee_type_check constraint to accept capitalized values
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employee_type_check;

ALTER TABLE public.employees 
ADD CONSTRAINT employee_type_check 
CHECK (employee_type IN ('Local', 'Expatriate'));

-- Update existing employee_type records to use capitalized values
UPDATE public.employees 
SET employee_type = 'Local' 
WHERE employee_type = 'local';

UPDATE public.employees 
SET employee_type = 'Expatriate' 
WHERE employee_type = 'expatriate';

-- Ensure type column exists in pay_groups (must come before using it in WHERE clauses)
ALTER TABLE pay_groups
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Local';

-- Update existing pay_groups records to have proper type values
UPDATE pay_groups
SET type = 'Local'
WHERE type IS NULL OR type = '';

-- Ensure pay_frequency column exists in pay_groups
ALTER TABLE pay_groups
  ADD COLUMN IF NOT EXISTS pay_frequency TEXT DEFAULT 'Monthly';

-- Note: Data update for pay_frequency skipped here due to PostgreSQL constraint
-- (new enum values cannot be used in the same transaction they are added)
-- Existing 'Expatriate' pay groups have pay_frequency set via application logic.

-- Add constraint for pay_groups type
ALTER TABLE pay_groups
  DROP CONSTRAINT IF EXISTS check_pay_groups_type;

ALTER TABLE pay_groups
  ADD CONSTRAINT check_pay_groups_type
  CHECK (type IN ('Local', 'Expatriate', 'Contractor', 'Intern', 'Casual'));
