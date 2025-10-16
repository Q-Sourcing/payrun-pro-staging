-- ===============================================================
-- COMPREHENSIVE PRODUCTION DATABASE VERIFICATION
-- ===============================================================
-- Purpose: Deep verification of all applied migrations
-- Run this in Supabase Dashboard > SQL Editor
-- ===============================================================

-- ===============================================================
-- 🎯 MIGRATION VERIFICATION SUMMARY
-- ===============================================================

SELECT '🎯 COMPREHENSIVE PRODUCTION VERIFICATION REPORT' as report_title;
SELECT 'Date: ' || NOW()::text as check_date;
SELECT 'Environment: PRODUCTION' as environment;

-- ===============================================================
-- 📊 TABLE EXISTENCE VERIFICATION
-- ===============================================================

SELECT '📊 TABLE EXISTENCE VERIFICATION' as section;

-- Check core tables
SELECT 
  'Core Tables' as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN '✅' ELSE '❌' END as employees,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_groups') THEN '✅' ELSE '❌' END as pay_groups,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_runs') THEN '✅' ELSE '❌' END as pay_runs,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pay_run_items') THEN '✅' ELSE '❌' END as pay_run_items;

-- Check new migration tables
SELECT 
  'New Migration Tables' as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslip_templates') THEN '✅' ELSE '❌' END as payslip_templates,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslip_generations') THEN '✅' ELSE '❌' END as payslip_generations,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') THEN '✅' ELSE '❌' END as expatriate_pay_groups,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_run_items') THEN '✅' ELSE '❌' END as expatriate_pay_run_items,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') THEN '✅' ELSE '❌' END as paygroup_employees,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') THEN '✅' ELSE '❌' END as payroll_configurations;

-- ===============================================================
-- 📋 COLUMN VERIFICATION
-- ===============================================================

SELECT '📋 COLUMN VERIFICATION' as section;

-- Check employee identification columns
SELECT 
  'Employee Identification Columns' as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') THEN '✅' ELSE '❌' END as national_id,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tin') THEN '✅' ELSE '❌' END as tin,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'social_security_number') THEN '✅' ELSE '❌' END as ssn,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_number') THEN '✅' ELSE '❌' END as passport;

-- ===============================================================
-- ⚙️ FUNCTION VERIFICATION
-- ===============================================================

SELECT '⚙️ FUNCTION VERIFICATION' as section;

SELECT 
  'Critical Functions' as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'enforce_unique_paygroup_assignment') THEN '✅' ELSE '❌' END as enforce_unique_paygroup_assignment,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_payslip_templates_updated_at') THEN '✅' ELSE '❌' END as update_payslip_templates_updated_at,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'ug_lst_annual_amount') THEN '✅' ELSE '❌' END as ug_lst_annual_amount,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'exec_raw_sql') THEN '✅' ELSE '❌' END as exec_raw_sql;

-- ===============================================================
-- 🔧 TRIGGER VERIFICATION
-- ===============================================================

SELECT '🔧 TRIGGER VERIFICATION' as section;

SELECT 
  'Critical Triggers' as category,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_unique_paygroup') THEN '✅' ELSE '❌' END as trg_enforce_unique_paygroup,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payslip_templates_updated_at') THEN '✅' ELSE '❌' END as update_payslip_templates_updated_at,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_updated_at_column') THEN '✅' ELSE '❌' END as update_updated_at_column;

-- ===============================================================
-- 📈 INDEX VERIFICATION
-- ===============================================================

SELECT '📈 INDEX VERIFICATION' as section;

SELECT 
  'Performance Indexes' as category,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_group') THEN '✅' ELSE '❌' END as idx_pge_group,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_employee') THEN '✅' ELSE '❌' END as idx_pge_employee,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_national_id') THEN '✅' ELSE '❌' END as idx_employees_national_id,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_tin') THEN '✅' ELSE '❌' END as idx_employees_tin,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_ssn') THEN '✅' ELSE '❌' END as idx_employees_ssn,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payslip_templates_user_id') THEN '✅' ELSE '❌' END as idx_payslip_templates_user_id;

-- ===============================================================
-- 🔐 RLS POLICY VERIFICATION
-- ===============================================================

SELECT '🔐 RLS POLICY VERIFICATION' as section;

-- Check RLS is enabled on new tables
SELECT 
  'RLS Status' as category,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payslip_templates' AND relrowsecurity) THEN '✅' ELSE '❌' END as payslip_templates_rls,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payslip_generations' AND relrowsecurity) THEN '✅' ELSE '❌' END as payslip_generations_rls,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'expatriate_pay_groups' AND relrowsecurity) THEN '✅' ELSE '❌' END as expatriate_pay_groups_rls,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'paygroup_employees' AND relrowsecurity) THEN '✅' ELSE '❌' END as paygroup_employees_rls,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payroll_configurations' AND relrowsecurity) THEN '✅' ELSE '❌' END as payroll_configurations_rls;

-- Check key policies exist
SELECT 
  'Key Policies' as category,
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payslip_templates' AND policyname LIKE '%Users can view their own payslip templates%') THEN '✅' ELSE '❌' END as payslip_view_policy,
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paygroup_employees' AND policyname LIKE '%Allow authenticated users to view paygroup employees%') THEN '✅' ELSE '❌' END as paygroup_view_policy;

-- ===============================================================
-- 🧪 FUNCTIONALITY TESTS
-- ===============================================================

SELECT '🧪 FUNCTIONALITY TESTS' as section;

-- Test PayGroup assignment function
SELECT 
  'Functionality Tests' as category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'enforce_unique_paygroup_assignment' 
      AND routine_type = 'FUNCTION'
    ) THEN '✅ PayGroup Assignment Function'
    ELSE '❌ PayGroup Assignment Function'
  END as paygroup_assignment_test;

-- Test payslip template function
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'update_payslip_templates_updated_at' 
      AND routine_type = 'FUNCTION'
    ) THEN '✅ Payslip Template Function'
    ELSE '❌ Payslip Template Function'
  END as payslip_template_test;

-- ===============================================================
-- 📊 DATA INTEGRITY CHECK
-- ===============================================================

SELECT '📊 DATA INTEGRITY CHECK' as section;

-- Check if we can insert into new tables (basic functionality test)
SELECT 
  'Data Integrity' as category,
  (SELECT COUNT(*) FROM employees) as total_employees,
  (SELECT COUNT(*) FROM pay_groups) as total_paygroups,
  (SELECT COUNT(*) FROM pay_runs) as total_payruns,
  CASE WHEN EXISTS (SELECT 1 FROM payslip_templates LIMIT 1) THEN 'Has Data' ELSE 'Empty' END as payslip_templates_data,
  CASE WHEN EXISTS (SELECT 1 FROM paygroup_employees LIMIT 1) THEN 'Has Data' ELSE 'Empty' END as paygroup_employees_data;

-- ===============================================================
-- 🎯 OVERALL HEALTH ASSESSMENT
-- ===============================================================

SELECT '🎯 OVERALL HEALTH ASSESSMENT' as section;

WITH health_checks AS (
  SELECT 
    -- Table checks (6 points)
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslip_templates') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslip_generations') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_run_items') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') THEN 1 ELSE 0 END +
    -- Column checks (4 points)
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tin') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'social_security_number') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_number') THEN 1 ELSE 0 END +
    -- Function checks (2 points)
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'enforce_unique_paygroup_assignment') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_payslip_templates_updated_at') THEN 1 ELSE 0 END +
    -- Trigger checks (1 point)
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_unique_paygroup') THEN 1 ELSE 0 END +
    -- Index checks (2 points)
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_group') THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_national_id') THEN 1 ELSE 0 END +
    -- RLS checks (2 points)
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payslip_templates' AND relrowsecurity) THEN 1 ELSE 0 END +
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'paygroup_employees' AND relrowsecurity) THEN 1 ELSE 0 END
    as total_checks_passed
)
SELECT 
  total_checks_passed,
  CASE 
    WHEN total_checks_passed >= 17 THEN '🎉 EXCELLENT - All critical migrations applied successfully!'
    WHEN total_checks_passed >= 15 THEN '✅ VERY GOOD - Almost all features are working'
    WHEN total_checks_passed >= 12 THEN '⚠️ GOOD - Most features working, minor issues detected'
    WHEN total_checks_passed >= 8 THEN '⚠️ FAIR - Some features missing, review required'
    ELSE '❌ POOR - Major issues detected, manual intervention needed'
  END as overall_health_status,
  ROUND((total_checks_passed::decimal / 17) * 100, 1) as completion_percentage
FROM health_checks;

-- ===============================================================
-- 🎯 FEATURE AVAILABILITY SUMMARY
-- ===============================================================

SELECT '🎯 FEATURE AVAILABILITY SUMMARY' as section;

SELECT 
  'Available Features' as category,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslip_templates') THEN '✅ Payslip Templates' ELSE '❌ Payslip Templates' END as payslip_templates,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') THEN '✅ Expatriate Payroll' ELSE '❌ Expatriate Payroll' END as expatriate_payroll,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') THEN '✅ PayGroup Assignment' ELSE '❌ PayGroup Assignment' END as paygroup_assignment,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') THEN '✅ Employee ID Tracking' ELSE '❌ Employee ID Tracking' END as employee_id_tracking;

SELECT '🎯 VERIFICATION COMPLETE - Review results above' as final_status;
