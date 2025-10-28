-- ==========================================================
-- Fix Paygroup Employees Soft Delete Issue
-- ==========================================================
-- This SQL fixes the "Already Assigned" error by:
-- 1. Removing duplicate records
-- 2. Properly re-enabling soft-deleted valid records

-- STEP 1: Remove duplicate active assignments
-- Keep only the most recent assignment for each employee+paygroup combination
DELETE FROM paygroup_employees a
USING paygroup_employees b
WHERE a.id < b.id
  AND a.employee_id = b.employee_id
  AND a.pay_group_id = b.pay_group_id
  AND a.removed_at IS NULL
  AND b.removed_at IS NULL;

-- STEP 2: Re-enable soft-deleted records that belong to valid pay groups
-- This brings back valid assignments that were accidentally soft-deleted
UPDATE paygroup_employees pe
SET 
  removed_at = NULL, 
  active = TRUE,
  assigned_at = COALESCE(pe.assigned_at, NOW())
WHERE pe.removed_at IS NOT NULL
  AND pe.pay_group_id IN (SELECT id FROM pay_groups WHERE id IS NOT NULL)
  -- Only reactivate if there's no other active assignment for this employee+paygroup
  AND NOT EXISTS (
    SELECT 1 FROM paygroup_employees pe2
    WHERE pe2.employee_id = pe.employee_id
      AND pe2.pay_group_id = pe.pay_group_id
      AND pe2.id != pe.id
      AND pe2.removed_at IS NULL
      AND pe2.active = TRUE
  );

-- STEP 3: Verify the cleanup
-- Check for any remaining issues
SELECT 
  employee_id,
  pay_group_id,
  COUNT(*) as count,
  array_agg(id) as ids,
  array_agg(removed_at IS NULL) as active_flags
FROM paygroup_employees
GROUP BY employee_id, pay_group_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- STEP 4: Summary statistics
SELECT 
  'Total Assignments' as metric,
  COUNT(*) as value
FROM paygroup_employees
UNION ALL
SELECT 
  'Active Assignments',
  COUNT(*)
FROM paygroup_employees
WHERE removed_at IS NULL AND active = TRUE
UNION ALL
SELECT 
  'Soft-Deleted Assignments',
  COUNT(*)
FROM paygroup_employees
WHERE removed_at IS NOT NULL OR active = FALSE;
