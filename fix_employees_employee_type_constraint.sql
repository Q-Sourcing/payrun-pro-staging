-- Fix employees_employee_type_check constraint to accept category-based values
-- This script updates the constraint to match the new category-based employee_type system
-- Run this in Supabase Dashboard SQL Editor

-- Step 1: Drop the old constraint if it exists
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_employee_type_check;

ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employee_type_check;

-- Step 2: Add new constraint that matches the category-based system
-- This constraint allows:
-- - For head_office category: 'regular', 'expatriate', 'interns'
-- - For projects category: 'manpower', 'ippms', 'expatriate'
-- - NULL when category is NULL
ALTER TABLE public.employees
ADD CONSTRAINT employees_employee_type_check CHECK (
  (category = 'head_office' AND employee_type IN ('regular', 'expatriate', 'interns')) OR
  (category = 'projects' AND employee_type IN ('manpower', 'ippms', 'expatriate')) OR
  (category IS NULL AND employee_type IS NULL)
);

-- Step 3: Verify the constraint was created
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.employees'::regclass
  AND conname = 'employees_employee_type_check';

-- Step 4: Show current employee_type values to verify they match
SELECT 
  category,
  employee_type,
  COUNT(*) as count
FROM public.employees
GROUP BY category, employee_type
ORDER BY category, employee_type;

