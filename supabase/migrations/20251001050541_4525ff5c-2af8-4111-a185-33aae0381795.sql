-- Temporarily allow anonymous access for testing
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can manage pay groups" ON public.pay_groups;
DROP POLICY IF EXISTS "Authenticated users can view all pay groups" ON public.pay_groups;
DROP POLICY IF EXISTS "Authenticated users can manage pay runs" ON public.pay_runs;
DROP POLICY IF EXISTS "Authenticated users can view all pay runs" ON public.pay_runs;
DROP POLICY IF EXISTS "Authenticated users can manage pay items" ON public.pay_items;
DROP POLICY IF EXISTS "Authenticated users can view all pay items" ON public.pay_items;
DROP POLICY IF EXISTS "Authenticated users can manage benefits" ON public.benefits;
DROP POLICY IF EXISTS "Authenticated users can view all benefits" ON public.benefits;

-- Create new policies that allow anonymous access for testing
-- Employees table
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Pay groups table
CREATE POLICY "Allow all access to pay groups" ON public.pay_groups FOR ALL USING (true) WITH CHECK (true);

-- Pay runs table
CREATE POLICY "Allow all access to pay runs" ON public.pay_runs FOR ALL USING (true) WITH CHECK (true);

-- Pay items table
CREATE POLICY "Allow all access to pay items" ON public.pay_items FOR ALL USING (true) WITH CHECK (true);

-- Benefits table
CREATE POLICY "Allow all access to benefits" ON public.benefits FOR ALL USING (true) WITH CHECK (true);