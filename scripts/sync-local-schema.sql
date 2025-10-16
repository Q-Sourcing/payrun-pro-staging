-- ===============================================================
-- PAYRUN PRO LOCAL SCHEMA SYNCHRONIZATION
-- ===============================================================
-- Purpose: Ensure local schema matches remote database
-- Instructions: Run this in Supabase Dashboard SQL Editor to verify/update schema
-- ===============================================================

-- 🔍 SCHEMA VERIFICATION REPORT
-- ===============================================================

SELECT '🔍 PAYRUN PRO SCHEMA VERIFICATION REPORT' as report_title;
SELECT 'Date: ' || NOW()::text as check_date;

-- Check core tables
SELECT 
  '📋 Core Tables Check' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
    THEN '✅ employees'
    ELSE '❌ employees MISSING'
  END as employees_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_groups') 
    THEN '✅ pay_groups'
    ELSE '❌ pay_groups MISSING'
  END as pay_groups_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') 
    THEN '✅ paygroup_employees'
    ELSE '❌ paygroup_employees MISSING'
  END as paygroup_employees_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') 
    THEN '✅ payroll_configurations'
    ELSE '❌ payroll_configurations MISSING'
  END as payroll_configurations_check;

-- Check expatriate tables
SELECT 
  '📋 Expatriate Tables Check' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') 
    THEN '✅ expatriate_pay_groups'
    ELSE '❌ expatriate_pay_groups MISSING'
  END as expatriate_pay_groups_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_run_items') 
    THEN '✅ expatriate_pay_run_items'
    ELSE '❌ expatriate_pay_run_items MISSING'
  END as expatriate_pay_run_items_check;

-- Check employee identification fields
SELECT 
  '📋 Employee Fields Check' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') 
    THEN '✅ national_id'
    ELSE '❌ national_id MISSING'
  END as national_id_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tin') 
    THEN '✅ tin'
    ELSE '❌ tin MISSING'
  END as tin_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'social_security_number') 
    THEN '✅ social_security_number'
    ELSE '❌ social_security_number MISSING'
  END as ssn_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_number') 
    THEN '✅ passport_number'
    ELSE '❌ passport_number MISSING'
  END as passport_check;

-- Check RLS status
SELECT 
  '🔐 RLS Status Check' as section,
  relname as table_name,
  CASE 
    WHEN relrowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_class
WHERE relname IN ('employees', 'pay_groups', 'paygroup_employees', 'expatriate_pay_groups')
AND relkind = 'r'
ORDER BY relname;

-- Check functions
SELECT 
  '⚙️ Functions Check' as section,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM information_schema.routines
WHERE routine_name IN ('enforce_unique_or_smart_paygroup_assignment', 'exec_raw_sql', 'log_health_check')
ORDER BY routine_name;

-- Check triggers
SELECT 
  '🔧 Triggers Check' as section,
  tgname as trigger_name,
  relname as table_name,
  CASE 
    WHEN tgname IS NOT NULL THEN '✅ Active'
    ELSE '❌ Missing'
  END as status
FROM pg_trigger 
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE relname IN ('paygroup_employees', 'employees')
AND NOT tgisinternal
ORDER BY relname, tgname;

-- Check indexes
SELECT 
  '📈 Indexes Check' as section,
  indexname,
  tablename,
  CASE 
    WHEN indexname IS NOT NULL THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM pg_indexes
WHERE indexname IN ('idx_employees_national_id', 'idx_employees_tin', 'idx_employees_ssn', 'idx_pge_group', 'idx_pge_employee', 'idx_health_log_date')
ORDER BY indexname;

-- Check health monitoring infrastructure
SELECT 
  '🧠 Health Monitor Check' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'database_health_log') 
    THEN '✅ database_health_log table exists'
    ELSE '❌ database_health_log table MISSING'
  END as health_log_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'exec_raw_sql') 
    THEN '✅ exec_raw_sql function exists'
    ELSE '❌ exec_raw_sql function MISSING'
  END as exec_raw_sql_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'log_health_check') 
    THEN '✅ log_health_check function exists'
    ELSE '❌ log_health_check function MISSING'
  END as log_health_check;

-- Check Edge Functions (approximate)
SELECT 
  '🚀 Edge Functions Check' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_functions.functions WHERE name = 'calculate-pay') 
    THEN '✅ calculate-pay'
    ELSE '❌ calculate-pay MISSING'
  END as calculate_pay_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_functions.functions WHERE name = 'assign-employee-to-paygroup') 
    THEN '✅ assign-employee-to-paygroup'
    ELSE '❌ assign-employee-to-paygroup MISSING'
  END as assign_employee_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_functions.functions WHERE name = 'database-health-monitor') 
    THEN '✅ database-health-monitor'
    ELSE '❌ database-health-monitor MISSING'
  END as health_monitor_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM supabase_functions.functions WHERE name = 'create-user') 
    THEN '✅ create-user'
    ELSE '❌ create-user MISSING'
  END as create_user_check;

-- PayGroup ID format check
SELECT 
  '🆔 PayGroup ID Format Check' as section,
  COUNT(*) as total_paygroups,
  COUNT(CASE WHEN paygroup_id LIKE '%-%-%' THEN 1 END) as new_format_count,
  COUNT(CASE WHEN paygroup_id NOT LIKE '%-%-%' OR paygroup_id IS NULL THEN 1 END) as old_format_count,
  CASE 
    WHEN COUNT(CASE WHEN paygroup_id LIKE '%-%-%' THEN 1 END) = COUNT(*) 
    THEN '✅ All PayGroups have new format'
    ELSE '⚠️ Some PayGroups need format update'
  END as format_status
FROM pay_groups;

-- Final summary
SELECT '🎯 SCHEMA VERIFICATION COMPLETE' as final_status;


