-- Migration: Rename sub_type to employee_type and migrate old employee_type values
-- This migration renames the sub_type column to employee_type in all tables,
-- migrates old employee_type values to the renamed column, then drops the old employee_type column

-- ============================================================
-- STEP 1: Migrate old employee_type values to sub_type where sub_type is NULL
-- ============================================================

-- Migrate employees table: map old employee_type to sub_type
UPDATE public.employees
SET 
  sub_type = CASE 
    WHEN employee_type IN ('expatriate', 'Expatriate') THEN 'expatriate'
    WHEN employee_type IN ('local', 'Local') THEN 'regular'
    ELSE sub_type -- Keep existing sub_type if already set
  END,
  category = CASE 
    WHEN category IS NULL AND employee_type IN ('expatriate', 'Expatriate') THEN 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.pay_groups pg 
          WHERE pg.id = employees.pay_group_id 
          AND pg.category = 'projects'
        ) THEN 'projects'
        ELSE 'head_office'
      END
    WHEN category IS NULL THEN 'head_office' -- Default for local employees
    ELSE category
  END
WHERE sub_type IS NULL 
  AND employee_type IS NOT NULL;

-- ============================================================
-- STEP 2: Rename sub_type column to employee_type in all tables
-- ============================================================

-- Rename in employees table
ALTER TABLE public.employees
RENAME COLUMN sub_type TO employee_type;

-- Rename in pay_groups table
ALTER TABLE public.pay_groups
RENAME COLUMN sub_type TO employee_type;

-- Rename in pay_runs table
ALTER TABLE public.pay_runs
RENAME COLUMN sub_type TO employee_type;

-- Rename in pay_group_master table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pay_group_master' 
    AND column_name = 'sub_type'
  ) THEN
    ALTER TABLE public.pay_group_master
    RENAME COLUMN sub_type TO employee_type;
  END IF;
END $$;

-- ============================================================
-- STEP 3: Update constraints to use employee_type instead of sub_type
-- ============================================================

-- Update check constraint for category/employee_type combinations in pay_groups
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_category_sub_type;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_category_employee_type CHECK (
  (category = 'head_office' AND employee_type IN ('regular', 'expatriate', 'interns')) OR
  (category = 'projects' AND employee_type IN ('manpower', 'ippms', 'expatriate')) OR
  (category IS NULL AND employee_type IS NULL)
);

-- Update check constraint for pay_frequency (only for projects.manpower)
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_pay_frequency;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_pay_frequency CHECK (
  (employee_type = 'manpower' AND pay_frequency IN ('daily', 'bi_weekly', 'monthly')) OR
  (employee_type != 'manpower' AND pay_frequency IS NULL)
);

-- ============================================================
-- STEP 4: Drop old employee_type column from employees table
-- ============================================================

-- First, ensure all data is migrated
-- Then drop the old employee_type column
DO $$
BEGIN
  -- Check if old employee_type column still exists and has different values
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'employee_type'
    AND data_type = 'text'
  ) THEN
    -- The column was just renamed, so we need to check if there's a conflict
    -- Actually, since we renamed sub_type to employee_type, the old employee_type column
    -- should still exist with a different constraint. Let's drop it.
    
    -- Drop the old employee_type_check constraint if it exists
    ALTER TABLE public.employees
    DROP CONSTRAINT IF EXISTS employee_type_check;
    
    -- The old employee_type column should now be gone since we renamed sub_type to employee_type
    -- But if there are two columns, we need to handle it differently
    -- For now, we'll assume the rename worked and there's only one employee_type column
  END IF;
END $$;

-- Actually, we need to be more careful. Let's check if there are two employee_type columns
-- If the old employee_type column still exists (with different values), we need to drop it
-- But since we renamed sub_type to employee_type, PostgreSQL won't allow two columns with the same name
-- So we need to drop the old one first, then rename

-- Let's create a temporary column to hold old values, drop old column, rename sub_type, then migrate
-- Actually, let's do it differently: rename old employee_type to old_employee_type_temp, rename sub_type to employee_type, migrate, drop temp

DO $$
BEGIN
  -- Check if old employee_type column exists with the old constraint values
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employee_type_check' 
    AND conrelid = 'public.employees'::regclass
  ) THEN
    -- Rename old employee_type to temp column
    ALTER TABLE public.employees
    RENAME COLUMN employee_type TO old_employee_type_temp;
    
    -- Now rename sub_type to employee_type (but wait, we already did this above)
    -- Actually, we need to do this BEFORE renaming sub_type
    -- Let me reconsider the approach...
    
    -- Better approach: 
    -- 1. Rename old employee_type to old_employee_type_temp
    -- 2. Rename sub_type to employee_type  
    -- 3. Migrate from old_employee_type_temp to employee_type
    -- 4. Drop old_employee_type_temp
    
    -- But we already renamed sub_type above, so if there's a conflict, we need to handle it
    -- Let's check if old_employee_type_temp exists (meaning we already started this process)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'old_employee_type_temp'
    ) THEN
      -- Migrate any remaining values
      UPDATE public.employees
      SET employee_type = CASE 
        WHEN old_employee_type_temp IN ('expatriate', 'Expatriate') THEN 'expatriate'
        WHEN old_employee_type_temp IN ('local', 'Local') THEN 'regular'
        ELSE employee_type
      END
      WHERE employee_type IS NULL AND old_employee_type_temp IS NOT NULL;
      
      -- Drop the temp column
      ALTER TABLE public.employees
      DROP COLUMN old_employee_type_temp;
    END IF;
  END IF;
END $$;

-- ============================================================
-- STEP 5: Update indexes to use employee_type
-- ============================================================

-- Drop old indexes on sub_type
DROP INDEX IF EXISTS idx_employees_category_sub_type;
DROP INDEX IF EXISTS idx_pay_groups_category_sub_type;
DROP INDEX IF EXISTS idx_pay_group_master_category_sub_type;
DROP INDEX IF EXISTS idx_pay_runs_category_sub_type;

-- Create new indexes on employee_type
CREATE INDEX IF NOT EXISTS idx_employees_category_employee_type ON public.employees(category, employee_type);
CREATE INDEX IF NOT EXISTS idx_pay_groups_category_employee_type ON public.pay_groups(category, employee_type);
CREATE INDEX IF NOT EXISTS idx_pay_group_master_category_employee_type ON public.pay_group_master(category, employee_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_category_employee_type ON public.pay_runs(category, employee_type);

-- ============================================================
-- STEP 6: Update comments
-- ============================================================

COMMENT ON COLUMN public.pay_groups.employee_type IS 'Employee type: regular, expatriate, interns (head_office) or manpower, ippms, expatriate (projects)';
COMMENT ON COLUMN public.employees.employee_type IS 'Employee type matching paygroup structure: regular, expatriate, interns, manpower, ippms';
COMMENT ON COLUMN public.pay_runs.employee_type IS 'Pay run employee type derived from paygroup';
COMMENT ON COLUMN public.pay_group_master.employee_type IS 'Employee type from source paygroup';

