
-- Anomaly logs table for unified anomaly detection system
CREATE TABLE public.anomaly_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  section text NOT NULL CHECK (section IN ('timesheet', 'employee', 'approval', 'payrun')),
  affected_record_type text NOT NULL,
  affected_record_id text,
  affected_employee_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  detected_by text DEFAULT 'system',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_action text,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_anomaly_logs_org ON public.anomaly_logs(organization_id);
CREATE INDEX idx_anomaly_logs_severity ON public.anomaly_logs(severity);
CREATE INDEX idx_anomaly_logs_status ON public.anomaly_logs(status);
CREATE INDEX idx_anomaly_logs_section ON public.anomaly_logs(section);
CREATE INDEX idx_anomaly_logs_detected ON public.anomaly_logs(detected_at DESC);

ALTER TABLE public.anomaly_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view anomalies"
  ON public.anomaly_logs FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.user_belongs_to_org(organization_id)
  );

CREATE POLICY "Org admins can update anomalies"
  ON public.anomaly_logs FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.check_is_org_admin(auth.uid())
  );

CREATE POLICY "System can insert anomalies"
  ON public.anomaly_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.user_belongs_to_org(organization_id)
  );

-- Trigger for updated_at
CREATE TRIGGER set_anomaly_logs_updated_at
  BEFORE UPDATE ON public.anomaly_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to check timesheet anomalies
CREATE OR REPLACE FUNCTION public.check_timesheet_anomalies(
  p_employee_id uuid,
  p_project_id uuid,
  p_work_date date,
  p_task_description text,
  p_units numeric,
  p_rate numeric,
  p_entry_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_max_units numeric;
  v_employee_rate numeric;
  v_existing_units numeric;
  v_anomalies jsonb := '[]'::jsonb;
  v_emp_name text;
  v_consecutive_count int;
BEGIN
  -- Get org and employee info
  SELECT e.organization_id, COALESCE(e.max_units_per_day, 5.0), e.pay_rate,
         COALESCE(e.first_name || ' ' || e.last_name, e.email)
  INTO v_org_id, v_max_units, v_employee_rate, v_emp_name
  FROM public.employees e WHERE e.id = p_employee_id;

  IF v_org_id IS NULL THEN RETURN v_anomalies; END IF;

  -- 1. Duplicate entry detection (CRITICAL)
  IF EXISTS (
    SELECT 1 FROM public.ippms_daily_timesheet_entries
    WHERE employee_id = p_employee_id
      AND work_date = p_work_date
      AND task_description = p_task_description
      AND (p_entry_id IS NULL OR id != p_entry_id)
  ) THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'duplicate_entry',
      'severity', 'critical',
      'message', format('Duplicate entry detected. %s already has an entry for "%s" on %s.', v_emp_name, p_task_description, p_work_date)
    );
  END IF;

  -- 2. Units exceeding max per day (CRITICAL)
  SELECT COALESCE(SUM(units), 0) INTO v_existing_units
  FROM public.ippms_daily_timesheet_entries
  WHERE employee_id = p_employee_id
    AND work_date = p_work_date
    AND (p_entry_id IS NULL OR id != p_entry_id);

  IF v_existing_units + p_units > v_max_units THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'units_exceeded',
      'severity', 'critical',
      'message', format('Total units on %s would be %s, exceeding maximum of %s units per day.', p_work_date, v_existing_units + p_units, v_max_units),
      'current_units', v_existing_units,
      'max_units', v_max_units
    );
  END IF;

  -- 3. Rate mismatch (CRITICAL)
  IF v_employee_rate IS NOT NULL AND p_rate != v_employee_rate THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'rate_mismatch',
      'severity', 'critical',
      'message', format('Rate mismatch: Entry uses %s but %s''s current daily rate is %s.', p_rate, v_emp_name, v_employee_rate),
      'entry_rate', p_rate,
      'employee_rate', v_employee_rate
    );
  END IF;

  -- 4. Suspiciously round numbers pattern (WARNING)
  SELECT COUNT(*) INTO v_consecutive_count
  FROM (
    SELECT units, work_date,
           ROW_NUMBER() OVER (ORDER BY work_date DESC) as rn
    FROM public.ippms_daily_timesheet_entries
    WHERE employee_id = p_employee_id
    ORDER BY work_date DESC
    LIMIT 10
  ) sub
  WHERE sub.units = p_units;

  IF v_consecutive_count >= 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'round_numbers_pattern',
      'severity', 'warning',
      'message', format('%s has logged exactly %s units for %s consecutive entries. Review for accuracy.', v_emp_name, p_units, v_consecutive_count)
    );
  END IF;

  -- 5. Multiple projects same day (WARNING)
  IF EXISTS (
    SELECT 1 FROM public.ippms_daily_timesheet_entries
    WHERE employee_id = p_employee_id
      AND work_date = p_work_date
      AND project_id != p_project_id
  ) THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'multi_project_same_day',
      'severity', 'warning',
      'message', format('%s is logged across multiple projects on %s. Verify this is intentional.', v_emp_name, p_work_date)
    );
  END IF;

  RETURN v_anomalies;
END;
$$;

-- Function to check payrun anomalies
CREATE OR REPLACE FUNCTION public.check_payrun_anomalies(p_payrun_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payrun RECORD;
  v_anomalies jsonb := '[]'::jsonb;
  v_org_id uuid;
  v_zero_pay_count int;
  v_spike_employees jsonb;
BEGIN
  SELECT * INTO v_payrun FROM public.pay_runs WHERE id = p_payrun_id;
  IF v_payrun.id IS NULL THEN RETURN v_anomalies; END IF;

  v_org_id := v_payrun.organization_id;

  -- 1. Duplicate pay run (CRITICAL)
  IF EXISTS (
    SELECT 1 FROM public.pay_runs
    WHERE pay_group_id = v_payrun.pay_group_id
      AND period_start = v_payrun.period_start
      AND period_end = v_payrun.period_end
      AND id != p_payrun_id
  ) THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'duplicate_payrun',
      'severity', 'critical',
      'message', 'A pay run already exists for this pay group and period. Creating a duplicate may result in double payment.'
    );
  END IF;

  -- 2. Zero pay employees (WARNING)
  SELECT COUNT(*) INTO v_zero_pay_count
  FROM public.pay_items
  WHERE pay_run_id = p_payrun_id
    AND COALESCE(gross_pay, 0) = 0;

  IF v_zero_pay_count > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'zero_pay_included',
      'severity', 'warning',
      'message', format('%s employees in this pay run have zero gross pay. This may indicate missing timesheets or inactive assignments.', v_zero_pay_count),
      'count', v_zero_pay_count
    );
  END IF;

  -- 3. Gross pay spike (WARNING) - compare to 3-period average
  SELECT jsonb_agg(jsonb_build_object('employee_id', sub.employee_id, 'current_gross', sub.current_gross, 'avg_gross', sub.avg_gross, 'pct_change', sub.pct_change))
  INTO v_spike_employees
  FROM (
    SELECT pi.employee_id, pi.gross_pay as current_gross,
           avg_prev.avg_gross,
           CASE WHEN avg_prev.avg_gross > 0 THEN ((pi.gross_pay - avg_prev.avg_gross) / avg_prev.avg_gross * 100) ELSE 0 END as pct_change
    FROM public.pay_items pi
    LEFT JOIN LATERAL (
      SELECT AVG(pi2.gross_pay) as avg_gross
      FROM public.pay_items pi2
      JOIN public.pay_runs pr2 ON pr2.id = pi2.pay_run_id
      WHERE pi2.employee_id = pi.employee_id
        AND pr2.id != p_payrun_id
        AND pr2.status IN ('approved', 'locked')
      ORDER BY pr2.period_end DESC
      LIMIT 3
    ) avg_prev ON true
    WHERE pi.pay_run_id = p_payrun_id
      AND avg_prev.avg_gross > 0
      AND ((pi.gross_pay - avg_prev.avg_gross) / avg_prev.avg_gross * 100) > 50
  ) sub;

  IF v_spike_employees IS NOT NULL AND jsonb_array_length(v_spike_employees) > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'gross_pay_spike',
      'severity', 'warning',
      'message', format('%s employees have a gross pay spike >50%% compared to their 3-period average.', jsonb_array_length(v_spike_employees)),
      'employees', v_spike_employees
    );
  END IF;

  -- Log anomalies
  IF jsonb_array_length(v_anomalies) > 0 THEN
    INSERT INTO public.anomaly_logs (organization_id, anomaly_type, severity, section, affected_record_type, affected_record_id, description, metadata)
    SELECT v_org_id,
           (a->>'type'),
           (a->>'severity'),
           'payrun',
           'pay_run',
           p_payrun_id::text,
           (a->>'message'),
           a
    FROM jsonb_array_elements(v_anomalies) a
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_anomalies;
END;
$$;

-- Function to get anomaly counts by severity
CREATE OR REPLACE FUNCTION public.get_anomaly_counts(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active'),
    'warning', COUNT(*) FILTER (WHERE severity = 'warning' AND status = 'active'),
    'info', COUNT(*) FILTER (WHERE severity = 'info' AND status = 'active'),
    'total', COUNT(*) FILTER (WHERE status = 'active')
  )
  FROM public.anomaly_logs
  WHERE organization_id = p_org_id;
$$;
