-- Fix all enum types to support the required values
-- This script resolves enum-related errors for pay_frequency and pay_type

-- Step 1: Add "Daily Rate" to pay_frequency enum
ALTER TYPE public.pay_frequency ADD VALUE 'Daily Rate';

-- Step 2: Add "daily_rate" to pay_type enum  
ALTER TYPE public.pay_type ADD VALUE 'daily_rate';

-- Step 3: Verify the enums now have all required values
SELECT 'pay_frequency enum values:' as info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_frequency')
ORDER BY enumsortorder;

SELECT 'pay_type enum values:' as info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_type')
ORDER BY enumsortorder;

-- Step 4: Update any existing records that might have issues
-- This is a safety measure in case there are any data inconsistencies
UPDATE pay_groups 
SET pay_frequency = 'monthly' 
WHERE pay_frequency IS NULL;

-- Step 5: Show current pay groups to verify
SELECT 
  id, 
  name, 
  country, 
  type, 
  pay_frequency,
  created_at
FROM pay_groups 
ORDER BY type, name;
