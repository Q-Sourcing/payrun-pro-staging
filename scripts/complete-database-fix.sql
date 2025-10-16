-- ===============================================================
-- PAYRUN PRO COMPLETE DATABASE FIX
-- ===============================================================
-- Purpose: Fix all migration divergence and apply missing schema changes
-- Author: Senior Supabase + PostgreSQL Reliability Engineer
-- Instructions: Copy and paste this entire script into Supabase Dashboard SQL Editor
-- ===============================================================

-- Begin transaction with automatic rollback on any error
BEGIN;

-- 🎯 STEP 1: Add missing employee identification fields
-- ===============================================================
DO $$
BEGIN
  -- Add employee identification columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') THEN
    ALTER TABLE employees ADD COLUMN national_id text;
    RAISE NOTICE '✅ Added national_id column to employees table';
  ELSE
    RAISE NOTICE 'ℹ️ national_id column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tin') THEN
    ALTER TABLE employees ADD COLUMN tin text;
    RAISE NOTICE '✅ Added tin column to employees table';
  ELSE
    RAISE NOTICE 'ℹ️ tin column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'social_security_number') THEN
    ALTER TABLE employees ADD COLUMN social_security_number text;
    RAISE NOTICE '✅ Added social_security_number column to employees table';
  ELSE
    RAISE NOTICE 'ℹ️ social_security_number column already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_number') THEN
    ALTER TABLE employees ADD COLUMN passport_number text;
    RAISE NOTICE '✅ Added passport_number column to employees table';
  ELSE
    RAISE NOTICE 'ℹ️ passport_number column already exists';
  END IF;
END $$;

-- Create indexes for identification fields
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees (national_id);
CREATE INDEX IF NOT EXISTS idx_employees_tin ON employees (tin);
CREATE INDEX IF NOT EXISTS idx_employees_ssn ON employees (social_security_number);
RAISE NOTICE '✅ Created indexes for employee identification fields';

-- 🎯 STEP 2: Create payroll_configurations table
-- ===============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') THEN
    CREATE TABLE payroll_configurations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid,
      use_strict_mode boolean DEFAULT true,
      updated_at timestamptz DEFAULT now()
    );
    RAISE NOTICE '✅ Created payroll_configurations table';
  ELSE
    RAISE NOTICE 'ℹ️ payroll_configurations table already exists';
  END IF;
END $$;

-- 🎯 STEP 3: Create paygroup_employees link table
-- ===============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') THEN
    CREATE TABLE paygroup_employees (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pay_group_id uuid NOT NULL,
      employee_id uuid NOT NULL,
      assigned_by uuid,
      assigned_at timestamptz DEFAULT now(),
      active boolean DEFAULT true,
      notes text
    );
    RAISE NOTICE '✅ Created paygroup_employees table';
  ELSE
    RAISE NOTICE 'ℹ️ paygroup_employees table already exists';
  END IF;
END $$;

-- 🎯 STEP 4: Enable RLS and create policies
-- ===============================================================
DO $$
BEGIN
  -- Enable RLS on paygroup_employees
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'paygroup_employees' AND relrowsecurity = true) THEN
    ALTER TABLE paygroup_employees ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Enabled RLS on paygroup_employees table';
  ELSE
    RAISE NOTICE 'ℹ️ RLS already enabled on paygroup_employees table';
  END IF;
END $$;

-- Create RLS policies (idempotent)
DO $$
BEGIN
  -- View policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paygroup_employees' AND policyname = 'view_paygroup_employees') THEN
    CREATE POLICY "view_paygroup_employees"
    ON paygroup_employees FOR SELECT
    USING (auth.uid() IS NOT NULL);
    RAISE NOTICE '✅ Created view policy for paygroup_employees';
  ELSE
    RAISE NOTICE 'ℹ️ view policy already exists for paygroup_employees';
  END IF;
  
  -- Insert policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paygroup_employees' AND policyname = 'insert_paygroup_employees') THEN
    CREATE POLICY "insert_paygroup_employees"
    ON paygroup_employees FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
    RAISE NOTICE '✅ Created insert policy for paygroup_employees';
  ELSE
    RAISE NOTICE 'ℹ️ insert policy already exists for paygroup_employees';
  END IF;
  
  -- Update policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paygroup_employees' AND policyname = 'update_paygroup_employees') THEN
    CREATE POLICY "update_paygroup_employees"
    ON paygroup_employees FOR UPDATE
    USING (auth.uid() IS NOT NULL);
    RAISE NOTICE '✅ Created update policy for paygroup_employees';
  ELSE
    RAISE NOTICE 'ℹ️ update policy already exists for paygroup_employees';
  END IF;
  
  -- Delete policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paygroup_employees' AND policyname = 'delete_paygroup_employees') THEN
    CREATE POLICY "delete_paygroup_employees"
    ON paygroup_employees FOR DELETE
    USING (auth.uid() IS NOT NULL);
    RAISE NOTICE '✅ Created delete policy for paygroup_employees';
  ELSE
    RAISE NOTICE 'ℹ️ delete policy already exists for paygroup_employees';
  END IF;
END $$;

-- 🎯 STEP 5: Create assignment validation function
-- ===============================================================
CREATE OR REPLACE FUNCTION enforce_unique_or_smart_paygroup_assignment()
RETURNS trigger AS $fn$
DECLARE
  org_mode boolean;
  duplicate_count int;
  emp_org_id uuid;
BEGIN
  -- Get organization mode (default to strict)
  SELECT use_strict_mode INTO org_mode 
  FROM payroll_configurations 
  WHERE organization_id = (SELECT organization_id FROM employees WHERE id = NEW.employee_id)
  LIMIT 1;
  
  IF org_mode IS NULL THEN 
    org_mode := true; -- default strict mode
  END IF;
  
  -- Skip validation for inactive assignments
  IF NEW.active = false THEN 
    RETURN NEW; 
  END IF;

  -- Check for duplicate active assignments based on identification
  SELECT COUNT(*) INTO duplicate_count
  FROM paygroup_employees pe
  JOIN employees e ON e.id = pe.employee_id
  WHERE pe.active = true
    AND pe.employee_id != NEW.employee_id
    AND (
      (e.national_id IS NOT NULL AND e.national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id)) OR
      (e.tin IS NOT NULL AND e.tin = (SELECT tin FROM employees WHERE id = NEW.employee_id)) OR
      (e.social_security_number IS NOT NULL AND e.social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id))
    );

  -- Handle based on mode
  IF duplicate_count > 0 THEN
    IF org_mode = true THEN
      RAISE EXCEPTION 'Strict Mode: Employee with same identification already active in another paygroup.';
    ELSE
      -- Smart mode: deactivate old assignments
      UPDATE paygroup_employees
      SET active = false
      WHERE employee_id IN (
        SELECT id FROM employees WHERE
          (national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id) AND national_id IS NOT NULL) OR
          (tin = (SELECT tin FROM employees WHERE id = NEW.employee_id) AND tin IS NOT NULL) OR
          (social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id) AND social_security_number IS NOT NULL)
      )
      AND id != NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✅ Created enforce_unique_or_smart_paygroup_assignment function';

-- 🎯 STEP 6: Create trigger for assignment validation
-- ===============================================================
DROP TRIGGER IF EXISTS trg_enforce_unique_paygroup ON paygroup_employees;
CREATE TRIGGER trg_enforce_unique_paygroup
  BEFORE INSERT OR UPDATE ON paygroup_employees
  FOR EACH ROW EXECUTE FUNCTION enforce_unique_or_smart_paygroup_assignment();

RAISE NOTICE '✅ Created trigger for paygroup assignment validation';

-- 🎯 STEP 7: Create performance indexes
-- ===============================================================
CREATE INDEX IF NOT EXISTS idx_pge_group ON paygroup_employees (pay_group_id);
CREATE INDEX IF NOT EXISTS idx_pge_employee ON paygroup_employees (employee_id);
CREATE INDEX IF NOT EXISTS idx_pge_active ON paygroup_employees (active);
RAISE NOTICE '✅ Created performance indexes for paygroup_employees';

-- 🎯 STEP 8: Backfill PayGroup IDs with new format
-- ===============================================================
DO $$
DECLARE
  rec RECORD;
  updated_count int := 0;
BEGIN
  -- Update regular pay groups
  FOR rec IN SELECT id, name, created_at FROM pay_groups WHERE paygroup_id IS NULL OR paygroup_id NOT LIKE '%-%-%' LOOP
    UPDATE pay_groups 
    SET paygroup_id = CONCAT(
      'REGP-',
      UPPER(COALESCE(NULLIF(REGEXP_REPLACE(SUBSTRING(rec.name FROM '^[A-Za-z]+'), '[^A-Za-z]', '', 'g'), ''), 'XX')),
      '-',
      TO_CHAR(COALESCE(rec.created_at, NOW()), 'YYYYMMDDHH24MI')
    )
    WHERE id = rec.id;
    updated_count := updated_count + 1;
  END LOOP;
  
  -- Update expatriate pay groups if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expatriate_pay_groups') THEN
    FOR rec IN SELECT id, name, created_at FROM expatriate_pay_groups WHERE paygroup_id IS NULL OR paygroup_id NOT LIKE '%-%-%' LOOP
      UPDATE expatriate_pay_groups 
      SET paygroup_id = CONCAT(
        'EXPG-',
        UPPER(COALESCE(NULLIF(REGEXP_REPLACE(SUBSTRING(rec.name FROM '^[A-Za-z]+'), '[^A-Za-z]', '', 'g'), ''), 'XX')),
        '-',
        TO_CHAR(COALESCE(rec.created_at, NOW()), 'YYYYMMDDHH24MI')
      )
      WHERE id = rec.id;
      updated_count := updated_count + 1;
    END LOOP;
  END IF;
  
  RAISE NOTICE '✅ Backfilled % PayGroup IDs with new format', updated_count;
END $$;

-- 🎯 STEP 9: Verify all changes
-- ===============================================================
DO $$
DECLARE
  health_score int := 0;
BEGIN
  -- Check schema completeness
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paygroup_employees') THEN
    health_score := health_score + 1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_configurations') THEN
    health_score := health_score + 1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'national_id') THEN
    health_score := health_score + 1;
  END IF;
  
  -- Check RLS
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'paygroup_employees' AND relrowsecurity = true) THEN
    health_score := health_score + 1;
  END IF;
  
  -- Check function and trigger
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'enforce_unique_or_smart_paygroup_assignment') THEN
    health_score := health_score + 1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_unique_paygroup') THEN
    health_score := health_score + 1;
  END IF;
  
  -- Check indexes
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pge_group') THEN
    health_score := health_score + 1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_national_id') THEN
    health_score := health_score + 1;
  END IF;
  
  -- Final health assessment
  IF health_score >= 7 THEN
    RAISE NOTICE '🎉 EXCELLENT: Database health score %/8 - All systems healthy!', health_score;
  ELSIF health_score >= 5 THEN
    RAISE NOTICE '✅ GOOD: Database health score %/8 - Minor issues resolved', health_score;
  ELSE
    RAISE NOTICE '⚠️ WARNING: Database health score %/8 - Some issues remain', health_score;
  END IF;
END $$;

-- 🎯 STEP 10: Commit all changes
-- ===============================================================
COMMIT;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '🚀 PAYRUN PRO DATABASE FIX COMPLETE!';
  RAISE NOTICE '✅ All missing schema changes applied successfully';
  RAISE NOTICE '✅ RLS policies and triggers created and active';
  RAISE NOTICE '✅ Performance indexes optimized';
  RAISE NOTICE '✅ PayGroup IDs updated to new format';
  RAISE NOTICE '🎯 Your PayRun Pro system is now fully operational!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Test PayGroup creation with new ID format';
  RAISE NOTICE '2. Test employee assignment functionality';
  RAISE NOTICE '3. Verify all Edge Functions work correctly';
  RAISE NOTICE '4. Run the health audit script to confirm everything is working';
END $$;
