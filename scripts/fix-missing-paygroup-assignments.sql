-- ==========================================================
-- Fix Missing Paygroup Employee Assignments
-- ==========================================================
-- This script inserts missing records into paygroup_employees
-- for employees that have pay_group_id set

-- ==========================================================
-- STEP 1: Show employees that need fixing
-- ==========================================================
SELECT 
  e.id as employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name,
  'NEEDS FIX' as status
FROM employees e
INNER JOIN pay_groups pg ON e.pay_group_id = pg.id
LEFT JOIN paygroup_employees pe ON pe.employee_id = e.id AND pe.pay_group_id = e.pay_group_id AND pe.active = true
WHERE pe.employee_id IS NULL;

-- ==========================================================
-- STEP 2: Insert missing assignments
-- ==========================================================
INSERT INTO paygroup_employees (employee_id, pay_group_id, assigned_at, active)
SELECT 
  e.id as employee_id,
  e.pay_group_id,
  COALESCE(e.created_at, NOW()) as assigned_at,
  true as active
FROM employees e
INNER JOIN pay_groups pg ON e.pay_group_id = pg.id
LEFT JOIN paygroup_employees pe ON pe.employee_id = e.id AND pe.pay_group_id = e.pay_group_id AND pe.active = true
WHERE pe.employee_id IS NULL
  AND e.pay_group_id IS NOT NULL
ON CONFLICT (employee_id, pay_group_id) DO NOTHING;

-- ==========================================================
-- STEP 3: Verification - Should show 0 rows
-- ==========================================================
SELECT 
  e.id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name,
  'STILL MISSING' as status
FROM employees e
INNER JOIN pay_groups pg ON e.pay_group_id = pg.id
LEFT JOIN paygroup_employees pe ON pe.employee_id = e.id AND pe.pay_group_id = pg.id AND pe.active = true
WHERE pe.employee_id IS NULL;

-- ==========================================================
-- STEP 4: Final count comparison
-- ==========================================================
SELECT 
  'Employees with pay_group_id' as metric,
  COUNT(*) as count
FROM employees
WHERE pay_group_id IS NOT NULL

UNION ALL

SELECT 
  'Active assignments in paygroup_employees' as metric,
  COUNT(*) as count
FROM paygroup_employees
WHERE active = true;
