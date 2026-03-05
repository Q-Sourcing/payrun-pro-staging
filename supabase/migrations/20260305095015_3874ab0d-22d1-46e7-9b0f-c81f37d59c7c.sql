
-- Timesheet periods (one per submission cycle per employee)
CREATE TABLE public.timesheets (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at    TIMESTAMP WITH TIME ZONE,
  submitted_by    UUID,
  approved_at     TIMESTAMP WITH TIME ZONE,
  approved_by     UUID,
  reviewer_notes  TEXT,
  total_hours     NUMERIC(8,2) DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual timesheet entry rows
CREATE TABLE public.timesheet_entries (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timesheet_id    UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date       DATE NOT NULL,
  hours_worked    NUMERIC(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  department      TEXT NOT NULL,
  task_description TEXT NOT NULL,
  linked_pay_run_id UUID REFERENCES public.pay_runs(id) ON DELETE SET NULL,
  is_aggregated   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (timesheet_id, work_date)
);

-- Pre-defined departments list
CREATE TABLE public.timesheet_departments (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Indexes
CREATE INDEX idx_timesheets_employee_id   ON public.timesheets(employee_id);
CREATE INDEX idx_timesheets_organization  ON public.timesheets(organization_id);
CREATE INDEX idx_timesheets_status        ON public.timesheets(status);
CREATE INDEX idx_timesheet_entries_sheet  ON public.timesheet_entries(timesheet_id);
CREATE INDEX idx_timesheet_entries_date   ON public.timesheet_entries(work_date);
CREATE INDEX idx_timesheet_entries_emp    ON public.timesheet_entries(employee_id);

-- Updated_at triggers
CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timesheet_entries_updated_at
  BEFORE UPDATE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: keep timesheets.total_hours in sync
CREATE OR REPLACE FUNCTION public.sync_timesheet_total_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.timesheets
  SET total_hours = (
    SELECT COALESCE(SUM(hours_worked), 0)
    FROM public.timesheet_entries
    WHERE timesheet_id = COALESCE(NEW.timesheet_id, OLD.timesheet_id)
  )
  WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_timesheet_hours_after_entry
  AFTER INSERT OR UPDATE OR DELETE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_timesheet_total_hours();

-- RLS
ALTER TABLE public.timesheets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_departments ENABLE ROW LEVEL SECURITY;

-- Timesheets: employee can CRUD their own
CREATE POLICY "Employees can manage own timesheets"
  ON public.timesheets FOR ALL
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

CREATE POLICY "Org admins can view all timesheets"
  ON public.timesheets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org admins can update timesheets"
  ON public.timesheets FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Timesheet entries follow parent timesheet access
CREATE POLICY "Employees can manage own entries"
  ON public.timesheet_entries FOR ALL
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

CREATE POLICY "Org admins can view all entries"
  ON public.timesheet_entries FOR SELECT
  USING (
    timesheet_id IN (
      SELECT t.id FROM public.timesheets t
      JOIN public.user_profiles up ON up.organization_id = t.organization_id
      WHERE up.id = auth.uid()
    )
  );

-- Departments: org-scoped read for all; write for admins
CREATE POLICY "Org members can read departments"
  ON public.timesheet_departments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage departments"
  ON public.timesheet_departments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
