-- ==========================================================
-- Fix Duplicates and Orphan Records in paygroup_employees
-- ==========================================================
-- This script identifies and removes duplicate and orphan records
-- Run this in Supabase SQL Editor

-- ==========================================================
-- STEP 1: Identify duplicates (same employee_id + pay_group_id)
-- ==========================================================

SELECT 
  employee_id,
  pay_group_id,
  COUNT(*) as duplicate_count,
  MIN(id) as keep_id,
  ARRAY_AGG(id ORDER BY assigned_at DESC) as all_ids
FROM paygroup_employees
GROUP BY employee_id, pay_group_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ==========================================================
-- STEP 2: Show orphan records (pay_group_id doesn't exist)
-- ==========================================================

SELECT 
  pe.id,
  pe.employee_id,
  pe.pay_group_id,
  pe.assigned_at,
  'ORPHAN' as issue
FROM paygroup_employees pe
LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
WHERE pg.id IS NULL;

-- ==========================================================
-- STEP 3: Delete orphan records
-- ==========================================================

DELETE FROM paygroup_employees
WHERE id IN (
  SELECT pe.id
  FROM paygroup_employees pe
  LEFT JOIN pay_groups pg ON pe.pay_group_id = pg.id
  WHERE pg.id IS NULL
);

-- ==========================================================
-- STEP 4: Delete duplicate records (keep most recent)
-- ==========================================================

DELETE FROM paygroup_employees
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY employee_id, pay_group_id 
        ORDER BY assigned_at DESC, id DESC
      ) as rn
    FROM paygroup_employees
  ) sub
  WHERE rn > 1
);

-- ==========================================================
-- STEP 5: Add unique constraint to prevent future duplicates
-- ==========================================================

-- First, check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_employee_per_group'
  ) THEN
    ALTER TABLE paygroup_employees
    ADD CONSTRAINT unique_employee_per_group
    UNIQUE (employee_id, pay_group_id);
    
    RAISE NOTICE '✅ Added unique constraint unique_employee_per_group';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint unique_employee_per_group already exists';
  END IF;
END $$;

-- ==========================================================
-- STEP 6: Verification query
-- ==========================================================

-- Show final state
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  COUNT(DISTINCT pay_group_id) as unique_pay_groups
FROM paygroup_employees
WHERE active = true;

-- Show any remaining duplicates (should be 0)
SELECT 
  employee_id,
  pay_group_id,
  COUNT(*) as count
FROM paygroup_employees
GROUP BY employee_id, pay_group_id
HAVING COUNT(*) > 1;
