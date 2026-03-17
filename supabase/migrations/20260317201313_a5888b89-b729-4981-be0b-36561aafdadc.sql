
-- Daily rate timesheet entries for IPPMS projects
CREATE TABLE IF NOT EXISTS public.ippms_daily_timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  task_description text NOT NULL DEFAULT '',
  units numeric(5,2) NOT NULL DEFAULT 1.0,
  rate_snapshot numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) GENERATED ALWAYS AS (units * rate_snapshot) STORED,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ippms_timesheet_emp_date ON public.ippms_daily_timesheet_entries(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_ippms_timesheet_project ON public.ippms_daily_timesheet_entries(project_id, work_date);

-- Predefined task list per project
CREATE TABLE IF NOT EXISTS public.ippms_project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ippms_project_tasks ON public.ippms_project_tasks(project_id, is_active);

-- Add daily rate config fields to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS allow_multiple_entries_per_day boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_units_per_day numeric(4,1) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS timesheet_approval_required boolean DEFAULT false;

-- Enable RLS
ALTER TABLE public.ippms_daily_timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ippms_project_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read/write (org-level check done in app)
CREATE POLICY "Authenticated users can manage timesheet entries"
  ON public.ippms_daily_timesheet_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage project tasks"
  ON public.ippms_project_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_ippms_timesheet_updated_at
  BEFORE UPDATE ON public.ippms_daily_timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_now();
