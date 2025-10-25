-- ==========================================================
-- Insert Missing 2 Employee Assignments
-- ==========================================================
-- This inserts the missing assignments for Employee One and Kevin Test

-- Show what will be inserted
SELECT 
  'WILL INSERT' as action,
  e.id as employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name,
  e.created_at as assigned_at
FROM employees e
INNER JOIN pay_groups pg ON e.pay_group_id = pg.id
WHERE e.id IN (
  '6278cc9e-6e30-43d8-82dc-852270babae5', -- Employee One
  'd8579383-da0c-4f70-b675-de7cfedfe02f'  -- Kevin Test
);

-- Insert the missing assignments
INSERT INTO paygroup_employees (employee_id, pay_group_id, assigned_at, active)
SELECT 
  e.id as employee_id,
  e.pay_group_id,
  COALESCE(e.created_at, NOW()) as assigned_at,
  true as active
FROM employees e
WHERE e.id IN (
  '6278cc9e-6e30-43d8-82dc-852270babae5', -- Employee One
  'd8579383-da0c-4f70-b675-de7cfedfe02f'  -- Kevin Test
)
ON CONFLICT (employee_id, pay_group_id) DO NOTHING;

-- Verify the insertion
SELECT 
  'VERIFICATION - Should show 6 now' as status,
  COUNT(*) as active_assignments
FROM paygroup_employees
WHERE active = true;

-- Show final comparison
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
