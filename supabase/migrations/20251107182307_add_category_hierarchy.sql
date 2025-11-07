-- Migration: Add category/sub_type/pay_frequency hierarchy to paygroups, employees, and pay_runs
-- This migration adds the hierarchical structure: Head Office (regular, expatriate, interns) and Projects (manpower, ippms, expatriate)

-- ============================================================
-- 1. PAY GROUPS TABLE
-- ============================================================

-- Add category column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('head_office', 'projects'));

-- Add sub_type column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS sub_type text;

-- Add pay_frequency column (for Manpower sub-types)
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS pay_frequency text CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- Add check constraint for valid category/sub_type combinations
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_category_sub_type;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_category_sub_type CHECK (
  (category = 'head_office' AND sub_type IN ('regular', 'expatriate', 'interns')) OR
  (category = 'projects' AND sub_type IN ('manpower', 'ippms', 'expatriate')) OR
  (category IS NULL AND sub_type IS NULL)
);

-- Add check constraint for pay_frequency (only for projects.manpower)
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_pay_frequency;

ALTER TABLE public.pay_groups
ADD CONSTRAINT check_pay_frequency CHECK (
  (sub_type = 'manpower' AND pay_frequency IN ('daily', 'bi_weekly', 'monthly')) OR
  (sub_type != 'manpower' AND pay_frequency IS NULL)
);

-- ============================================================
-- 2. PAY_GROUP_MASTER TABLE
-- ============================================================

-- Add category column
ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('head_office', 'projects'));

-- Add sub_type column
ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS sub_type text;

-- Add pay_frequency column
ALTER TABLE public.pay_group_master
ADD COLUMN IF NOT EXISTS pay_frequency text CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- ============================================================
-- 3. EMPLOYEES TABLE
-- ============================================================

-- Add category column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('head_office', 'projects') OR category IS NULL);

-- Add sub_type column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS sub_type text;

-- Add pay_frequency column (for Manpower employees)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS pay_frequency text CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- ============================================================
-- 4. PAY_RUNS TABLE
-- ============================================================

-- Add category column (derived from paygroup but stored for performance)
ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('head_office', 'projects'));

-- Add sub_type column
ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS sub_type text;

-- Add pay_frequency column (for Manpower pay runs)
ALTER TABLE public.pay_runs
ADD COLUMN IF NOT EXISTS pay_frequency text CHECK (pay_frequency IN ('daily', 'bi_weekly', 'monthly') OR pay_frequency IS NULL);

-- ============================================================
-- 5. MIGRATE EXISTING DATA
-- ============================================================

-- Migrate existing pay_groups
UPDATE public.pay_groups
SET 
  category = CASE 
    WHEN type = 'regular' OR type = 'Local' THEN 'head_office'
    WHEN type = 'expatriate' OR type = 'Expatriate' THEN 'head_office'
    WHEN type = 'intern' OR type = 'Intern' THEN 'head_office'
    WHEN type = 'contractor' OR type = 'Contractor' THEN 'projects'
    ELSE NULL
  END,
  sub_type = CASE 
    WHEN type = 'regular' OR type = 'Local' THEN 'regular'
    WHEN type = 'expatriate' OR type = 'Expatriate' THEN 'expatriate'
    WHEN type = 'intern' OR type = 'Intern' THEN 'interns'
    WHEN type = 'contractor' OR type = 'Contractor' THEN 'manpower'
    ELSE NULL
  END,
  pay_frequency = CASE 
    WHEN type = 'contractor' OR type = 'Contractor' THEN 
      CASE 
        WHEN pay_frequency::text = 'weekly' THEN 'bi_weekly'
        WHEN pay_frequency::text = 'bi_weekly' THEN 'bi_weekly'
        WHEN pay_frequency::text = 'monthly' THEN 'monthly'
        ELSE 'monthly'
      END
    ELSE NULL
  END
WHERE category IS NULL;

-- Migrate paygroups with piece_rate pay_type to projects.ippms
UPDATE public.pay_groups
SET 
  category = 'projects',
  sub_type = 'ippms',
  pay_frequency = NULL
WHERE EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.pay_group_id = pay_groups.id 
  AND e.pay_type = 'piece_rate'
)
AND category IS NULL;

-- Migrate pay_group_master records
UPDATE public.pay_group_master pgm
SET 
  category = pg.category,
  sub_type = pg.sub_type,
  pay_frequency = pg.pay_frequency
FROM public.pay_groups pg
WHERE pgm.source_table = 'pay_groups' 
  AND pgm.source_id = pg.id
  AND pgm.category IS NULL;

-- Migrate expatriate_pay_groups in pay_group_master
UPDATE public.pay_group_master pgm
SET 
  category = CASE 
    WHEN epg.name ILIKE '%head office%' OR epg.name ILIKE '%head%' THEN 'head_office'
    WHEN epg.name ILIKE '%project%' THEN 'projects'
    ELSE 'head_office' -- Default to head_office for existing expatriate groups
  END,
  sub_type = 'expatriate',
  pay_frequency = NULL
FROM public.expatriate_pay_groups epg
WHERE pgm.source_table = 'expatriate_pay_groups' 
  AND pgm.source_id = epg.id
  AND pgm.category IS NULL;

-- Migrate employees based on their paygroup assignments
UPDATE public.employees e
SET 
  category = pg.category,
  sub_type = pg.sub_type,
  pay_frequency = pg.pay_frequency
FROM public.pay_groups pg
WHERE e.pay_group_id = pg.id
  AND e.category IS NULL;

-- Migrate employees assigned to expatriate paygroups
UPDATE public.employees e
SET 
  category = CASE 
    WHEN epg.name ILIKE '%head office%' OR epg.name ILIKE '%head%' THEN 'head_office'
    WHEN epg.name ILIKE '%project%' THEN 'projects'
    ELSE 'head_office'
  END,
  sub_type = 'expatriate',
  pay_frequency = NULL
FROM public.paygroup_employees pge
JOIN public.expatriate_pay_groups epg ON pge.pay_group_id = epg.id
WHERE e.id = pge.employee_id
  AND e.category IS NULL;

-- Migrate pay_runs based on their pay_group_master_id
UPDATE public.pay_runs pr
SET 
  category = pgm.category,
  sub_type = pgm.sub_type,
  pay_frequency = pgm.pay_frequency
FROM public.pay_group_master pgm
WHERE pr.pay_group_master_id = pgm.id
  AND pr.category IS NULL;

-- Migrate pay_runs that don't have pay_group_master_id (legacy data)
UPDATE public.pay_runs pr
SET 
  category = pg.category,
  sub_type = pg.sub_type,
  pay_frequency = pg.pay_frequency
FROM public.pay_groups pg
WHERE pr.pay_group_id = pg.id
  AND pr.pay_group_master_id IS NULL
  AND pr.category IS NULL;

-- ============================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pay_groups_category_sub_type ON public.pay_groups(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_pay_groups_pay_frequency ON public.pay_groups(pay_frequency) WHERE pay_frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pay_group_master_category_sub_type ON public.pay_group_master(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_employees_category_sub_type ON public.employees(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_category_sub_type ON public.pay_runs(category, sub_type);
CREATE INDEX IF NOT EXISTS idx_pay_runs_pay_frequency ON public.pay_runs(pay_frequency) WHERE pay_frequency IS NOT NULL;

-- ============================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN public.pay_groups.category IS 'Main category: head_office or projects';
COMMENT ON COLUMN public.pay_groups.sub_type IS 'Sub-type: regular, expatriate, interns (head_office) or manpower, ippms, expatriate (projects)';
COMMENT ON COLUMN public.pay_groups.pay_frequency IS 'Pay frequency for Manpower sub-type: daily, bi_weekly, or monthly';
COMMENT ON COLUMN public.employees.category IS 'Employee category: head_office or projects (only editable from employee module)';
COMMENT ON COLUMN public.employees.sub_type IS 'Employee sub-type matching paygroup structure';
COMMENT ON COLUMN public.employees.pay_frequency IS 'Pay frequency for Manpower employees: daily, bi_weekly, or monthly';
COMMENT ON COLUMN public.pay_runs.category IS 'Pay run category derived from paygroup (head_office or projects)';
COMMENT ON COLUMN public.pay_runs.sub_type IS 'Pay run sub-type derived from paygroup';
COMMENT ON COLUMN public.pay_runs.pay_frequency IS 'Pay frequency for Manpower pay runs: daily, bi_weekly, or monthly';

