-- Make company_units.kind field optional
-- This allows company units to have both head office and project employees
-- Run this in Supabase Dashboard SQL Editor

-- Step 1: Drop the CHECK constraint
ALTER TABLE public.company_units
  DROP CONSTRAINT IF EXISTS company_units_kind_check;

-- Step 2: Make the kind column nullable
ALTER TABLE public.company_units
  ALTER COLUMN kind DROP NOT NULL;

-- Step 3: Update existing records to set kind to NULL (optional - you can keep existing values)
-- Uncomment the line below if you want to clear existing kind values:
-- UPDATE public.company_units SET kind = NULL;

-- Step 4: Add a new CHECK constraint that allows NULL values
ALTER TABLE public.company_units
  ADD CONSTRAINT company_units_kind_check
  CHECK (kind IS NULL OR kind IN ('head_office', 'project'));

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_units'
  AND column_name = 'kind';

