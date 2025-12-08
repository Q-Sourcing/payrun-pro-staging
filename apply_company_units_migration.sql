-- Combined migration script to apply company units renaming
-- Run this in Supabase Dashboard SQL Editor

-- ============================================================
-- Migration 1: Rename org_units to company_units
-- ============================================================

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

-- ============================================================
-- Migration 2: Ensure GWAZU company and company units exist
-- ============================================================

DO $$
DECLARE
  default_org_id uuid;
  uganda_country_id uuid;
  gwazu_company_id uuid;
  company_unit_1_id uuid;
  company_unit_2_id uuid;
  company_unit_3_id uuid;
  company_unit_4_id uuid;
BEGIN
  -- Get or create default organization (GWAZU organization)
  SELECT id INTO default_org_id
  FROM public.organizations
  WHERE name = 'GWAZU'
  LIMIT 1;

  -- If organization doesn't exist, create it
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (id, name, description, active)
    VALUES ('00000000-0000-0000-0000-000000000001', 'GWAZU', 'Default organization', true)
    RETURNING id INTO default_org_id;
  END IF;

  -- Get Uganda country ID
  SELECT id INTO uganda_country_id
  FROM public.countries
  WHERE code = 'UG'
  LIMIT 1;

  -- If Uganda country doesn't exist, create it
  IF uganda_country_id IS NULL THEN
    INSERT INTO public.countries (name, code)
    VALUES ('Uganda', 'UG')
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO uganda_country_id;
  END IF;

  -- Get or create GWAZU company
  SELECT id INTO gwazu_company_id
  FROM public.companies
  WHERE name = 'GWAZU' AND organization_id = default_org_id
  LIMIT 1;

  -- If company doesn't exist, create it
  IF gwazu_company_id IS NULL THEN
    INSERT INTO public.companies (organization_id, name, country_id, currency)
    VALUES (default_org_id, 'GWAZU', uganda_country_id, 'UGX')
    RETURNING id INTO gwazu_company_id;
  END IF;

  -- Set GWAZU as default company for the organization
  UPDATE public.organizations
  SET default_company_id = gwazu_company_id
  WHERE id = default_org_id;

  -- Create Company Unit 1 if it doesn't exist
  SELECT id INTO company_unit_1_id
  FROM public.company_units
  WHERE name = 'Company Unit 1' AND company_id = gwazu_company_id
  LIMIT 1;

  IF company_unit_1_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 1', 'head_office')
    RETURNING id INTO company_unit_1_id;
  END IF;

  -- Create Company Unit 2 if it doesn't exist
  SELECT id INTO company_unit_2_id
  FROM public.company_units
  WHERE name = 'Company Unit 2' AND company_id = gwazu_company_id
  LIMIT 1;

  IF company_unit_2_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 2', 'head_office')
    RETURNING id INTO company_unit_2_id;
  END IF;

  -- Create Company Unit 3 if it doesn't exist
  SELECT id INTO company_unit_3_id
  FROM public.company_units
  WHERE name = 'Company Unit 3' AND company_id = gwazu_company_id
  LIMIT 1;

  IF company_unit_3_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 3', 'head_office')
    RETURNING id INTO company_unit_3_id;
  END IF;

  -- Create Company Unit 4 if it doesn't exist
  SELECT id INTO company_unit_4_id
  FROM public.company_units
  WHERE name = 'Company Unit 4' AND company_id = gwazu_company_id
  LIMIT 1;

  IF company_unit_4_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 4', 'head_office')
    RETURNING id INTO company_unit_4_id;
  END IF;

  -- Add company_unit_id column to employees table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'company_unit_id'
  ) THEN
    ALTER TABLE public.employees
    ADD COLUMN company_unit_id uuid REFERENCES public.company_units(id) ON DELETE SET NULL;
  END IF;

  -- Add company_id column to employees table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.employees
    ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;

  -- Assign all existing employees to Company Unit 1 under GWAZU
  -- Only update employees that don't have a company_unit_id set
  UPDATE public.employees
  SET 
    company_id = gwazu_company_id,
    company_unit_id = company_unit_1_id
  WHERE (company_unit_id IS NULL OR company_id IS NULL)
    AND company_id IS NULL;

  -- Also update employees that have a company_id but no company_unit_id
  UPDATE public.employees
  SET company_unit_id = company_unit_1_id
  WHERE company_unit_id IS NULL
    AND company_id = gwazu_company_id;

END $$;

-- Add comments
COMMENT ON TABLE public.companies IS 'Companies belong to organizations. GWAZU is the default company.';
COMMENT ON TABLE public.company_units IS 'Company units belong to companies. Company Units 1-4 are created under GWAZU.';

