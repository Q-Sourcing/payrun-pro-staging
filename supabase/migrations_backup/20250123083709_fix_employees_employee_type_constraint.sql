-- Fix employees_employee_type_check constraint to accept category-based values
-- This migration updates the constraint to match the new category-based employee_type system
-- The constraint should allow:
-- - For head_office category: 'regular', 'expatriate', 'interns'
-- - For projects category: 'manpower', 'ippms', 'expatriate'
-- - NULL when category is NULL

-- Step 1: Drop the old constraint(s) if they exist (before migrating data)
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_employee_type_check;

ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employee_type_check;

-- Step 2: Migrate existing employee_type values to match new category-based system
-- Map old values to new values based on category
UPDATE public.employees
SET employee_type = CASE
  -- If category is head_office, map old values to new head_office values
  WHEN category = 'head_office' THEN
    CASE
      WHEN employee_type IN ('local', 'Local', 'regular') THEN 'regular'
      WHEN employee_type IN ('expatriate', 'Expatriate') THEN 'expatriate'
      WHEN employee_type IN ('intern', 'interns') THEN 'interns'
      ELSE employee_type -- Keep if already valid
    END
  -- If category is projects, map old values to new projects values
  WHEN category = 'projects' THEN
    CASE
      WHEN employee_type IN ('local', 'Local', 'manpower') THEN 'manpower'
      WHEN employee_type IN ('ippms', 'IPPMS') THEN 'ippms'
      WHEN employee_type IN ('expatriate', 'Expatriate') THEN 'expatriate'
      ELSE employee_type -- Keep if already valid
    END
  -- If category is NULL, set employee_type to NULL
  WHEN category IS NULL THEN NULL
  -- Default: try to infer from existing value
  ELSE
    CASE
      WHEN employee_type IN ('local', 'Local') THEN 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM public.pay_groups pg 
            WHERE pg.id = employees.pay_group_id 
            AND pg.category = 'projects'
          ) THEN 'manpower'
          ELSE 'regular'
        END
      WHEN employee_type IN ('expatriate', 'Expatriate') THEN 'expatriate'
      ELSE employee_type
    END
END
WHERE employee_type IS NOT NULL 
  AND (
    -- Only update rows that need migration
    employee_type IN ('local', 'Local', 'intern', 'interns', 'IPPMS')
    OR (category IS NULL AND employee_type IS NOT NULL)
  );

-- Step 3: Ensure category is set for employees that have employee_type but no category
-- Default to head_office if we can't determine from pay_group
UPDATE public.employees
SET category = 'head_office'
WHERE category IS NULL 
  AND employee_type IS NOT NULL
  AND employee_type IN ('regular', 'expatriate', 'interns');

UPDATE public.employees
SET category = 'projects'
WHERE category IS NULL 
  AND employee_type IS NOT NULL
  AND employee_type IN ('manpower', 'ippms');

-- Step 4: Set employee_type to NULL for rows where category is NULL
UPDATE public.employees
SET employee_type = NULL
WHERE category IS NULL AND employee_type IS NOT NULL;

-- Step 4.5: Fix any remaining invalid combinations
-- For head_office category, ensure employee_type is valid
UPDATE public.employees
SET employee_type = CASE
  WHEN employee_type IN ('regular', 'expatriate', 'interns') THEN employee_type
  WHEN employee_type IN ('manpower', 'ippms') THEN 'regular' -- Default to regular for head_office
  ELSE 'regular' -- Default fallback
END
WHERE category = 'head_office' 
  AND (employee_type IS NULL OR employee_type NOT IN ('regular', 'expatriate', 'interns'));

-- For projects category, ensure employee_type is valid
UPDATE public.employees
SET employee_type = CASE
  WHEN employee_type IN ('manpower', 'ippms', 'expatriate') THEN employee_type
  WHEN employee_type IN ('regular', 'interns') THEN 'manpower' -- Default to manpower for projects
  ELSE 'manpower' -- Default fallback
END
WHERE category = 'projects' 
  AND (employee_type IS NULL OR employee_type NOT IN ('manpower', 'ippms', 'expatriate'));

-- Ensure NULL category has NULL employee_type
UPDATE public.employees
SET employee_type = NULL
WHERE category IS NULL AND employee_type IS NOT NULL;

-- Step 5: Normalize category values (handle empty strings, etc.)
UPDATE public.employees
SET category = NULL
WHERE category IS NOT NULL AND category NOT IN ('head_office', 'projects');

-- Step 6: Verify and fix any remaining invalid rows before adding constraint
-- Handle any edge cases where category and employee_type don't match
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Fix any head_office rows with invalid employee_type
  UPDATE public.employees
  SET employee_type = 'regular'
  WHERE category = 'head_office' 
    AND (employee_type IS NULL OR employee_type NOT IN ('regular', 'expatriate', 'interns'));
  
  -- Fix any projects rows with invalid employee_type
  UPDATE public.employees
  SET employee_type = 'manpower'
  WHERE category = 'projects' 
    AND (employee_type IS NULL OR employee_type NOT IN ('manpower', 'ippms', 'expatriate'));
  
  -- Ensure NULL category has NULL employee_type
  UPDATE public.employees
  SET employee_type = NULL
  WHERE category IS NULL AND employee_type IS NOT NULL;
  
  -- Check if there are still any invalid rows
  SELECT COUNT(*) INTO invalid_count
  FROM public.employees
  WHERE NOT (
    (category = 'head_office' AND employee_type IN ('regular', 'expatriate', 'interns')) OR
    (category = 'projects' AND employee_type IN ('manpower', 'ippms', 'expatriate')) OR
    (category IS NULL AND employee_type IS NULL)
  );
  
  -- If there are still invalid rows, set them to safe defaults
  IF invalid_count > 0 THEN
    -- For rows with invalid category/employee_type combinations, set category to NULL and employee_type to NULL
    UPDATE public.employees
    SET category = NULL, employee_type = NULL
    WHERE NOT (
      (category = 'head_office' AND employee_type IN ('regular', 'expatriate', 'interns')) OR
      (category = 'projects' AND employee_type IN ('manpower', 'ippms', 'expatriate')) OR
      (category IS NULL AND employee_type IS NULL)
    );
    
    -- Verify again
    SELECT COUNT(*) INTO invalid_count
    FROM public.employees
    WHERE NOT (
      (category = 'head_office' AND employee_type IN ('regular', 'expatriate', 'interns')) OR
      (category = 'projects' AND employee_type IN ('manpower', 'ippms', 'expatriate')) OR
      (category IS NULL AND employee_type IS NULL)
    );
    
    IF invalid_count > 0 THEN
      RAISE EXCEPTION 'Still found % invalid rows after all fixes. Please review data manually using diagnose_employee_type_issues.sql', invalid_count;
    END IF;
  END IF;
END $$;

-- Step 7: Add new constraint that matches the category-based system
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

-- Step 8: Verify constraint was added successfully
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.employees'::regclass
  AND conname = 'employees_employee_type_check';

-- Step 8: Add comment for documentation
COMMENT ON CONSTRAINT employees_employee_type_check ON public.employees IS 
'Employee type must match category: head_office (regular, expatriate, interns) or projects (manpower, ippms, expatriate)';

