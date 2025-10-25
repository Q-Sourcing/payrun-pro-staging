-- ==========================================================
-- Check for Inactive or Conflicting Records
-- ==========================================================
-- This checks for records that might be blocking the insert

-- Check ALL records for the 2 employees (including inactive)
SELECT 
  'ALL RECORDS (including inactive)' as section,
  pe.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  pe.pay_group_id,
  pg.name as pay_group_name,
  pe.active,
  pe.assigned_at,
  pe.removed_at
FROM paygroup_employees pe
INNER JOIN employees e ON pe.employee_id = e.id
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE e.id IN (
  '6278cc9e-6e30-43d8-82dc-852270babae5', -- Employee One
  'd8579383-da0c-4f70-b675-de7cfedfe02f'  -- Kevin Test
)
ORDER BY e.first_name, pe.active;

-- Check if there are any inactive records that need to be reactivated
SELECT 
  'INACTIVE RECORDS - Need to activate' as section,
  pe.id,
  pe.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  pe.pay_group_id,
  pg.name as pay_group_name,
  pe.active,
  pe.assigned_at
FROM paygroup_employees pe
INNER JOIN employees e ON pe.employee_id = e.id
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE e.id IN (
  '6278cc9e-6e30-43d8-82dc-852270babae5',
  'd8579383-da0c-4f70-b675-de7cfedfe02f'
)
AND pe.active = false;

-- Try to activate inactive records
UPDATE paygroup_employees
SET active = true,
    assigned_at = COALESCE(assigned_at, NOW()),
    removed_at = NULL
WHERE employee_id IN (
  '6278cc9e-6e30-43d8-82dc-852270babae5',
  'd8579383-da0c-4f70-b675-de7cfedfe02f'
)
AND active = false;

-- Show final state
SELECT 
  'FINAL STATE' as section,
  COUNT(CASE WHEN active = true THEN 1 END) as active_count,
  COUNT(CASE WHEN active = false THEN 1 END) as inactive_count,
  COUNT(*) as total_count
FROM paygroup_employees
WHERE employee_id IN (
  '6278cc9e-6e30-43d8-82dc-852270babae5',
  'd8579383-da0c-4f70-b675-de7cfedfe02f'
);
