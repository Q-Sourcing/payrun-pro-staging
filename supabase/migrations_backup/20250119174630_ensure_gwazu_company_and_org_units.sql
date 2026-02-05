-- Migration: Ensure GWAZU company exists and create Org Units 1-4
-- This migration creates GWAZU company if missing, creates org units, and assigns employees

DO $$
DECLARE
  default_org_id uuid;
  uganda_country_id uuid;
  gwazu_company_id uuid;
  org_unit_1_id uuid;
  org_unit_2_id uuid;
  org_unit_3_id uuid;
  org_unit_4_id uuid;
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
  SELECT id INTO org_unit_1_id
  FROM public.company_units
  WHERE name = 'Company Unit 1' AND company_id = gwazu_company_id
  LIMIT 1;

  IF org_unit_1_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 1', 'head_office')
    RETURNING id INTO org_unit_1_id;
  END IF;

  -- Create Company Unit 2 if it doesn't exist
  SELECT id INTO org_unit_2_id
  FROM public.company_units
  WHERE name = 'Company Unit 2' AND company_id = gwazu_company_id
  LIMIT 1;

  IF org_unit_2_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 2', 'head_office')
    RETURNING id INTO org_unit_2_id;
  END IF;

  -- Create Company Unit 3 if it doesn't exist
  SELECT id INTO org_unit_3_id
  FROM public.company_units
  WHERE name = 'Company Unit 3' AND company_id = gwazu_company_id
  LIMIT 1;

  IF org_unit_3_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 3', 'head_office')
    RETURNING id INTO org_unit_3_id;
  END IF;

  -- Create Company Unit 4 if it doesn't exist
  SELECT id INTO org_unit_4_id
  FROM public.company_units
  WHERE name = 'Company Unit 4' AND company_id = gwazu_company_id
  LIMIT 1;

  IF org_unit_4_id IS NULL THEN
    INSERT INTO public.company_units (company_id, name, kind)
    VALUES (gwazu_company_id, 'Company Unit 4', 'head_office')
    RETURNING id INTO org_unit_4_id;
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
    company_unit_id = org_unit_1_id
  WHERE (company_unit_id IS NULL OR company_id IS NULL)
    AND company_id IS NULL;

  -- Also update employees that have a company_id but no company_unit_id
  UPDATE public.employees
  SET company_unit_id = org_unit_1_id
  WHERE company_unit_id IS NULL
    AND company_id = gwazu_company_id;

END $$;

-- Add comments
COMMENT ON TABLE public.companies IS 'Companies belong to organizations. GWAZU is the default company.';
COMMENT ON TABLE public.company_units IS 'Company units belong to companies. Company Units 1-4 are created under GWAZU.';

