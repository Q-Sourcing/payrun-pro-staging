-- ==========================================================
-- 🔒 FIX RLS POLICIES FOR PAY RUN ITEMS TABLES
-- ==========================================================
-- This migration fixes RLS policies that are too restrictive

-- Drop existing restrictive policies and create more permissive ones
DO $$
BEGIN
    -- Drop existing policies for expatriate_pay_run_items
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.expatriate_pay_run_items;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expatriate_pay_run_items;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.expatriate_pay_run_items;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.expatriate_pay_run_items;
    
    -- Create new permissive policies
    CREATE POLICY "Allow all operations for authenticated users" ON public.expatriate_pay_run_items
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
        
    -- Also allow public access for development
    CREATE POLICY "Allow all operations for public users" ON public.expatriate_pay_run_items
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

-- Fix policies for other tables as well
DO $$
BEGIN
    -- Local pay run items
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.local_pay_run_items;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.local_pay_run_items;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.local_pay_run_items;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.local_pay_run_items;
    
    CREATE POLICY "Allow all operations for authenticated users" ON public.local_pay_run_items
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for public users" ON public.local_pay_run_items
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

DO $$
BEGIN
    -- Contractor pay run items
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.contractor_pay_run_items;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.contractor_pay_run_items;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.contractor_pay_run_items;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.contractor_pay_run_items;
    
    CREATE POLICY "Allow all operations for authenticated users" ON public.contractor_pay_run_items
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for public users" ON public.contractor_pay_run_items
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

DO $$
BEGIN
    -- Intern pay run items
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.intern_pay_run_items;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.intern_pay_run_items;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.intern_pay_run_items;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.intern_pay_run_items;
    
    CREATE POLICY "Allow all operations for authenticated users" ON public.intern_pay_run_items
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for public users" ON public.intern_pay_run_items
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;
