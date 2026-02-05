-- Add project_type to pay_groups and backfill for project-based groups

ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS project_type text CHECK (project_type IN ('manpower','ippms','expatriate'));

COMMENT ON COLUMN public.pay_groups.project_type IS 'Links to project''s employee type when category = projects';

-- Backfill project_type from employee_type for existing project-based pay groups
UPDATE public.pay_groups
SET project_type = CASE
  WHEN employee_type IN ('manpower','ippms','expatriate') THEN employee_type
  ELSE project_type
END
WHERE category = 'projects'
  AND project_type IS NULL;

-- Helpful indexes for filtering
CREATE INDEX IF NOT EXISTS idx_pay_groups_category_project_type ON public.pay_groups(category, project_type);
CREATE INDEX IF NOT EXISTS idx_pay_groups_project_filters ON public.pay_groups(project_type, pay_type, project_id);


