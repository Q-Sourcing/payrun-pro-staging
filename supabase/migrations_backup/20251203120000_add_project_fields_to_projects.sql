-- Extend projects with project-aware fields
-- Adds: project_type, project_subtype, allowed_pay_types, supports_all_pay_types

-- Project (Employee) Type: manpower | ippms | expatriate
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_type text CHECK (project_type IN ('manpower','ippms','expatriate'));

-- For manpower projects only: daily | bi_weekly | monthly
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_subtype text CHECK (project_subtype IN ('daily','bi_weekly','monthly'));

-- When supports_all_pay_types = true, this can be NULL
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS allowed_pay_types text[];

-- If TRUE, all pay types for project_type are allowed
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS supports_all_pay_types boolean DEFAULT false;

-- Helpful comments
COMMENT ON COLUMN public.projects.project_type IS 'Project (Employee) Type: manpower | ippms | expatriate';
COMMENT ON COLUMN public.projects.project_subtype IS 'For manpower projects: daily | bi_weekly | monthly';
COMMENT ON COLUMN public.projects.allowed_pay_types IS 'Specific pay types allowed; NULL when supports_all_pay_types = true';
COMMENT ON COLUMN public.projects.supports_all_pay_types IS 'If TRUE, all pay types for project_type are allowed';

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_status_type ON public.projects(status, project_type);


