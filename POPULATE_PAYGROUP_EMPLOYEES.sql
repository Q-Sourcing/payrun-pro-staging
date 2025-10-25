-- ==========================================================
-- 🔧 Populate PayGroup Employees from Existing Employee Data
-- ==========================================================
-- This script populates the paygroup_employees table based on existing employee data
-- Run this SQL in your Supabase Dashboard SQL Editor

-- First, let's see what we have
SELECT 'Current employees with pay_group_id:' as info;
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.email,
  e.pay_group_id,
  pg.name as pay_group_name,
  pg.type as pay_group_type
FROM employees e
LEFT JOIN pay_groups pg ON pg.id = e.pay_group_id
WHERE e.status = 'active'
ORDER BY e.first_name;

-- Insert paygroup_employees records based on existing employee.pay_group_id
INSERT INTO paygroup_employees (
  employee_id,
  pay_group_id,
  active,
  assigned_at,
  notes
)
SELECT 
  e.id as employee_id,
  e.pay_group_id,
  true as active,
  NOW() as assigned_at,
  'Migrated from existing employee.pay_group_id' as notes
FROM employees e
WHERE e.pay_group_id IS NOT NULL
  AND e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM paygroup_employees pe 
    WHERE pe.employee_id = e.id 
    AND pe.pay_group_id = e.pay_group_id
  )
ON CONFLICT (employee_id, pay_group_id) DO NOTHING;

-- Verify the results
SELECT 'PayGroup Employees after migration:' as info;
SELECT 
  pe.id,
  pe.employee_id,
  pe.pay_group_id,
  pe.active,
  e.first_name,
  e.last_name,
  pg.name as pay_group_name
FROM paygroup_employees pe
JOIN employees e ON e.id = pe.employee_id
JOIN pay_groups pg ON pg.id = pe.pay_group_id
WHERE pe.active = true
ORDER BY pg.name, e.first_name;

-- Show employee counts per pay group
SELECT 'Employee counts per pay group:' as info;
SELECT 
  pg.name as pay_group_name,
  pg.type as pay_group_type,
  COUNT(pe.employee_id) as employee_count
FROM pay_groups pg
LEFT JOIN paygroup_employees pe ON pe.pay_group_id = pg.id AND pe.active = true
GROUP BY pg.id, pg.name, pg.type
ORDER BY pg.name;
