-- Fix pay_frequency enum to include "Daily Rate"
-- This script resolves the "invalid input value for enum pay_frequency" error

-- Step 1: Check if pay_frequency column exists and what type it is
-- If it's an enum, we need to add "Daily Rate" to the enum values

-- Add "Daily Rate" to the existing pay_frequency enum
DO $$ 
BEGIN
  -- Check if the pay_frequency enum exists and add "Daily Rate"
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_frequency') THEN
    -- Add "Daily Rate" to the enum if it doesn't already exist
    BEGIN
      ALTER TYPE pay_frequency ADD VALUE 'Daily Rate';
    EXCEPTION
      WHEN duplicate_object THEN
        -- Value already exists, do nothing
        NULL;
    END;
  ELSE
    -- Create the enum if it doesn't exist
    CREATE TYPE pay_frequency AS ENUM ('Monthly', 'Weekly', 'Bi-Weekly', 'Daily Rate', 'Custom');
  END IF;
END $$;

-- Step 2: Ensure pay_groups table has the pay_frequency column with proper type
-- If the column doesn't exist or is the wrong type, fix it
DO $$
BEGIN
  -- Check if pay_frequency column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pay_groups' 
    AND column_name = 'pay_frequency'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE pay_groups ADD COLUMN pay_frequency pay_frequency DEFAULT 'Monthly';
  ELSE
    -- Check if it's the right type, if not, alter it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pay_groups' 
      AND column_name = 'pay_frequency'
      AND data_type != 'USER-DEFINED'
    ) THEN
      -- Convert from TEXT to enum
      ALTER TABLE pay_groups ALTER COLUMN pay_frequency TYPE pay_frequency USING pay_frequency::pay_frequency;
    END IF;
  END IF;
END $$;

-- Step 3: Update any existing records that might have invalid values
UPDATE pay_groups 
SET pay_frequency = 'Monthly' 
WHERE pay_frequency IS NULL OR pay_frequency NOT IN ('Monthly', 'Weekly', 'Bi-Weekly', 'Daily Rate', 'Custom');

-- Step 4: Verify the fix
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
