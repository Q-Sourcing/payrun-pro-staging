-- Migration: Replace contractor type with piece_rate and make tax_country required for all pay group types
-- This migration:
-- 1. Updates type constraints to replace 'contractor' with 'piece_rate'
-- 2. Adds piece_rate-specific columns to pay_groups table
-- 3. Migrates existing contractor pay groups to piece_rate
-- 4. Ensures tax_country is required for all pay group types
-- 5. Sets default tax_country for existing pay groups that don't have it

-- ============================================================
-- 1. UPDATE PAY_GROUP_MASTER TYPE CONSTRAINT
-- ============================================================

-- Drop existing constraint
ALTER TABLE public.pay_group_master
DROP CONSTRAINT IF EXISTS pay_group_master_type_check;

-- Add new constraint with piece_rate instead of contractor
ALTER TABLE public.pay_group_master
ADD CONSTRAINT pay_group_master_type_check
CHECK (type IN ('regular', 'expatriate', 'piece_rate', 'intern'));

-- Migrate existing contractor records to piece_rate
UPDATE public.pay_group_master
SET type = 'piece_rate'
WHERE type = 'contractor';

-- ============================================================
-- 2. UPDATE PAY_RUNS PAYROLL_TYPE CONSTRAINT
-- ============================================================

-- Drop existing constraint
ALTER TABLE public.pay_runs
DROP CONSTRAINT IF EXISTS pay_runs_payroll_type_check;

-- Add new constraint with piece_rate instead of contractor
ALTER TABLE public.pay_runs
ADD CONSTRAINT pay_runs_payroll_type_check
CHECK (payroll_type IN ('regular', 'expatriate', 'piece_rate', 'intern') OR payroll_type IS NULL);

-- Migrate existing contractor records to piece_rate
UPDATE public.pay_runs
SET payroll_type = 'piece_rate'
WHERE payroll_type = 'contractor';

-- ============================================================
-- 3. ADD PIECE_RATE COLUMNS TO PAY_GROUPS TABLE
-- ============================================================

-- Add piece_type column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS piece_type text;

-- Add default_piece_rate column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS default_piece_rate numeric(12,2);

-- Add minimum_pieces column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS minimum_pieces integer;

-- Add maximum_pieces column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS maximum_pieces integer;

-- ============================================================
-- 4. ENSURE TAX_COUNTRY EXISTS AND IS REQUIRED FOR ALL TYPES
-- ============================================================

-- Add tax_country column to pay_groups if it doesn't exist
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS tax_country text;

-- Set default tax_country for existing pay groups that don't have it (use country as default, or 'UG' if country is also NULL)
-- First, handle NULL or empty values
UPDATE public.pay_groups
SET tax_country = COALESCE(
  CASE 
    WHEN country IS NOT NULL AND LENGTH(TRIM(country)) = 2 THEN UPPER(TRIM(country))
    WHEN country IS NOT NULL AND LENGTH(TRIM(country)) > 2 THEN 
      CASE 
        WHEN UPPER(TRIM(country)) LIKE 'UGANDA%' THEN 'UG'
        WHEN UPPER(TRIM(country)) LIKE 'KENYA%' THEN 'KE'
        WHEN UPPER(TRIM(country)) LIKE 'TANZANIA%' THEN 'TZ'
        ELSE 'UG'
      END
    ELSE 'UG'
  END,
  'UG'
)
WHERE tax_country IS NULL OR tax_country = '' OR LENGTH(TRIM(tax_country)) != 2;

-- Normalize all tax_country values to uppercase and ensure they're exactly 2 characters
UPDATE public.pay_groups
SET tax_country = UPPER(LEFT(TRIM(tax_country), 2))
WHERE tax_country IS NOT NULL AND LENGTH(TRIM(tax_country)) != 2;

-- Make tax_country NOT NULL for pay_groups (only if all rows now have values)
DO $$
BEGIN
  -- Ensure all rows have valid tax_country values
  UPDATE public.pay_groups
  SET tax_country = 'UG'
  WHERE tax_country IS NULL OR tax_country = '' OR LENGTH(TRIM(tax_country)) != 2;
  
  -- Now set NOT NULL
  ALTER TABLE public.pay_groups
  ALTER COLUMN tax_country SET NOT NULL;
END $$;

-- Add check constraint to ensure tax_country is always provided and valid
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_tax_country_required;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_tax_country_required
CHECK (tax_country IS NOT NULL AND LENGTH(TRIM(tax_country)) = 2);

-- ============================================================
-- 5. MIGRATE EXISTING CONTRACTOR PAY GROUPS TO PIECE_RATE
-- ============================================================

-- Update pay_group_master records that reference contractor pay groups
UPDATE public.pay_group_master pgm
SET type = 'piece_rate'
FROM public.pay_groups pg
WHERE pgm.source_table = 'pay_groups'
  AND pgm.source_id = pg.id
  AND pgm.type = 'contractor';

-- Update pay_groups table type column if it exists (for legacy data)
-- First, try to add piece_rate to any enum types that might exist
DO $$
DECLARE
  enum_type_name text;
BEGIN
  -- Try to find and update pay_group_type enum if it exists
  SELECT t.typname INTO enum_type_name
  FROM pg_type t
  WHERE t.typname = 'pay_group_type' AND t.typtype = 'e';
  
  IF enum_type_name IS NOT NULL THEN
    -- Add piece_rate to the enum if it doesn't exist
    BEGIN
      ALTER TYPE pay_group_type ADD VALUE IF NOT EXISTS 'piece_rate';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Update pay_groups table type column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pay_groups' 
    AND column_name = 'type'
  ) THEN
    -- Try to update contractor to piece_rate (will fail silently if enum doesn't have piece_rate)
    BEGIN
      UPDATE public.pay_groups
      SET type = 'piece_rate'
      WHERE type::text = 'contractor';
    EXCEPTION
      WHEN OTHERS THEN
        -- If update fails (e.g., enum doesn't have piece_rate), skip it
        NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- 6. UPDATE EXISTING PIECE_RATE PAY GROUPS
-- ============================================================

-- Set default piece_type for existing piece_rate pay groups
UPDATE public.pay_groups
SET piece_type = 'units'
WHERE EXISTS (
  SELECT 1 FROM public.pay_group_master pgm
  WHERE pgm.source_table = 'pay_groups'
    AND pgm.source_id = pay_groups.id
    AND pgm.type = 'piece_rate'
)
AND piece_type IS NULL;

-- ============================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pay_groups_piece_type ON public.pay_groups(piece_type) WHERE piece_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pay_groups_tax_country ON public.pay_groups(tax_country);

-- ============================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN public.pay_groups.piece_type IS 'Unit of measurement for piece rate calculations (crates, boxes, units, etc.)';
COMMENT ON COLUMN public.pay_groups.default_piece_rate IS 'Default rate per piece/unit for piece rate pay groups';
COMMENT ON COLUMN public.pay_groups.minimum_pieces IS 'Minimum pieces required per pay period (optional, for validation)';
COMMENT ON COLUMN public.pay_groups.maximum_pieces IS 'Maximum pieces allowed per pay period (optional, for validation)';
COMMENT ON COLUMN public.pay_groups.tax_country IS 'Tax country code (required for all pay group types) - determines which country''s tax regulations apply';

