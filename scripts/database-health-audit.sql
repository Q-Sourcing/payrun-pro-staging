-- ===============================================================
-- PAYRUN PRO DATABASE HEALTH AUDIT
-- ===============================================================
-- Purpose: Comprehensive database health check for PayRun Pro system
-- Author: Senior Supabase + PostgreSQL Reliability Engineer
-- ===============================================================

-- 🔍 SCHEMA CONSISTENCY CHECK
-- ===============================================================
SELECT '🔍 SCHEMA CONSISTENCY CHECK' as audit_section;

-- Check if all expected tables exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
    THEN '✅ employees table exists'
    ELSE '❌ employees table missing'
  END as employees_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_groups') 
    THEN '✅ pay_groups table exists'
    ELSE '❌ pay_groups table missing'
  END as pay_groups_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') 
    THEN '✅ paygroup_employees table exists'
    ELSE '❌ paygroup_employees table missing'
  END as paygroup_employees_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') 
    THEN '✅ payroll_configurations table exists'
    ELSE '❌ payroll_configurations table missing'
  END as payroll_config_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') 
    THEN '✅ expatriate_pay_groups table exists'
    ELSE '❌ expatriate_pay_groups table missing'
  END as expatriate_pay_groups_check;

-- 🧱 MIGRATION HEALTH CHECK
-- ===============================================================
SELECT '🧱 MIGRATION HEALTH CHECK' as audit_section;

-- Check if employee identification fields exist (from our integration)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') 
    THEN '✅ national_id column exists'
    ELSE '❌ national_id column missing'
  END as national_id_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tin') 
    THEN '✅ tin column exists'
    ELSE '❌ tin column missing'
  END as tin_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'social_security_number') 
    THEN '✅ social_security_number column exists'
    ELSE '❌ social_security_number column missing'
  END as ssn_check;

-- 🔐 RLS POLICY & TRIGGER INTEGRITY CHECK
-- ===============================================================
SELECT '🔐 RLS POLICY & TRIGGER INTEGRITY CHECK' as audit_section;

-- Check if Row-Level Security is enabled for all protected tables
SELECT 
  relname as table_name, 
  CASE 
    WHEN relrowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_class
WHERE relname IN ('employees','pay_groups','paygroup_employees','expatriate_pay_groups')
AND relkind = 'r'
ORDER BY relname;

-- Check if expected policies exist
SELECT 
  policyname, 
  tablename,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ Policy exists'
    ELSE '❌ Policy missing'
  END as policy_status
FROM pg_policies
WHERE tablename IN ('employees','paygroup_employees','pay_groups','expatriate_pay_groups')
ORDER BY tablename, policyname;

-- Check triggers existence and status
SELECT 
  tgname as trigger_name, 
  relname as table_name,
  CASE 
    WHEN tgname IS NOT NULL THEN '✅ Trigger exists'
    ELSE '❌ Trigger missing'
  END as trigger_status
FROM pg_trigger 
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE relname IN ('paygroup_employees','employees','expatriate_pay_groups')
AND NOT tgisinternal
ORDER BY relname, tgname;

-- Check trigger function presence
SELECT 
  routine_name, 
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as function_status
FROM information_schema.routines
WHERE routine_name = 'enforce_unique_or_smart_paygroup_assignment';

-- ⚙️ CONSTRAINT AND INDEX AUDIT
-- ===============================================================
SELECT '⚙️ CONSTRAINT AND INDEX AUDIT' as audit_section;

-- Detect tables missing primary keys
SELECT 
  tablename,
  CASE 
    WHEN tablename NOT IN (
      SELECT DISTINCT table_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type='PRIMARY KEY'
    ) THEN '❌ Missing Primary Key'
    ELSE '✅ Primary Key exists'
  END as pk_status
FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('employees','pay_groups','paygroup_employees','expatriate_pay_groups','payroll_configurations')
ORDER BY tablename;

-- Check for missing foreign key references
SELECT 
  conrelid::regclass as table_name, 
  conname, 
  confrelid::regclass as referenced_table,
  CASE 
    WHEN confrelid IS NULL THEN '❌ Invalid FK reference'
    ELSE '✅ Valid FK reference'
  END as fk_status
FROM pg_constraint
WHERE contype='f'
AND conrelid::regclass::text IN ('employees','pay_groups','paygroup_employees','expatriate_pay_groups','payroll_configurations');

-- Check for missing performance indexes
SELECT 
  relname as table_name, 
  indexrelname as index_name, 
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️ Index unused'
    WHEN idx_scan > 0 THEN '✅ Index active'
    ELSE '❌ Index missing'
  END as index_status
FROM pg_stat_user_indexes
WHERE relname IN ('employees','pay_groups','paygroup_employees','expatriate_pay_groups')
ORDER BY idx_scan ASC;

-- Check specific indexes we expect
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_national_id') 
    THEN '✅ idx_employees_national_id exists'
    ELSE '❌ idx_employees_national_id missing'
  END as national_id_index_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_group') 
    THEN '✅ idx_pge_group exists'
    ELSE '❌ idx_pge_group missing'
  END as paygroup_employees_index_check;

-- 🔐 AUTH AND POLICY VERIFICATION
-- ===============================================================
SELECT '🔐 AUTH AND POLICY VERIFICATION' as audit_section;

-- Verify Supabase Auth users vs. application users
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM users) as app_users_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM users) 
    THEN '✅ Auth sync OK'
    ELSE '⚠️ Auth sync mismatch'
  END as auth_sync_status;

-- 💾 DATA INTEGRITY CHECK
-- ===============================================================
SELECT '💾 DATA INTEGRITY CHECK' as audit_section;

-- Check for orphaned records
SELECT 
  'paygroup_employees' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN pay_group_id IS NULL THEN 1 END) as null_pay_group_ids,
  COUNT(CASE WHEN employee_id IS NULL THEN 1 END) as null_employee_ids
FROM paygroup_employees;

-- Check PayGroup ID format consistency
SELECT 
  'pay_groups' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN paygroup_id LIKE '%-%-%' THEN 1 END) as new_format_ids,
  COUNT(CASE WHEN paygroup_id NOT LIKE '%-%-%' OR paygroup_id IS NULL THEN 1 END) as old_format_ids
FROM pay_groups;

-- 🎯 SUMMARY REPORT
-- ===============================================================
SELECT '🎯 SUMMARY REPORT' as audit_section;

-- Overall health score calculation
WITH health_checks AS (
  SELECT 
    -- Schema checks
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_groups') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') THEN 1 ELSE 0 END +
    -- RLS checks
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'paygroup_employees' AND relrowsecurity) THEN 1 ELSE 0 END +
    -- Trigger checks
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'enforce_unique_or_smart_paygroup_assignment') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_unique_paygroup') THEN 1 ELSE 0 END +
    -- Index checks
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_national_id') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_group') THEN 1 ELSE 0 END
    as total_checks_passed
)
SELECT 
  total_checks_passed,
  CASE 
    WHEN total_checks_passed >= 8 THEN '🎉 EXCELLENT - All systems healthy'
    WHEN total_checks_passed >= 6 THEN '✅ GOOD - Minor issues detected'
    WHEN total_checks_passed >= 4 THEN '⚠️ WARNING - Several issues need attention'
    ELSE '❌ CRITICAL - Major issues detected'
  END as overall_health_status
FROM health_checks;
