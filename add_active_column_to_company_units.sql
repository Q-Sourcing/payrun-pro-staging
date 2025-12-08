-- Add active and description columns to company_units table
-- This is a simplified version of migration 20250112000004_enhance_org_units.sql
-- Run this in Supabase Dashboard SQL Editor if the migration hasn't been applied yet

-- Add description column if it doesn't exist
ALTER TABLE public.company_units
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add active column if it doesn't exist
ALTER TABLE public.company_units
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Set existing records to active=true if they don't have a value
UPDATE public.company_units
SET active = true
WHERE active IS NULL;

-- Add index for active status
CREATE INDEX IF NOT EXISTS idx_company_units_active ON public.company_units(active);

-- Add comments
COMMENT ON COLUMN public.company_units.description IS 'Optional description for the company unit';
COMMENT ON COLUMN public.company_units.active IS 'Whether the company unit is active';

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'company_units'
  AND column_name IN ('active', 'description')
ORDER BY column_name;

