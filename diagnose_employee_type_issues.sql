-- Diagnostic script to identify problematic employee rows
-- Run this before the migration to see what needs to be fixed

-- Show all unique combinations of category and employee_type
SELECT 
  category,
  employee_type,
  COUNT(*) as count
FROM public.employees
GROUP BY category, employee_type
ORDER BY category, employee_type;

-- Show rows that would violate the new constraint
SELECT 
  id,
  first_name,
  last_name,
  category,
  employee_type,
  pay_group_id
FROM public.employees
WHERE NOT (
  (category = 'head_office' AND employee_type IN ('regular', 'expatriate', 'interns')) OR
  (category = 'projects' AND employee_type IN ('manpower', 'ippms', 'expatriate')) OR
  (category IS NULL AND employee_type IS NULL)
)
ORDER BY category, employee_type;

-- Show employees with NULL category but non-NULL employee_type
SELECT 
  id,
  first_name,
  last_name,
  category,
  employee_type,
  pay_group_id
FROM public.employees
WHERE category IS NULL AND employee_type IS NOT NULL;

-- Show employees with non-NULL category but NULL employee_type
SELECT 
  id,
  first_name,
  last_name,
  category,
  employee_type,
  pay_group_id
FROM public.employees
WHERE category IS NOT NULL AND employee_type IS NULL;

