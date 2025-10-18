-- Comprehensive fix for pay_groups constraint + auto-create default expat group
-- This script resolves the "check_pay_groups_type" constraint violation and ensures proper defaults

-- Step 1: Drop existing constraint if it exists
ALTER TABLE pay_groups
  DROP CONSTRAINT IF EXISTS check_pay_groups_type;

-- Step 2: Add new constraint with proper values
ALTER TABLE pay_groups
  ADD CONSTRAINT check_pay_groups_type
  CHECK (type IN ('Local', 'Expatriate', 'Contractor', 'Intern', 'Casual'));

-- Step 3: Add pay_frequency column if it doesn't exist
ALTER TABLE pay_groups
  ADD COLUMN IF NOT EXISTS pay_frequency TEXT DEFAULT 'Monthly';

-- Step 4: Update existing records to have proper type values
-- Set default type for existing records that might be null
UPDATE pay_groups 
SET type = 'Local' 
WHERE type IS NULL OR type = '';

-- Step 5: Set pay_frequency for existing expatriate pay groups
UPDATE pay_groups 
SET pay_frequency = 'Daily Rate' 
WHERE type = 'Expatriate';

-- Step 6: Ensure type column has proper default
ALTER TABLE pay_groups
  ALTER COLUMN type SET DEFAULT 'Local';

-- Step 7: Add NOT NULL constraint to type column
ALTER TABLE pay_groups
  ALTER COLUMN type SET NOT NULL;

-- Step 8: Create default Expatriate Pay Group if missing
INSERT INTO pay_groups (name, country, currency, type, pay_frequency, description)
SELECT 'Default Expatriate Pay Group', 'Uganda', 'USD', 'Expatriate', 'Daily Rate', 'Auto-created default pay group for expatriate employees'
WHERE NOT EXISTS (
  SELECT 1 FROM pay_groups WHERE type = 'Expatriate'
);

-- Step 9: Create default Local Pay Group if missing
INSERT INTO pay_groups (name, country, currency, type, pay_frequency, description)
SELECT 'Default Local Pay Group', 'Uganda', 'UGX', 'Local', 'Monthly', 'Auto-created default pay group for local employees'
WHERE NOT EXISTS (
  SELECT 1 FROM pay_groups WHERE type = 'Local'
);

-- Step 10: Verify the changes
SELECT 
  id, 
  name, 
  country, 
  currency, 
  type, 
  pay_frequency,
  created_at
FROM pay_groups 
ORDER BY type, name;
