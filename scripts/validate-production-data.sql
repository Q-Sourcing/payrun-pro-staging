-- ===============================================================
-- PRODUCTION DATA VALIDATION SCRIPT
-- ===============================================================
-- Purpose: Validate production data integrity before applying migrations
-- Instructions: Run this in Supabase Dashboard > SQL Editor BEFORE migrations
-- ===============================================================

-- ===============================================================
-- 🔍 PRE-MIGRATION DATA VALIDATION
-- ===============================================================

SELECT '🔍 PRODUCTION DATA VALIDATION REPORT' as report_title;
SELECT 'Date: ' || NOW()::text as check_date;
SELECT 'Environment: PRODUCTION' as environment;

-- ===============================================================
-- 📊 CORE DATA INTEGRITY CHECK
-- ===============================================================

SELECT '📊 CORE DATA INTEGRITY CHECK' as section;

-- Check employees table integrity
SELECT 
  'employees' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as missing_emails,
  COUNT(CASE WHEN pay_rate IS NULL OR pay_rate <= 0 THEN 1 END) as invalid_pay_rates,
  COUNT(CASE WHEN pay_group_id IS NULL THEN 1 END) as missing_paygroup_ids
FROM employees;

-- Check pay_groups table integrity
SELECT 
  'pay_groups' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
  COUNT(CASE WHEN country IS NULL OR country = '' THEN 1 END) as missing_countries,
  COUNT(CASE WHEN default_tax_percentage IS NULL THEN 1 END) as missing_tax_percentages
FROM pay_groups;

-- Check pay_runs table integrity
SELECT 
  'pay_runs' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN pay_group_id IS NULL THEN 1 END) as missing_paygroup_ids,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as missing_status
FROM pay_runs;

-- ===============================================================
-- 🔗 FOREIGN KEY RELATIONSHIP CHECK
-- ===============================================================

SELECT '🔗 FOREIGN KEY RELATIONSHIP CHECK' as section;

-- Check for orphaned employees (employees without valid pay_group_id)
SELECT 
  'Orphaned Employees' as issue_type,
  COUNT(*) as count
FROM employees e
LEFT JOIN pay_groups pg ON e.pay_group_id = pg.id
WHERE e.pay_group_id IS NOT NULL AND pg.id IS NULL;

-- Check for orphaned pay_runs (pay_runs without valid pay_group_id)
SELECT 
  'Orphaned Pay Runs' as issue_type,
  COUNT(*) as count
FROM pay_runs pr
LEFT JOIN pay_groups pg ON pr.pay_group_id = pg.id
WHERE pr.pay_group_id IS NOT NULL AND pg.id IS NULL;

-- Check for orphaned pay_run_items (items without valid pay_run_id)
SELECT 
  'Orphaned Pay Run Items' as issue_type,
  COUNT(*) as count
FROM pay_run_items pri
LEFT JOIN pay_runs pr ON pri.pay_run_id = pr.id
WHERE pri.pay_run_id IS NOT NULL AND pr.id IS NULL;

-- ===============================================================
-- 📈 DATA DISTRIBUTION ANALYSIS
-- ===============================================================

SELECT '📈 DATA DISTRIBUTION ANALYSIS' as section;

-- Employee distribution by country
SELECT 
  'Employee Distribution by Country' as analysis_type,
  country,
  COUNT(*) as employee_count
FROM employees
WHERE country IS NOT NULL
GROUP BY country
ORDER BY employee_count DESC;

-- PayGroup distribution by country
SELECT 
  'PayGroup Distribution by Country' as analysis_type,
  country,
  COUNT(*) as paygroup_count
FROM pay_groups
WHERE country IS NOT NULL
GROUP BY country
ORDER BY paygroup_count DESC;

-- Pay run status distribution
SELECT 
  'Pay Run Status Distribution' as analysis_type,
  status,
  COUNT(*) as count
FROM pay_runs
WHERE status IS NOT NULL
GROUP BY status
ORDER BY count DESC;

-- ===============================================================
-- ⚠️ POTENTIAL ISSUES DETECTION
-- ===============================================================

SELECT '⚠️ POTENTIAL ISSUES DETECTION' as section;

-- Detect duplicate employee emails
SELECT 
  'Duplicate Employee Emails' as issue_type,
  email,
  COUNT(*) as duplicate_count
FROM employees
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Detect employees with invalid pay rates
SELECT 
  'Employees with Invalid Pay Rates' as issue_type,
  COUNT(*) as count
FROM employees
WHERE pay_rate IS NULL OR pay_rate <= 0;

-- Detect pay_groups with invalid tax percentages
SELECT 
  'PayGroups with Invalid Tax Percentages' as issue_type,
  COUNT(*) as count
FROM pay_groups
WHERE default_tax_percentage IS NULL OR default_tax_percentage < 0 OR default_tax_percentage > 100;

-- ===============================================================
-- 🎯 MIGRATION READINESS CHECK
-- ===============================================================

SELECT '🎯 MIGRATION READINESS CHECK' as section;

-- Check if any existing tables would conflict with new migrations
SELECT 
  'Existing Tables Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslip_templates') 
    THEN '⚠️ payslip_templates already exists'
    ELSE '✅ payslip_templates ready to create'
  END as payslip_templates_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') 
    THEN '⚠️ expatriate_pay_groups already exists'
    ELSE '✅ expatriate_pay_groups ready to create'
  END as expatriate_pay_groups_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') 
    THEN '⚠️ paygroup_employees already exists'
    ELSE '✅ paygroup_employees ready to create'
  END as paygroup_employees_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') 
    THEN '⚠️ payroll_configurations already exists'
    ELSE '✅ payroll_configurations ready to create'
  END as payroll_configurations_status;

-- Check if identification columns already exist
SELECT 
  'Employee Identification Columns Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') 
    THEN '⚠️ national_id already exists'
    ELSE '✅ national_id ready to add'
  END as national_id_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tin') 
    THEN '⚠️ tin already exists'
    ELSE '✅ tin ready to add'
  END as tin_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'social_security_number') 
    THEN '⚠️ social_security_number already exists'
    ELSE '✅ social_security_number ready to add'
  END as ssn_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_number') 
    THEN '⚠️ passport_number already exists'
    ELSE '✅ passport_number ready to add'
  END as passport_status;

-- ===============================================================
-- 📋 SUMMARY RECOMMENDATIONS
-- ===============================================================

SELECT '📋 SUMMARY RECOMMENDATIONS' as section;

-- Overall health assessment
WITH health_metrics AS (
  SELECT 
    (SELECT COUNT(*) FROM employees WHERE name IS NOT NULL AND name != '') as valid_employees,
    (SELECT COUNT(*) FROM employees) as total_employees,
    (SELECT COUNT(*) FROM pay_groups WHERE name IS NOT NULL AND name != '') as valid_paygroups,
    (SELECT COUNT(*) FROM pay_groups) as total_paygroups,
    (SELECT COUNT(*) FROM employees WHERE pay_group_id IS NULL) as orphaned_employees
)
SELECT 
  'Overall Health Assessment' as assessment_type,
  CASE 
    WHEN valid_employees = total_employees AND orphaned_employees = 0 
    THEN '🎉 EXCELLENT - All data is clean and ready for migration'
    WHEN valid_employees >= total_employees * 0.95 AND orphaned_employees <= total_employees * 0.05
    THEN '✅ GOOD - Minor data issues detected, safe to proceed'
    WHEN valid_employees >= total_employees * 0.90 AND orphaned_employees <= total_employees * 0.10
    THEN '⚠️ WARNING - Some data issues need attention before migration'
    ELSE '❌ CRITICAL - Major data issues detected, review required'
  END as health_status,
  valid_employees || '/' || total_employees as employee_health,
  valid_paygroups || '/' || total_paygroups as paygroup_health,
  orphaned_employees as orphaned_count
FROM health_metrics;

-- Final recommendations
SELECT '🎯 FINAL RECOMMENDATIONS' as recommendations;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE name IS NULL OR name = '') 
    THEN '⚠️ Fix missing employee names before migration'
    ELSE '✅ Employee names are complete'
  END as employee_names_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM employees WHERE pay_group_id IS NULL) 
    THEN '⚠️ Assign pay groups to employees without assignments'
    ELSE '✅ All employees have pay group assignments'
  END as paygroup_assignments_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name IN ('payslip_templates', 'expatriate_pay_groups', 'paygroup_employees', 'payroll_configurations')) 
    THEN '⚠️ Some tables already exist - migration may conflict'
    ELSE '✅ No conflicting tables found - safe to proceed'
  END as migration_safety_check;

SELECT '🎯 VALIDATION COMPLETE - Review results before proceeding with migration' as final_status;
