-- ==========================================================
-- 🔧 Fix Schema and Enhance Employee Management (Simplified)
-- ==========================================================
-- This migration fixes the pay_groups schema cache issue and extends employee management

-- STEP 1: Fix pay_groups schema cache issue by adding 'type' column
ALTER TABLE pay_groups
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'local';

-- Add a check constraint to ensure valid types
ALTER TABLE pay_groups
ADD CONSTRAINT check_pay_groups_type 
CHECK (type IN ('local', 'expatriate', 'contractor', 'intern', 'temporary'));

-- STEP 2: Extend employees table with new columns for comprehensive employee management
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'Local';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_category TEXT CHECK (
  employee_category IN ('Intern','Trainee','Temporary','Permanent','On Contract','Casual')
);

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_status TEXT CHECK (
  employment_status IN ('Active','Terminated','Deceased','Resigned','Probation','Notice Period')
) DEFAULT 'Active';

-- Update pay_type enum to include Daily Rate for expatriates
ALTER TYPE pay_type ADD VALUE IF NOT EXISTS 'daily_rate';

-- Add index for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON employees(employee_type);
CREATE INDEX IF NOT EXISTS idx_employees_employee_category ON employees(employee_category);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_pay_groups_type ON pay_groups(type);

-- STEP 3: Update existing data to have proper defaults
UPDATE employees 
SET employee_type = 'Local', employment_status = 'Active' 
WHERE employee_type IS NULL OR employment_status IS NULL;

UPDATE pay_groups 
SET type = 'local' 
WHERE type IS NULL;

-- STEP 4: Add comments for documentation
COMMENT ON COLUMN pay_groups.type IS 'Pay group type: local, expatriate, contractor, intern, temporary';
COMMENT ON COLUMN employees.employee_type IS 'Employee type: Local or Expatriate';
COMMENT ON COLUMN employees.employee_category IS 'Employee category: Intern, Trainee, Temporary, Permanent, On Contract, Casual';
COMMENT ON COLUMN employees.employment_status IS 'Employment status: Active, Terminated, Deceased, Resigned, Probation, Notice Period';
