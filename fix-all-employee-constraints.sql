-- Fix all employee table constraints to match application values
-- This script resolves multiple CHECK constraint violations

-- Step 1: Fix employee_type_check constraint
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employee_type_check;

ALTER TABLE public.employees 
ADD CONSTRAINT employee_type_check 
CHECK (employee_type IN ('Local', 'Expatriate'));

-- Step 2: Update existing employee_type records to use capitalized values
UPDATE public.employees 
SET employee_type = 'Local' 
WHERE employee_type = 'local';

UPDATE public.employees 
SET employee_type = 'Expatriate' 
WHERE employee_type = 'expatriate';

-- Step 3: Check if employee_category constraint needs fixing
-- Drop and recreate with proper values
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_employee_category_check;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_employee_category_check 
CHECK (employee_category IN ('Intern','Trainee','Temporary','Permanent','On Contract','Casual') OR employee_category IS NULL);

-- Step 4: Check if employment_status constraint needs fixing
-- Drop and recreate with proper values
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_employment_status_check;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_employment_status_check 
CHECK (employment_status IN ('Active','Terminated','Deceased','Resigned','Probation','Notice Period') OR employment_status IS NULL);

-- Step 5: Add default values for new columns if they don't exist
UPDATE public.employees 
SET employee_type = 'Local' 
WHERE employee_type IS NULL;

UPDATE public.employees 
SET employment_status = 'Active' 
WHERE employment_status IS NULL;

-- Step 6: Verify all constraints are working
SELECT 
  id, 
  name, 
  email, 
  employee_type,
  employee_category,
  employment_status,
  created_at
FROM public.employees 
ORDER BY employee_type, name;

-- Step 7: Show all constraints on employees table
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.employees'::regclass
AND contype = 'c';
