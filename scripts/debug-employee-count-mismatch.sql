-- ==========================================================
-- Debug Employee Count Mismatch
-- ==========================================================
-- This script helps identify why counts don't match

-- ==========================================================
-- 1. Total employees in employees table
-- ==========================================================
SELECT 
  'Total Employees (employees table)' as metric,
  COUNT(*) as count
FROM employees;

-- ==========================================================
-- 2. Employees with pay_group_id in employees table (OLD WAY)
-- ==========================================================
SELECT 
  'Employees with pay_group_id (employees table)' as metric,
  COUNT(*) as count
FROM employees
WHERE pay_group_id IS NOT NULL;

-- ==========================================================
-- 3. Total active assignments in paygroup_employees
-- ==========================================================
SELECT 
  'Active Assignments (paygroup_employees)' as metric,
  COUNT(*) as count
FROM paygroup_employees
WHERE active = true;

-- ==========================================================
-- 4. Breakdown by pay group
-- ==========================================================
SELECT 
  pg.name as pay_group_name,
  pg.id as pay_group_id,
  COUNT(DISTINCT e.id) as employees_with_pay_group_id,
  COUNT(DISTINCT pe.employee_id) as active_assignments
FROM pay_groups pg
LEFT JOIN employees e ON e.pay_group_id = pg.id
LEFT JOIN paygroup_employees pe ON pe.pay_group_id = pg.id AND pe.active = true
GROUP BY pg.id, pg.name
ORDER BY pg.name;

-- ==========================================================
-- 5. Employees assigned via paygroup_employees (NEW WAY)
-- ==========================================================
SELECT 
  'Unique Employees in paygroup_employees' as metric,
  COUNT(DISTINCT employee_id) as count
FROM paygroup_employees
WHERE active = true;

-- ==========================================================
-- 6. Employees with pay_group_id but NOT in paygroup_employees
-- ==========================================================
SELECT 
  e.id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name,
  'HAS pay_group_id but NOT in paygroup_employees' as issue
FROM employees e
INNER JOIN pay_groups pg ON e.pay_group_id = pg.id
LEFT JOIN paygroup_employees pe ON pe.employee_id = e.id AND pe.pay_group_id = pg.id AND pe.active = true
WHERE pe.employee_id IS NULL;

-- ==========================================================
-- 7. Employees in paygroup_employees but pay_group_id doesn't match
-- ==========================================================
SELECT 
  e.id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id as employees_pay_group_id,
  pe.pay_group_id as assignment_pay_group_id,
  'pay_group_id mismatch' as issue
FROM paygroup_employees pe
INNER JOIN employees e ON pe.employee_id = e.id
WHERE pe.active = true
  AND e.pay_group_id IS NOT NULL
  AND e.pay_group_id != pe.pay_group_id;
