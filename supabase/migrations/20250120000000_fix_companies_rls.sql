-- Fix RLS Policies for Companies Table
-- This migration ensures authenticated users can read companies

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read companies" ON public.companies;
DROP POLICY IF EXISTS "Allow all access to companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

-- Create policy to allow authenticated users to read all companies
-- This is needed for the cascading selectors to work
CREATE POLICY "Allow authenticated users to read companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert companies (for admin users)
CREATE POLICY "Allow authenticated users to create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update companies (for admin users)
CREATE POLICY "Allow authenticated users to update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled (it should already be, but making sure)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Also fix RLS for company_units table
DROP POLICY IF EXISTS "Allow authenticated users to read company units" ON public.company_units;
DROP POLICY IF EXISTS "Allow all access to company units" ON public.company_units;
DROP POLICY IF EXISTS "Users can view company units" ON public.company_units;

CREATE POLICY "Allow authenticated users to read company units"
ON public.company_units
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create company units"
ON public.company_units
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update company units"
ON public.company_units
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE public.company_units ENABLE ROW LEVEL SECURITY;

-- Also ensure countries table has proper RLS (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'countries'
  ) THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Allow authenticated users to read countries" ON public.countries;
    DROP POLICY IF EXISTS "Allow all access to countries" ON public.countries;
    
    -- Create read policy
    CREATE POLICY "Allow authenticated users to read countries"
    ON public.countries
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

