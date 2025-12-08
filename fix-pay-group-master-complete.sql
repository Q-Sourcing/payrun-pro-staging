-- Complete fix for pay_group_master table
-- This creates the table if it doesn't exist and adds the necessary RLS policies

-- 1. Create the pay_group_master table
CREATE TABLE IF NOT EXISTS public.pay_group_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('regular','expatriate','contractor','intern','piece_rate')),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  code text UNIQUE,
  name text NOT NULL,
  country text,
  currency text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  category text,
  employee_type text,
  pay_frequency text,
  pay_type text,
  UNIQUE (type, source_table, source_id)
);

-- 2. Seed master with existing REGULAR groups from pay_groups (if any exist)
INSERT INTO public.pay_group_master (type, source_table, source_id, code, name, country, currency, active, category, employee_type, pay_frequency, pay_type)
SELECT
  'regular'::text, 
  'pay_groups'::text, 
  pg.id, 
  null::text, 
  pg.name, 
  pg.country, 
  'UGX'::text, 
  true,
  pg.category,
  pg.employee_type,
  pg.pay_frequency,
  pg.pay_type
FROM public.pay_groups pg
WHERE NOT EXISTS (
  SELECT 1 FROM public.pay_group_master pgm 
  WHERE pgm.source_table = 'pay_groups' AND pgm.source_id = pg.id
);

-- 3. Seed master with existing EXPATRIATE groups (if any exist)
INSERT INTO public.pay_group_master (type, source_table, source_id, code, name, country, currency, active, category, employee_type)
SELECT
  'expatriate'::text, 
  'expatriate_pay_groups'::text, 
  epg.id, 
  epg.paygroup_id, 
  epg.name, 
  epg.country, 
  epg.currency, 
  true,
  'head_office'::text,
  'expatriate'::text
FROM public.expatriate_pay_groups epg
WHERE NOT EXISTS (
  SELECT 1 FROM public.pay_group_master pgm 
  WHERE pgm.source_table = 'expatriate_pay_groups' AND pgm.source_id = epg.id
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_pay_group_master_type_active ON public.pay_group_master(type, active);
CREATE INDEX IF NOT EXISTS idx_pay_group_master_source ON public.pay_group_master(source_table, source_id);

-- 5. Enable RLS
ALTER TABLE public.pay_group_master ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS pgm_select ON public.pay_group_master;
DROP POLICY IF EXISTS pgm_insert ON public.pay_group_master;
DROP POLICY IF EXISTS pgm_update ON public.pay_group_master;
DROP POLICY IF EXISTS pgm_delete ON public.pay_group_master;

-- Allow all authenticated users to SELECT
CREATE POLICY pgm_select ON public.pay_group_master 
  FOR SELECT 
  USING (true);

-- Allow all authenticated users to INSERT
CREATE POLICY pgm_insert ON public.pay_group_master 
  FOR INSERT 
  WITH CHECK (true);

-- Allow all authenticated users to UPDATE
CREATE POLICY pgm_update ON public.pay_group_master 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to DELETE
CREATE POLICY pgm_delete ON public.pay_group_master 
  FOR DELETE 
  USING (true);
