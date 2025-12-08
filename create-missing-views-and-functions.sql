-- Create missing views and functions for multi-tenant system
-- This fixes 404 errors for master_payrolls, employee_master, and get_org_total_payroll

-- 1. Create employee_master view (alias for employees with organization_id)
-- Uses COALESCE to handle missing organization_id column gracefully
CREATE OR REPLACE VIEW public.employee_master AS
SELECT 
  id,
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) as organization_id,
  first_name,
  last_name,
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

-- Grant access to the view
GRANT SELECT ON public.employee_master TO authenticated;
GRANT SELECT ON public.employee_master TO anon;

-- 2. Create master_payrolls view (alias for pay_runs with organization_id)
-- Maps columns to match what the frontend expects
CREATE OR REPLACE VIEW public.master_payrolls AS
SELECT 
  id,
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) as organization_id,
  pay_run_date,
  pay_period_start,
  pay_period_end,
  pay_group_id,
  status as payroll_status,  -- Map status to payroll_status
  total_gross_pay as total_gross,  -- Map total_gross_pay to total_gross
  total_deductions,
  total_net_pay as total_net,  -- Map total_net_pay to total_net
  approved_by,
  approved_at,
  created_by,
  created_at,
  updated_at,
  -- Calculate total_employees from pay_items for this pay_run
  (SELECT COUNT(DISTINCT employee_id) FROM public.pay_items WHERE pay_run_id = pay_runs.id) as total_employees
FROM public.pay_runs;

-- Grant access to the view
GRANT SELECT ON public.master_payrolls TO authenticated;
GRANT SELECT ON public.master_payrolls TO anon;

-- 3. Create get_org_total_payroll RPC function
-- Returns a single row with totals (not a table)
CREATE OR REPLACE FUNCTION public.get_org_total_payroll(org_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(pr.total_net_pay), 0)::NUMERIC INTO total
  FROM public.pay_runs pr
  WHERE pr.organization_id = org_id;
  
  RETURN total;
END;
$func$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_org_total_payroll(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_total_payroll(UUID) TO anon;

-- 4. Enable RLS on views (if needed)
-- Note: Views inherit RLS from underlying tables, but we can add policies if needed

-- Add comments
COMMENT ON VIEW public.employee_master IS 'View alias for employees table with organization_id for multi-tenant queries';
COMMENT ON VIEW public.master_payrolls IS 'View alias for pay_runs table with organization_id for multi-tenant queries';
COMMENT ON FUNCTION public.get_org_total_payroll(UUID) IS 'Calculate total payroll statistics for an organization';

