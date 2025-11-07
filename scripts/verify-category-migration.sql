-- ===============================================================
-- CATEGORY HIERARCHY MIGRATION VERIFICATION SCRIPT
-- ===============================================================
-- Purpose: Verify that category/sub_type/pay_frequency migration was applied correctly
-- Run this in Supabase Dashboard > SQL Editor or via CLI
-- ===============================================================

-- Check if columns exist
SELECT '📋 COLUMN VERIFICATION' as section;

SELECT 
  'pay_groups' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_groups' AND column_name = 'category') THEN '✅' ELSE '❌' END as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_groups' AND column_name = 'sub_type') THEN '✅' ELSE '❌' END as sub_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_groups' AND column_name = 'pay_frequency') THEN '✅' ELSE '❌' END as pay_frequency;

SELECT 
  'employees' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'category') THEN '✅' ELSE '❌' END as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'sub_type') THEN '✅' ELSE '❌' END as sub_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pay_frequency') THEN '✅' ELSE '❌' END as pay_frequency;

SELECT 
  'pay_runs' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_runs' AND column_name = 'category') THEN '✅' ELSE '❌' END as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_runs' AND column_name = 'sub_type') THEN '✅' ELSE '❌' END as sub_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_runs' AND column_name = 'pay_frequency') THEN '✅' ELSE '❌' END as pay_frequency;

SELECT 
  'pay_group_master' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_group_master' AND column_name = 'category') THEN '✅' ELSE '❌' END as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_group_master' AND column_name = 'sub_type') THEN '✅' ELSE '❌' END as sub_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_group_master' AND column_name = 'pay_frequency') THEN '✅' ELSE '❌' END as pay_frequency;

-- Check data migration
SELECT '📊 DATA MIGRATION VERIFICATION' as section;

SELECT 
  'pay_groups' as table_name,
  category,
  sub_type,
  pay_frequency,
  COUNT(*) as count
FROM pay_groups
GROUP BY category, sub_type, pay_frequency
ORDER BY category, sub_type, pay_frequency;

SELECT 
  'employees' as table_name,
  category,
  sub_type,
  pay_frequency,
  COUNT(*) as count
FROM employees
GROUP BY category, sub_type, pay_frequency
ORDER BY category, sub_type, pay_frequency;

SELECT 
  'pay_runs' as table_name,
  category,
  sub_type,
  pay_frequency,
  COUNT(*) as count
FROM pay_runs
GROUP BY category, sub_type, pay_frequency
ORDER BY category, sub_type, pay_frequency;

-- Check for unmigrated records
SELECT '⚠️ UNMIGRATED RECORDS CHECK' as section;

SELECT 
  'pay_groups' as table_name,
  COUNT(*) as unmigrated_count
FROM pay_groups
WHERE category IS NULL OR sub_type IS NULL;

SELECT 
  'employees' as table_name,
  COUNT(*) as unmigrated_count
FROM employees
WHERE category IS NULL AND sub_type IS NULL;

SELECT 
  'pay_runs' as table_name,
  COUNT(*) as unmigrated_count
FROM pay_runs
WHERE category IS NULL OR sub_type IS NULL;

-- Check constraints
SELECT '🔒 CONSTRAINT VERIFICATION' as section;

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'pay_groups'::regclass
AND conname LIKE '%category%' OR conname LIKE '%sub_type%' OR conname LIKE '%pay_frequency%';

-- Summary
SELECT '✅ VERIFICATION COMPLETE' as section;

