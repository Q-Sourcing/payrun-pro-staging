-- ==========================================================
-- Debug Specific Missing Assignments
-- ==========================================================
-- This shows exactly which employees are missing

-- Show all employees with pay_group_id
SELECT 
  'Employees with pay_group_id' as section,
  e.id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name
FROM employees e
LEFT JOIN pay_groups pg ON e.pay_group_id = pg.id
WHERE e.pay_group_id IS NOT NULL
ORDER BY e.first_name;

-- Show all active assignments in paygroup_employees
SELECT 
  'Active assignments in paygroup_employees' as section,
  pe.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  pe.pay_group_id,
  pg.name as pay_group_name
FROM paygroup_employees pe
INNER JOIN employees e ON pe.employee_id = e.id
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE pe.active = true
ORDER BY e.first_name;

-- Show missing assignments
SELECT 
  'MISSING ASSIGNMENTS' as section,
  e.id as employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name
FROM employees e
INNER JOIN pay_groups pg ON e.pay_group_id = pg.id
LEFT JOIN paygroup_employees pe ON pe.employee_id = e.id 
  AND pe.pay_group_id = e.pay_group_id 
  AND pe.active = true
WHERE pe.employee_id IS NULL
ORDER BY e.first_name;
