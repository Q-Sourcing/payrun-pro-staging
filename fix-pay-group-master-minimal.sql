-- Minimal fix for pay_group_master table
-- Only creates the table and RLS policies, no seeding

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

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_pay_group_master_type_active ON public.pay_group_master(type, active);
CREATE INDEX IF NOT EXISTS idx_pay_group_master_source ON public.pay_group_master(source_table, source_id);

-- 3. Enable RLS
ALTER TABLE public.pay_group_master ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
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
