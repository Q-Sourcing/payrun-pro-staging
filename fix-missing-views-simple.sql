-- Simple fix for missing views and functions
-- Run this in Supabase SQL Editor

-- Step 1: Ensure organization_id exists on tables (if not already added)
DO $$
BEGIN
  -- Add organization_id to pay_runs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pay_runs' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.pay_runs ADD COLUMN organization_id UUID;
    UPDATE public.pay_runs SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
  END IF;

  -- Add organization_id to employees if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN organization_id UUID;
    UPDATE public.employees SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
  END IF;
END $$;

-- Step 2: Create employee_master view
-- Only selects columns that exist, computes name from first_name + last_name
DROP VIEW IF EXISTS public.employee_master CASCADE;
CREATE VIEW public.employee_master AS
SELECT 
  id,
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) as organization_id,
  first_name,
  last_name,
  CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL THEN first_name
    WHEN last_name IS NOT NULL THEN last_name
    ELSE ''
  END as name,
  email,
  phone,
  employee_number,
  employee_type,
  employee_category,
  employment_status,
  pay_type,
  pay_rate,
  country,
  currency,
  pay_group_id,
  status,
  user_id,
  created_at,
  updated_at
FROM public.employees;

-- Step 3: Create master_payrolls view with correct column mappings
DROP VIEW IF EXISTS public.master_payrolls CASCADE;
CREATE VIEW public.master_payrolls AS
SELECT 
  id,
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) as organization_id,
  pay_run_date,
  pay_period_start,
  pay_period_end,
  pay_group_id,
  status::text as payroll_status,
  total_gross_pay as total_gross,
  total_deductions,
  total_net_pay as total_net,
  approved_by,
  approved_at,
  created_by,
  created_at,
  updated_at,
  (SELECT COUNT(DISTINCT employee_id) FROM public.pay_items WHERE pay_run_id = pay_runs.id) as total_employees
FROM public.pay_runs;

-- Step 4: Create get_org_total_payroll function
DROP FUNCTION IF EXISTS public.get_org_total_payroll(UUID);
CREATE FUNCTION public.get_org_total_payroll(org_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_net_pay), 0)::NUMERIC INTO total
  FROM public.pay_runs
  WHERE organization_id = org_id;
  RETURN total;
END;
$func$;

-- Step 5: Grant permissions
GRANT SELECT ON public.employee_master TO authenticated;
GRANT SELECT ON public.employee_master TO anon;
GRANT SELECT ON public.master_payrolls TO authenticated;
GRANT SELECT ON public.master_payrolls TO anon;
GRANT EXECUTE ON FUNCTION public.get_org_total_payroll(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_total_payroll(UUID) TO anon;

-- Step 6: Add comments
COMMENT ON VIEW public.employee_master IS 'View alias for employees table';
COMMENT ON VIEW public.master_payrolls IS 'View alias for pay_runs table with column mappings';
COMMENT ON FUNCTION public.get_org_total_payroll(UUID) IS 'Get total payroll for an organization';

