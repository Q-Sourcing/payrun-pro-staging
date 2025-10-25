-- ==========================================================
-- DRY RUN: Show what would be cleaned up (NO DELETES)
-- ==========================================================
-- Run this first to see what will be affected
-- Copy to Supabase SQL Editor and run

-- ==========================================================
-- IDENTIFY ISSUES
-- ==========================================================

-- 1. Show all duplicates
SELECT 
  'DUPLICATE' as issue_type,
  employee_id,
  pay_group_id,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY assigned_at DESC) as record_ids,
  ARRAY_AGG(assigned_at ORDER BY assigned_at DESC) as assigned_dates
FROM paygroup_employees
GROUP BY employee_id, pay_group_id
HAVING COUNT(*) > 1;

-- 2. Show orphan records
SELECT 
  'ORPHAN' as issue_type,
  pe.id,
  pe.employee_id,
  pe.pay_group_id,
  pe.assigned_at,
  pg.id as matching_pay_group
FROM paygroup_employees pe
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE pg.id IS NULL;

-- 3. Show which records WOULD BE KEPT (most recent assigned_at)
SELECT 
  'KEEP' as action,
  pe.id,
  pe.employee_id,
  pe.pay_group_id,
  pe.assigned_at,
  pe.active,
  e.first_name || ' ' || e.last_name as employee_name,
  pg.name as pay_group_name
FROM (
  SELECT 
    id,
    employee_id,
    pay_group_id,
    assigned_at,
    active,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id, pay_group_id 
      ORDER BY assigned_at DESC, id DESC
    ) as rn
  FROM paygroup_employees
) pe
INNER JOIN employees e ON pe.employee_id = e.id
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE pe.rn = 1;

-- 4. Show which records WOULD BE DELETED
SELECT 
  'DELETE' as action,
  pe.id,
  pe.employee_id,
  pe.pay_group_id,
  pe.assigned_at,
  pe.active,
  e.first_name || ' ' || e.last_name as employee_name,
  pg.name as pay_group_name
FROM (
  SELECT 
    id,
    employee_id,
    pay_group_id,
    assigned_at,
    active,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id, pay_group_id 
      ORDER BY assigned_at DESC, id DESC
    ) as rn
  FROM paygroup_employees
) pe
INNER JOIN employees e ON pe.employee_id = e.id
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE pe.rn > 1 OR pg.id IS NULL;

-- ==========================================================
-- SUMMARY
-- ==========================================================

-- Current state
SELECT 
  'CURRENT STATE' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  COUNT(DISTINCT CONCAT(employee_id, '-', pay_group_id)) as unique_assignments,
  COUNT(*) - COUNT(DISTINCT CONCAT(employee_id, '-', pay_group_id)) as duplicates_count
FROM paygroup_employees;

-- After cleanup (projected)
SELECT 
  'AFTER CLEANUP (PROJECTED)' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  COUNT(DISTINCT CONCAT(employee_id, '-', pay_group_id)) as unique_assignments
FROM (
  SELECT DISTINCT ON (employee_id, pay_group_id)
    id,
    employee_id,
    pay_group_id
  FROM paygroup_employees
  ORDER BY employee_id, pay_group_id, assigned_at DESC, id DESC
) sub;
