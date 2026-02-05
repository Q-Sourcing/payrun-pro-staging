-- Create expatriate_pay_groups table with proper schema
CREATE TABLE IF NOT EXISTS expatriate_pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paygroup_id text UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  currency text DEFAULT 'USD',
  exchange_rate_to_local numeric(12,4) NOT NULL DEFAULT 0,
  tax_country text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expatriate_pay_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."expatriate_pay_groups"; CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_groups"
AS permissive FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."expatriate_pay_groups"; CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_groups"
AS permissive FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."expatriate_pay_groups"; CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_groups"
AS permissive FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "public"."expatriate_pay_groups"; CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_groups"
AS permissive FOR DELETE
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_country ON expatriate_pay_groups(country);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_currency ON expatriate_pay_groups(currency);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_tax_country ON expatriate_pay_groups(tax_country);

-- Create expatriate_pay_run_items table
CREATE TABLE IF NOT EXISTS expatriate_pay_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid REFERENCES pay_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  expatriate_pay_group_id uuid REFERENCES expatriate_pay_groups(id) ON DELETE CASCADE,
  daily_rate numeric(12,2) NOT NULL,
  days_worked integer NOT NULL,
  allowances_foreign numeric(12,2) DEFAULT 0,
  net_foreign numeric(12,2) NOT NULL,
  net_local numeric(12,2) NOT NULL,
  gross_local numeric(12,2) NOT NULL,
  tax_country text NOT NULL,
  exchange_rate_to_local numeric(12,4) NOT NULL,
  currency text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for expatriate_pay_run_items
ALTER TABLE expatriate_pay_run_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expatriate_pay_run_items
DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable read access for all users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."expatriate_pay_run_items"; CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_run_items"
AS permissive FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."expatriate_pay_run_items"; CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_run_items"
AS permissive FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."expatriate_pay_run_items"; CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_run_items"
AS permissive FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "public"."expatriate_pay_run_items"; CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_run_items"
AS permissive FOR DELETE
TO authenticated
USING (true);

-- Create indexes for expatriate_pay_run_items
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_pay_run_id ON expatriate_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_employee_id ON expatriate_pay_run_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_expatriate_pay_group_id ON expatriate_pay_run_items(expatriate_pay_group_id);
