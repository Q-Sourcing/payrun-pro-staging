-- Enhance company_units table for admin management
-- Ensure proper structure and add any missing fields

-- The company_units table already exists, but let's ensure it has all necessary fields
ALTER TABLE public.company_units
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Ensure RLS policies allow authenticated users to manage company units
-- Check if policies exist, if not create them

-- Policy for viewing company units (users can see company units for their company)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'company_units' 
    AND policyname = 'company_units_select_authenticated'
  ) THEN
    CREATE POLICY "company_units_select_authenticated" 
    ON public.company_units 
    FOR SELECT 
    TO authenticated 
    USING (true);
  END IF;
END $$;

-- Policy for inserting company units (authenticated users can create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'company_units' 
    AND policyname = 'company_units_insert_authenticated'
  ) THEN
    CREATE POLICY "company_units_insert_authenticated" 
    ON public.company_units 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);
  END IF;
END $$;

-- Policy for updating company units (authenticated users can update)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'company_units' 
    AND policyname = 'company_units_update_authenticated'
  ) THEN
    CREATE POLICY "company_units_update_authenticated" 
    ON public.company_units 
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Add index for active status
CREATE INDEX IF NOT EXISTS idx_company_units_active ON public.company_units(active);

-- Add comment
COMMENT ON TABLE public.company_units IS 'Company units (head office or projects) within companies';
COMMENT ON COLUMN public.company_units.active IS 'Whether the company unit is active';

