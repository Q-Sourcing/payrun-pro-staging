
-- ============================================================
-- TIME & ATTENDANCE ENGINE — DATABASE MIGRATION
-- ============================================================

-- 1. ENUMS
CREATE TYPE public.attendance_status_enum AS ENUM (
  'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'SICK', 'OFF', 'PUBLIC_HOLIDAY', 'REMOTE'
);

CREATE TYPE public.attendance_mode_enum AS ENUM (
  'MOBILE_GPS', 'QR_CODE', 'BIOMETRIC', 'SUPERVISOR', 'API', 'TIMESHEET_ONLY'
);

CREATE TYPE public.tracking_type_enum AS ENUM (
  'MANDATORY', 'OPTIONAL', 'EXEMPT'
);

CREATE TYPE public.regularization_status_enum AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED'
);

CREATE TYPE public.recorded_source_enum AS ENUM (
  'ADMIN', 'SELF_CHECKIN', 'BULK_UPLOAD', 'SYSTEM', 'QR', 'BIOMETRIC', 'API'
);

CREATE TYPE public.geofence_type_enum AS ENUM (
  'office', 'site', 'client'
);

-- 2. LAYER 1 — TIME CAPTURE
CREATE TABLE public.attendance_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  clock_in_utc timestamptz NOT NULL DEFAULT now(),
  clock_out_utc timestamptz,
  timezone text NOT NULL DEFAULT 'Africa/Kampala',
  local_clock_in timestamptz NOT NULL DEFAULT now(),
  local_clock_out timestamptz,
  attendance_mode public.attendance_mode_enum NOT NULL DEFAULT 'MOBILE_GPS',
  latitude numeric,
  longitude numeric,
  geofence_id uuid,
  device_id text,
  photo_url text,
  recorded_source public.recorded_source_enum NOT NULL DEFAULT 'SELF_CHECKIN',
  recorded_by uuid REFERENCES auth.users(id),
  remarks text,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. LAYER 2 — POLICY ENGINE
CREATE TABLE public.attendance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  grace_period_minutes int NOT NULL DEFAULT 15,
  late_threshold_minutes int NOT NULL DEFAULT 30,
  half_day_hours numeric NOT NULL DEFAULT 4,
  max_late_per_month int,
  overtime_enabled boolean NOT NULL DEFAULT false,
  overtime_threshold_hours numeric NOT NULL DEFAULT 8,
  regularization_enabled boolean NOT NULL DEFAULT true,
  regularization_auto_approve boolean NOT NULL DEFAULT false,
  require_geolocation boolean NOT NULL DEFAULT false,
  geofence_radius_meters int NOT NULL DEFAULT 200,
  allow_self_checkin boolean NOT NULL DEFAULT true,
  work_start_time time NOT NULL DEFAULT '08:00',
  work_end_time time NOT NULL DEFAULT '17:00',
  default_timezone text NOT NULL DEFAULT 'Africa/Kampala',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, company_id)
);

CREATE TABLE public.geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  radius_meters int NOT NULL DEFAULT 200,
  type public.geofence_type_enum NOT NULL DEFAULT 'office',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  geofence_id uuid NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, geofence_id)
);

CREATE TABLE public.attendance_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  timezone text NOT NULL DEFAULT 'Africa/Kampala',
  grace_period_minutes int NOT NULL DEFAULT 15,
  overtime_threshold numeric NOT NULL DEFAULT 8,
  break_minutes int NOT NULL DEFAULT 60,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.attendance_shifts(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_time_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE,
  attendance_required boolean NOT NULL DEFAULT true,
  timesheet_required boolean NOT NULL DEFAULT true,
  tracking_type public.tracking_type_enum NOT NULL DEFAULT 'MANDATORY',
  attendance_mode public.attendance_mode_enum NOT NULL DEFAULT 'MOBILE_GPS',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. LAYER 3 — ATTENDANCE PROCESSING
CREATE TABLE public.attendance_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status public.attendance_status_enum NOT NULL DEFAULT 'ABSENT',
  first_clock_in timestamptz,
  last_clock_out timestamptz,
  total_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  is_late boolean DEFAULT false,
  late_minutes int DEFAULT 0,
  shift_id uuid REFERENCES public.attendance_shifts(id),
  is_locked boolean NOT NULL DEFAULT false,
  payrun_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE public.attendance_regularization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  requested_clock_in timestamptz NOT NULL,
  requested_clock_out timestamptz NOT NULL,
  reason text NOT NULL,
  status public.regularization_status_enum NOT NULL DEFAULT 'PENDING',
  approved_by uuid REFERENCES auth.users(id),
  approval_date timestamptz,
  approval_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. DEVICES (security)
CREATE TABLE public.attendance_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  is_trusted boolean NOT NULL DEFAULT false,
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, device_id)
);

-- 6. FK for geofence on time_logs
ALTER TABLE public.attendance_time_logs
  ADD CONSTRAINT attendance_time_logs_geofence_id_fkey
  FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE SET NULL;

-- 7. INDEXES
CREATE INDEX idx_time_logs_org_emp ON public.attendance_time_logs(organization_id, employee_id);
CREATE INDEX idx_time_logs_clock_in ON public.attendance_time_logs(clock_in_utc);
CREATE INDEX idx_time_logs_project ON public.attendance_time_logs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_daily_summary_org_date ON public.attendance_daily_summary(organization_id, attendance_date);
CREATE INDEX idx_daily_summary_emp_date ON public.attendance_daily_summary(employee_id, attendance_date);
CREATE INDEX idx_daily_summary_status ON public.attendance_daily_summary(status);
CREATE INDEX idx_regularization_status ON public.attendance_regularization_requests(status);
CREATE INDEX idx_regularization_emp ON public.attendance_regularization_requests(employee_id);
CREATE INDEX idx_geofences_org ON public.geofences(organization_id);
CREATE INDEX idx_shift_assignments_emp ON public.attendance_shift_assignments(employee_id);

-- 8. UPDATED_AT TRIGGERS
CREATE TRIGGER set_attendance_time_logs_updated_at BEFORE UPDATE ON public.attendance_time_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_attendance_policies_updated_at BEFORE UPDATE ON public.attendance_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_geofences_updated_at BEFORE UPDATE ON public.geofences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_attendance_shifts_updated_at BEFORE UPDATE ON public.attendance_shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_shift_assignments_updated_at BEFORE UPDATE ON public.attendance_shift_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_employee_time_policies_updated_at BEFORE UPDATE ON public.employee_time_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_daily_summary_updated_at BEFORE UPDATE ON public.attendance_daily_summary FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER set_regularization_updated_at BEFORE UPDATE ON public.attendance_regularization_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- 9. ADD attendance_daily_summary_id to existing timesheet_entries (Layer 4 link)
ALTER TABLE public.timesheet_entries
  ADD COLUMN IF NOT EXISTS attendance_daily_summary_id uuid REFERENCES public.attendance_daily_summary(id) ON DELETE SET NULL;

-- 10. RLS POLICIES
ALTER TABLE public.attendance_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_regularization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_devices ENABLE ROW LEVEL SECURITY;

-- Time Logs: employees read own, admins read all org
CREATE POLICY "employees_read_own_time_logs" ON public.attendance_time_logs
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "employees_insert_own_time_logs" ON public.attendance_time_logs
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_update_time_logs" ON public.attendance_time_logs
  FOR UPDATE TO authenticated
  USING (public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_delete_time_logs" ON public.attendance_time_logs
  FOR DELETE TO authenticated
  USING (public.check_is_org_admin(auth.uid()));

-- Policies: admin write, org member read
CREATE POLICY "org_members_read_policies" ON public.attendance_policies
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(organization_id) OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_policies" ON public.attendance_policies
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Geofences: admin write, org member read
CREATE POLICY "org_members_read_geofences" ON public.geofences
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(organization_id) OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_geofences" ON public.geofences
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Employee geofences
CREATE POLICY "read_employee_geofences" ON public.employee_geofences
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_employee_geofences" ON public.employee_geofences
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Shifts
CREATE POLICY "org_members_read_shifts" ON public.attendance_shifts
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(organization_id) OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_shifts" ON public.attendance_shifts
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Shift assignments
CREATE POLICY "read_shift_assignments" ON public.attendance_shift_assignments
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_shift_assignments" ON public.attendance_shift_assignments
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Employee time policies
CREATE POLICY "read_own_time_policy" ON public.employee_time_policies
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_time_policies" ON public.employee_time_policies
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Daily summary
CREATE POLICY "read_own_daily_summary" ON public.attendance_daily_summary
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_daily_summary" ON public.attendance_daily_summary
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- Regularization requests
CREATE POLICY "read_own_regularization" ON public.attendance_regularization_requests
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "employees_create_regularization" ON public.attendance_regularization_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_regularization" ON public.attendance_regularization_requests
  FOR UPDATE TO authenticated
  USING (public.check_is_org_admin(auth.uid()));

-- Devices
CREATE POLICY "read_own_devices" ON public.attendance_devices
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "manage_own_devices" ON public.attendance_devices
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.check_is_org_admin(auth.uid()));

CREATE POLICY "admins_manage_devices" ON public.attendance_devices
  FOR ALL TO authenticated
  USING (public.check_is_org_admin(auth.uid()))
  WITH CHECK (public.check_is_org_admin(auth.uid()));

-- 11. ATTENDANCE STATUS ENGINE (trigger to compute daily summary)
CREATE OR REPLACE FUNCTION public.compute_attendance_daily_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee_id uuid;
  v_org_id uuid;
  v_date date;
  v_first_in timestamptz;
  v_last_out timestamptz;
  v_total_hours numeric;
  v_policy record;
  v_shift record;
  v_status public.attendance_status_enum;
  v_is_late boolean := false;
  v_late_minutes int := 0;
  v_overtime numeric := 0;
  v_shift_id uuid;
  v_project_id uuid;
BEGIN
  v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  v_date := (COALESCE(NEW.clock_in_utc, OLD.clock_in_utc) AT TIME ZONE COALESCE(NEW.timezone, OLD.timezone, 'Africa/Kampala'))::date;

  -- Get first clock in and last clock out for this employee on this date
  SELECT MIN(clock_in_utc), MAX(clock_out_utc), 
         (SELECT tl.project_id FROM public.attendance_time_logs tl 
          WHERE tl.employee_id = v_employee_id AND (tl.clock_in_utc AT TIME ZONE COALESCE(tl.timezone, 'Africa/Kampala'))::date = v_date 
          AND tl.is_valid = true ORDER BY tl.clock_in_utc ASC LIMIT 1)
  INTO v_first_in, v_last_out, v_project_id
  FROM public.attendance_time_logs
  WHERE employee_id = v_employee_id
    AND (clock_in_utc AT TIME ZONE COALESCE(timezone, 'Africa/Kampala'))::date = v_date
    AND is_valid = true;

  -- Calculate total hours
  IF v_first_in IS NOT NULL AND v_last_out IS NOT NULL THEN
    v_total_hours := EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 3600.0;
  ELSE
    v_total_hours := 0;
  END IF;

  -- Get policy
  SELECT * INTO v_policy FROM public.attendance_policies
  WHERE organization_id = v_org_id
  ORDER BY company_id NULLS LAST LIMIT 1;

  -- Get shift assignment
  SELECT s.* INTO v_shift FROM public.attendance_shifts s
  JOIN public.attendance_shift_assignments sa ON sa.shift_id = s.id
  WHERE sa.employee_id = v_employee_id AND sa.is_active = true
    AND sa.start_date <= v_date AND (sa.end_date IS NULL OR sa.end_date >= v_date)
  ORDER BY sa.created_at DESC LIMIT 1;

  IF v_shift.id IS NULL THEN
    SELECT * INTO v_shift FROM public.attendance_shifts
    WHERE organization_id = v_org_id AND is_default = true AND is_active = true
    LIMIT 1;
  END IF;

  v_shift_id := v_shift.id;

  -- Determine status
  IF v_first_in IS NULL THEN
    v_status := 'ABSENT';
  ELSE
    v_status := 'PRESENT';
    -- Check if late
    IF v_shift.id IS NOT NULL AND v_policy.id IS NOT NULL THEN
      DECLARE
        v_shift_start timestamptz;
        v_clock_in_local time;
        v_grace int;
      BEGIN
        v_clock_in_local := (v_first_in AT TIME ZONE COALESCE(v_shift.timezone, 'Africa/Kampala'))::time;
        v_grace := COALESCE(v_shift.grace_period_minutes, v_policy.grace_period_minutes, 15);
        IF v_clock_in_local > (v_shift.start_time + (v_grace || ' minutes')::interval) THEN
          v_is_late := true;
          v_late_minutes := EXTRACT(EPOCH FROM (v_clock_in_local - v_shift.start_time)) / 60;
          IF v_late_minutes > COALESCE(v_policy.late_threshold_minutes, 30) THEN
            v_status := 'LATE';
          END IF;
        END IF;
      END;
    END IF;
    -- Check half day
    IF v_total_hours > 0 AND v_total_hours < COALESCE(v_policy.half_day_hours, 4) THEN
      v_status := 'HALF_DAY';
    END IF;
    -- Check overtime
    IF v_policy.overtime_enabled AND v_total_hours > COALESCE(v_policy.overtime_threshold_hours, 8) THEN
      v_overtime := v_total_hours - v_policy.overtime_threshold_hours;
    END IF;
  END IF;

  -- Upsert daily summary
  INSERT INTO public.attendance_daily_summary (
    organization_id, employee_id, attendance_date, project_id, status,
    first_clock_in, last_clock_out, total_hours, overtime_hours,
    is_late, late_minutes, shift_id
  ) VALUES (
    v_org_id, v_employee_id, v_date, v_project_id, v_status,
    v_first_in, v_last_out, ROUND(v_total_hours, 2), ROUND(v_overtime, 2),
    v_is_late, v_late_minutes, v_shift_id
  )
  ON CONFLICT (employee_id, attendance_date)
  DO UPDATE SET
    project_id = EXCLUDED.project_id,
    status = CASE WHEN public.attendance_daily_summary.is_locked THEN public.attendance_daily_summary.status ELSE EXCLUDED.status END,
    first_clock_in = EXCLUDED.first_clock_in,
    last_clock_out = EXCLUDED.last_clock_out,
    total_hours = EXCLUDED.total_hours,
    overtime_hours = EXCLUDED.overtime_hours,
    is_late = EXCLUDED.is_late,
    late_minutes = EXCLUDED.late_minutes,
    shift_id = EXCLUDED.shift_id,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_daily_summary_insert
  AFTER INSERT ON public.attendance_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.compute_attendance_daily_summary();

CREATE TRIGGER trg_compute_daily_summary_update
  AFTER UPDATE ON public.attendance_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.compute_attendance_daily_summary();
