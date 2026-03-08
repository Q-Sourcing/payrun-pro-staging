
-- Time tracking entries for actual hour logging against projects/tasks
CREATE TABLE public.time_tracking_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id),
  task_title text NOT NULL DEFAULT '',
  description text,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes numeric,
  is_running boolean NOT NULL DEFAULT false,
  is_billable boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_time_tracking_employee ON public.time_tracking_entries(employee_id);
CREATE INDEX idx_time_tracking_org ON public.time_tracking_entries(organization_id);
CREATE INDEX idx_time_tracking_project ON public.time_tracking_entries(project_id);
CREATE INDEX idx_time_tracking_running ON public.time_tracking_entries(employee_id, is_running) WHERE is_running = true;
CREATE INDEX idx_time_tracking_date ON public.time_tracking_entries(employee_id, start_time);

-- Auto-update updated_at
CREATE TRIGGER set_time_tracking_updated_at
  BEFORE UPDATE ON public.time_tracking_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- RLS
ALTER TABLE public.time_tracking_entries ENABLE ROW LEVEL SECURITY;

-- Employees can manage their own entries
CREATE POLICY "Employees manage own time entries"
  ON public.time_tracking_entries
  FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Org admins can view all entries
CREATE POLICY "Org admins view all time entries"
  ON public.time_tracking_entries
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
  );
