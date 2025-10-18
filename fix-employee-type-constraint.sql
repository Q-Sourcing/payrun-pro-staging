-- Fix employee_type_check constraint to accept capitalized values
-- This script resolves the "employee_type_check" constraint violation

-- Step 1: Drop the existing constraint
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employee_type_check;

-- Step 2: Add new constraint with capitalized values that match the application
ALTER TABLE public.employees 
ADD CONSTRAINT employee_type_check 
CHECK (employee_type IN ('Local', 'Expatriate'));

-- Step 3: Update any existing records to use capitalized values
UPDATE public.employees 
SET employee_type = 'Local' 
WHERE employee_type = 'local';

UPDATE public.employees 
SET employee_type = 'Expatriate' 
WHERE employee_type = 'expatriate';

-- Step 4: Verify the constraint is working
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

-- Step 5: Show constraint details
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'employee_type_check';
