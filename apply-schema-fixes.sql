-- ==========================================================
-- 🔧 Apply Schema Fixes to Supabase
-- ==========================================================
-- This script applies the essential schema fixes
-- Run this SQL directly in your Supabase Dashboard SQL Editor

-- STEP 1: Fix pay_groups schema cache issue by adding 'type' column
ALTER TABLE pay_groups
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'local';

-- Add a check constraint to ensure valid types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_pay_groups_type'
    ) THEN
        ALTER TABLE pay_groups
        ADD CONSTRAINT check_pay_groups_type 
        CHECK (type IN ('local', 'expatriate', 'contractor', 'intern', 'temporary'));
    END IF;
END $$;

-- STEP 2: Extend employees table with new columns
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'Local';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_category TEXT;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Active';

-- Add check constraints for employee fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_employees_category'
    ) THEN
        ALTER TABLE employees
        ADD CONSTRAINT check_employees_category 
        CHECK (employee_category IS NULL OR employee_category IN ('Intern','Trainee','Temporary','Permanent','On Contract','Casual'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_employees_status'
    ) THEN
        ALTER TABLE employees
        ADD CONSTRAINT check_employees_status 
        CHECK (employment_status IN ('Active','Terminated','Deceased','Resigned','Probation','Notice Period'));
    END IF;
END $$;

-- STEP 3: Update pay_type enum to include Daily Rate for expatriates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'daily_rate' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_type')
    ) THEN
        ALTER TYPE pay_type ADD VALUE 'daily_rate';
    END IF;
END $$;

-- STEP 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON employees(employee_type);
CREATE INDEX IF NOT EXISTS idx_employees_employee_category ON employees(employee_category);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_pay_groups_type ON pay_groups(type);

-- STEP 5: Update existing data to have proper defaults
UPDATE employees 
SET employee_type = 'Local', employment_status = 'Active' 
WHERE employee_type IS NULL OR employment_status IS NULL;

UPDATE pay_groups 
SET type = 'local' 
WHERE type IS NULL;

-- STEP 6: Add comments for documentation
COMMENT ON COLUMN pay_groups.type IS 'Pay group type: local, expatriate, contractor, intern, temporary';
COMMENT ON COLUMN employees.employee_type IS 'Employee type: Local or Expatriate';
COMMENT ON COLUMN employees.employee_category IS 'Employee category: Intern, Trainee, Temporary, Permanent, On Contract, Casual';
COMMENT ON COLUMN employees.employment_status IS 'Employment status: Active, Terminated, Deceased, Resigned, Probation, Notice Period';

-- Verify the changes
SELECT 'Schema fixes applied successfully!' as status;
