-- Create GWAZU Company and Set as Default Company
-- This migration creates the GWAZU company and sets it as the default for organizations

-- First, create countries table if it doesn't exist (must be done before we can reference it)
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);

-- Add default_company_id column to organizations table if it doesn't exist
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_default_company_id ON public.organizations(default_company_id);

-- Get the default organization ID (GWAZU organization)
DO $$
DECLARE
  default_org_id uuid;
  uganda_country_id uuid;
  gwazu_company_id uuid;
BEGIN
  -- Get the default organization (GWAZU)
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

  -- Get Uganda country ID (for the company)
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

  -- Create GWAZU company if it doesn't exist
  INSERT INTO public.companies (id, organization_id, name, country_id, currency)
  VALUES (
    gen_random_uuid(),
    default_org_id,
    'GWAZU',
    uganda_country_id,
    'UGX'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO gwazu_company_id;

  -- If company was created, update it
  IF gwazu_company_id IS NULL THEN
    SELECT id INTO gwazu_company_id
    FROM public.companies
    WHERE name = 'GWAZU' AND organization_id = default_org_id
    LIMIT 1;
  END IF;

  -- Set GWAZU as the default company for the organization
  IF gwazu_company_id IS NOT NULL THEN
    UPDATE public.organizations
    SET default_company_id = gwazu_company_id
    WHERE id = default_org_id;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.default_company_id IS 'Default company ID for this organization. Used to auto-select company in forms.';
