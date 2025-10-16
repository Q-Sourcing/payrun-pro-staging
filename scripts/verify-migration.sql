-- ===============================================================
-- PAYRUN PRO MIGRATION VERIFICATION SCRIPT
-- ===============================================================
-- Purpose: Verify that all PayGroups integration changes were applied correctly
-- Instructions: Run this after the safe-migration-apply.sql script
-- ===============================================================

-- Check if all required tables exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') 
    THEN '✅ payroll_configurations table exists'
    ELSE '❌ payroll_configurations table missing'
  END as payroll_config_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') 
    THEN '✅ paygroup_employees table exists'
    ELSE '❌ paygroup_employees table missing'
  END as paygroup_employees_check;

-- Check if employee identification fields exist
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

-- Check if RLS is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'paygroup_employees' AND relrowsecurity = true) 
    THEN '✅ RLS enabled on paygroup_employees'
    ELSE '❌ RLS not enabled on paygroup_employees'
  END as rls_check;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enforce_unique_or_smart_paygroup_assignment') 
    THEN '✅ Assignment validation function exists'
    ELSE '❌ Assignment validation function missing'
  END as function_check;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_unique_paygroup') 
    THEN '✅ Assignment validation trigger exists'
    ELSE '❌ Assignment validation trigger missing'
  END as trigger_check;

-- Check if indexes exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_group') 
    THEN '✅ Performance indexes exist'
    ELSE '❌ Performance indexes missing'
  END as indexes_check;

-- Check PayGroup ID format (sample)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pay_groups WHERE paygroup_id LIKE '%-%-%') 
    THEN '✅ PayGroup IDs have new format'
    ELSE '❌ PayGroup IDs still in old format'
  END as paygroup_id_check;

-- Show sample of updated PayGroup IDs
SELECT 'Sample PayGroup IDs:' as info;
SELECT paygroup_id, name FROM pay_groups WHERE paygroup_id LIKE '%-%-%' LIMIT 5;

-- Show sample of expatriate PayGroup IDs (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') THEN
    RAISE NOTICE 'Sample Expatriate PayGroup IDs:';
  END IF;
END $$;

SELECT paygroup_id, name FROM expatriate_pay_groups WHERE paygroup_id LIKE '%-%-%' LIMIT 3;

-- Final verification summary
SELECT '🎉 MIGRATION VERIFICATION COMPLETE' as status;
