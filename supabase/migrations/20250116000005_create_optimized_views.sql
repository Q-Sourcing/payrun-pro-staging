-- Create optimized views for better query performance and reduced API calls

-- Drop existing views if they exist
DROP VIEW IF EXISTS paygroup_employees_view CASCADE;
DROP VIEW IF EXISTS paygroup_summary_view CASCADE;
DROP VIEW IF EXISTS employee_assignment_summary_view CASCADE;
DROP VIEW IF EXISTS pay_run_summary_view CASCADE;
DROP VIEW IF EXISTS dashboard_stats_view CASCADE;

-- 1. PayGroup Summary View - Combines regular and expatriate pay groups with employee counts
CREATE OR REPLACE VIEW paygroup_summary_view AS
WITH regular_paygroups AS (
  SELECT 
    id,
    'REGP-' || UPPER(SUBSTRING(country, 1, 1)) || SUBSTRING(id::text, 1, 3) as paygroup_id,
    name,
    'regular' as type,
    country,
    'UGX' as currency,
    'active' as status,
    COALESCE(emp_counts.employee_count, 0) as employee_count,
    created_at,
    updated_at,
    pay_frequency::text,
    default_tax_percentage,
    NULL::numeric as exchange_rate_to_local,
    NULL::text as tax_country,
    description as notes
  FROM pay_groups pg
  LEFT JOIN (
    SELECT 
      pay_group_id,
      COUNT(*) as employee_count
    FROM paygroup_employees
    WHERE active = true
    GROUP BY pay_group_id
  ) emp_counts ON pg.id = emp_counts.pay_group_id
),
expatriate_paygroups AS (
  SELECT 
    id,
    paygroup_id,
    name,
    'expatriate' as type,
    country,
    currency,
    'active' as status,
    COALESCE(emp_counts.employee_count, 0) as employee_count,
    created_at,
    updated_at,
    NULL::text as pay_frequency,
    NULL::numeric as default_tax_percentage,
    exchange_rate_to_local,
    tax_country,
    notes
  FROM expatriate_pay_groups epg
  LEFT JOIN (
    SELECT 
      pay_group_id,
      COUNT(*) as employee_count
    FROM paygroup_employees
    WHERE active = true
    GROUP BY pay_group_id
  ) emp_counts ON epg.id = emp_counts.pay_group_id
)
SELECT * FROM regular_paygroups
UNION ALL
SELECT * FROM expatriate_paygroups
ORDER BY created_at DESC;

-- 2. PayGroup Employees View - Optimized join with employee and pay group details
CREATE OR REPLACE VIEW paygroup_employees_view AS
SELECT 
  pe.id,
  pe.employee_id,
  pe.pay_group_id,
  pe.active,
  pe.assigned_at,
  pe.removed_at,
  pe.assigned_by,
  pe.notes,
  -- Employee details
  e.first_name,
  e.middle_name,
  e.last_name,
  e.email,
  e.employee_type,
  e.department,
  e.created_at as employee_created_at,
  -- Pay group details (from regular pay groups)
  pg.name as pay_group_name,
  'regular' as pay_group_type,
  pg.country as pay_group_country,
  'UGX' as pay_group_currency,
  pg.pay_frequency,
  pg.default_tax_percentage,
  -- Expatriate pay group details (if applicable)
  epg.name as expatriate_pay_group_name,
  epg.currency as expatriate_currency,
  epg.exchange_rate_to_local,
  epg.tax_country
FROM paygroup_employees pe
INNER JOIN employees e ON pe.employee_id = e.id
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
LEFT JOIN expatriate_pay_groups epg ON pe.pay_group_id = epg.id
WHERE pe.active = true;

-- 3. Employee Assignment Summary View - Shows current assignments for each employee
CREATE OR REPLACE VIEW employee_assignment_summary_view AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.middle_name,
  e.last_name,
  e.email,
  e.employee_type,
  e.department,
  -- Current pay group assignment
  pe.pay_group_id as current_pay_group_id,
  COALESCE(pg.name, epg.name) as current_pay_group_name,
  CASE 
    WHEN pg.id IS NOT NULL THEN 'regular'
    WHEN epg.id IS NOT NULL THEN 'expatriate'
    ELSE 'unknown'
  END as current_pay_group_type,
  COALESCE(pg.country, epg.country) as current_pay_group_country,
  COALESCE('UGX', epg.currency) as current_pay_group_currency,
  pe.assigned_at as current_assignment_date,
  pe.assigned_by as current_assigned_by,
  -- Assignment status
  CASE 
    WHEN pe.id IS NOT NULL THEN 'assigned'
    ELSE 'unassigned'
  END as assignment_status
FROM employees e
LEFT JOIN paygroup_employees pe ON e.id = pe.employee_id AND pe.active = true
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
LEFT JOIN expatriate_pay_groups epg ON pe.pay_group_id = epg.id;

-- 4. Pay Run Summary View - Optimized pay run data with employee counts
CREATE OR REPLACE VIEW pay_run_summary_view AS
SELECT 
  pr.id,
  pr.pay_group_id,
  pr.pay_period_start,
  pr.pay_period_end,
  pr.status,
  pr.total_gross_pay,
  pr.total_deductions,
  pr.total_net_pay,
  pr.created_at,
  pr.updated_at,
  -- Pay group details
  COALESCE(pg.name, epg.name) as pay_group_name,
  CASE 
    WHEN pg.id IS NOT NULL THEN 'regular'
    WHEN epg.id IS NOT NULL THEN 'expatriate'
    ELSE 'unknown'
  END as pay_group_type,
  COALESCE(pg.country, epg.country) as pay_group_country,
  COALESCE('UGX', epg.currency) as pay_group_currency,
  -- Employee count for this pay run
  COALESCE(emp_counts.employee_count, 0) as employee_count
FROM pay_runs pr
LEFT JOIN pay_groups pg ON pr.pay_group_id = pg.id
LEFT JOIN expatriate_pay_groups epg ON pr.pay_group_id = epg.id
LEFT JOIN (
  SELECT 
    pay_group_id,
    COUNT(*) as employee_count
  FROM paygroup_employees
  WHERE active = true
  GROUP BY pay_group_id
) emp_counts ON pr.pay_group_id = emp_counts.pay_group_id;

-- 5. Dashboard Statistics View - Aggregated stats for dashboard
CREATE OR REPLACE VIEW dashboard_stats_view AS
SELECT 
  -- Employee statistics
  (SELECT COUNT(*) FROM employees) as total_employees,
  (SELECT COUNT(*) FROM employees WHERE employee_type = 'regular') as regular_employees,
  (SELECT COUNT(*) FROM employees WHERE employee_type = 'expatriate') as expatriate_employees,
  (SELECT COUNT(*) FROM employees WHERE employee_type = 'contractor') as contractor_employees,
  (SELECT COUNT(*) FROM employees WHERE employee_type = 'intern') as intern_employees,
  
  -- Pay group statistics
  (SELECT COUNT(*) FROM paygroup_summary_view) as total_pay_groups,
  (SELECT COUNT(*) FROM paygroup_summary_view WHERE type = 'regular') as regular_pay_groups,
  (SELECT COUNT(*) FROM paygroup_summary_view WHERE type = 'expatriate') as expatriate_pay_groups,
  
  -- Assignment statistics
  (SELECT COUNT(*) FROM paygroup_employees WHERE active = true) as total_assignments,
  (SELECT COUNT(*) FROM employees) - (SELECT COUNT(*) FROM paygroup_employees WHERE active = true) as unassigned_employees,
  
  -- Pay run statistics
  (SELECT COUNT(*) FROM pay_runs) as total_pay_runs,
  (SELECT COUNT(*) FROM pay_runs WHERE status = 'completed') as completed_pay_runs,
  (SELECT COUNT(*) FROM pay_runs WHERE status = 'pending') as pending_pay_runs,
  
  -- Financial statistics
  (SELECT COALESCE(SUM(total_gross_pay), 0) FROM pay_runs WHERE status = 'completed') as total_gross_paid,
  (SELECT COALESCE(SUM(total_net_pay), 0) FROM pay_runs WHERE status = 'completed') as total_net_paid,
  (SELECT COALESCE(SUM(total_deductions), 0) FROM pay_runs WHERE status = 'completed') as total_deductions;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_active_pay_group_id ON paygroup_employees(active, pay_group_id);
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_active_employee_id ON paygroup_employees(active, employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON employees(employee_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_status ON pay_runs(status);
CREATE INDEX IF NOT EXISTS idx_pay_runs_pay_group_id ON pay_runs(pay_group_id);

-- Grant permissions
GRANT SELECT ON paygroup_summary_view TO authenticated;
GRANT SELECT ON paygroup_employees_view TO authenticated;
GRANT SELECT ON employee_assignment_summary_view TO authenticated;
GRANT SELECT ON pay_run_summary_view TO authenticated;
GRANT SELECT ON dashboard_stats_view TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW paygroup_summary_view IS 'Combined view of regular and expatriate pay groups with employee counts';
COMMENT ON VIEW paygroup_employees_view IS 'Optimized view joining paygroup_employees with employee and pay group details';
COMMENT ON VIEW employee_assignment_summary_view IS 'Shows current pay group assignment for each employee';
COMMENT ON VIEW pay_run_summary_view IS 'Pay runs with pay group details and employee counts';
COMMENT ON VIEW dashboard_stats_view IS 'Aggregated statistics for dashboard display';
