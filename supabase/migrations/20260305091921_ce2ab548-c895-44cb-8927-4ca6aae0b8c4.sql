-- Phase 3: Probation tracking columns on employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS probation_status text DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS probation_notes text;

CREATE INDEX IF NOT EXISTS idx_employees_probation_end_date ON public.employees(probation_end_date)
  WHERE probation_end_date IS NOT NULL;

-- Probation reminder log table (to avoid duplicate reminders)
CREATE TABLE IF NOT EXISTS public.probation_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, reminder_type)
);

ALTER TABLE public.probation_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_reminder_logs" ON public.probation_reminder_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

CREATE POLICY "service_role_manage_reminder_logs" ON public.probation_reminder_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_probation_reminder_logs_employee ON public.probation_reminder_logs(employee_id);