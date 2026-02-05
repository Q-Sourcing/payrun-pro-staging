-- Migration: Rename org_units to company_units and org_unit_id to company_unit_id
-- This migration renames the table and all column references for consistency

-- Step 1: Rename the table
ALTER TABLE IF EXISTS public.org_units RENAME TO company_units;

-- Step 2: Rename the column in employees table
DO $$
BEGIN
  -- Check if org_unit_id column exists in employees table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'org_unit_id'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN org_unit_id TO company_unit_id;
  END IF;
END $$;

-- Step 3: Rename the column in pay_groups table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pay_groups' 
    AND column_name = 'org_unit_id'
  ) THEN
    ALTER TABLE public.pay_groups RENAME COLUMN org_unit_id TO company_unit_id;
  END IF;
END $$;

-- Step 4: Update foreign key constraints
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  -- Find and rename foreign key constraints that reference org_units
  FOR fk_record IN
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.table_name IN ('employees', 'pay_groups')
      AND kcu.column_name = 'company_unit_id'
      AND EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage AS ccu
        WHERE ccu.constraint_name = tc.constraint_name
        AND ccu.table_name = 'company_units'
      )
  LOOP
    -- Drop old constraint
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', 
      fk_record.table_name, fk_record.constraint_name);
    
    -- Create new constraint with updated name
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.company_units(id) ON DELETE SET NULL',
      fk_record.table_name,
      replace(fk_record.constraint_name, 'org_unit', 'company_unit'),
      fk_record.column_name
    );
  END LOOP;
END $$;

-- Step 5: Update indexes
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  -- Rename indexes that reference org_unit
  FOR idx_record IN
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexname LIKE '%org_unit%' OR indexname LIKE '%orgunit%')
  LOOP
    EXECUTE format('ALTER INDEX IF EXISTS public.%I RENAME TO %I',
      idx_record.indexname,
      replace(replace(idx_record.indexname, 'org_unit', 'company_unit'), 'orgunit', 'companyunit')
    );
  END LOOP;
END $$;

-- Step 6: Update RLS policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Rename policies that reference org_units
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_units'
      AND (policyname LIKE '%org_unit%' OR policyname LIKE '%orgunit%')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I',
      policy_record.policyname,
      policy_record.tablename,
      replace(replace(policy_record.policyname, 'org_unit', 'company_unit'), 'orgunit', 'companyunit')
    );
  END LOOP;
END $$;

-- Step 7: Update comments
COMMENT ON TABLE public.company_units IS 'Company units belong to companies. Company Units 1-4 are created under GWAZU.';
COMMENT ON COLUMN public.company_units.company_id IS 'Reference to the company this unit belongs to';

-- Step 8: Update any views that reference org_units
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN
    SELECT viewname, definition
    FROM pg_views
    WHERE schemaname = 'public'
      AND definition LIKE '%org_units%'
  LOOP
    -- Note: Views need to be recreated, so we'll log them for manual update
    -- This is a placeholder - actual view updates should be done separately
    RAISE NOTICE 'View % references org_units and may need manual update', view_record.viewname;
  END LOOP;
END $$;

