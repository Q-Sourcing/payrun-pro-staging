-- ==========================================================
-- 📊 Create Analytics Views for Payroll Reporting
-- ==========================================================
-- This script creates SQL views for better dashboarding and reporting
-- Run this SQL in your Supabase Dashboard SQL Editor

-- View 1: Active pay runs with comprehensive employee and pay group information
CREATE OR REPLACE VIEW vw_active_payruns AS
SELECT
  pr.id AS pay_run_id,
  pr.pay_run_date,
  pr.pay_period_start,
  pr.pay_period_end,
  pg.type AS payroll_type,
  pg.name AS pay_group_name,
  e.employee_type,
  e.employee_category,
  e.employment_status,
  e.pay_type,
  e.country,
  e.currency,
  e.first_name,
  e.last_name,
  e.employee_number,
  pr.net_pay,
  pr.created_at
FROM pay_runs pr
LEFT JOIN pay_groups pg ON pr.pay_group_id = pg.id
LEFT JOIN employees e ON e.id = pr.employee_id
WHERE
  (
    e.employment_status = 'Active'
    OR pr.pay_run_date >= (NOW() - INTERVAL '90 days')
  )
ORDER BY pr.created_at DESC;

-- View 2: Payroll summary by type and category
CREATE OR REPLACE VIEW vw_payroll_summary AS
SELECT
  pg.type AS payroll_type,
  e.employee_category,
  COUNT(DISTINCT pr.id) AS total_payruns,
  COUNT(DISTINCT e.id) AS total_employees,
  SUM(pr.net_pay) AS total_payout,
  AVG(pr.net_pay) AS avg_net_pay,
  MIN(pr.pay_run_date) AS first_payrun_date,
  MAX(pr.pay_run_date) AS last_payrun_date
FROM pay_runs pr
LEFT JOIN pay_groups pg ON pr.pay_group_id = pg.id
LEFT JOIN employees e ON e.id = pr.employee_id
WHERE e.employment_status = 'Active'
GROUP BY pg.type, e.employee_category
ORDER BY pg.type, e.employee_category;

-- View 3: Employee summary by type and category
CREATE OR REPLACE VIEW vw_employee_summary AS
SELECT
  employee_type,
  employee_category,
  employment_status,
  COUNT(*) AS employee_count,
  AVG(pay_rate) AS avg_pay_rate,
  COUNT(CASE WHEN pay_type = 'daily_rate' THEN 1 END) AS daily_rate_employees,
  COUNT(CASE WHEN pay_type = 'salary' THEN 1 END) AS salary_employees,
  COUNT(CASE WHEN pay_type = 'hourly' THEN 1 END) AS hourly_employees,
  COUNT(CASE WHEN pay_type = 'piece_rate' THEN 1 END) AS piece_rate_employees
FROM employees
GROUP BY employee_type, employee_category, employment_status
ORDER BY employee_type, employee_category, employment_status;

-- Grant necessary permissions
GRANT SELECT ON vw_active_payruns TO authenticated;
GRANT SELECT ON vw_payroll_summary TO authenticated;
GRANT SELECT ON vw_employee_summary TO authenticated;

-- Test queries to verify the views work
SELECT 'Testing vw_active_payruns...' as test_status;
SELECT COUNT(*) as payrun_count FROM vw_active_payruns;

SELECT 'Testing vw_payroll_summary...' as test_status;
SELECT COUNT(*) as summary_count FROM vw_payroll_summary;

SELECT 'Testing vw_employee_summary...' as test_status;
SELECT COUNT(*) as employee_summary_count FROM vw_employee_summary;

SELECT 'Analytics views created successfully!' as status;
