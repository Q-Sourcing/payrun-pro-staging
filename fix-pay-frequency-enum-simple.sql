-- Fix pay_frequency enum to include "Daily Rate"
-- This script resolves the "invalid input value for enum pay_frequency" error

-- Add "Daily Rate" to the existing pay_frequency enum
ALTER TYPE public.pay_frequency ADD VALUE 'Daily Rate';

-- Verify the enum now has all required values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_frequency')
ORDER BY enumsortorder;
