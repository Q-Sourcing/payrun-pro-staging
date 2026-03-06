-- Ensure authenticated users can create timesheets even when employee mapping is missing.
-- This function resolves or provisions a minimal employee record for auth.uid().

CREATE OR REPLACE FUNCTION public.ensure_timesheet_employee_for_current_user()
RETURNS TABLE(employee_id uuid, organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_emp_id uuid;
  v_employee_number text;
  v_email_candidate text;
  i integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT up.organization_id, up.email, up.first_name, up.last_name
  INTO v_org_id, v_email, v_first_name, v_last_name
  FROM public.user_profiles up
  WHERE up.id = v_uid
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for current user profile';
  END IF;

  -- 1) Direct user_id match in org
  SELECT e.id
  INTO v_emp_id
  FROM public.employees e
  WHERE e.user_id = v_uid
    AND e.organization_id = v_org_id
  LIMIT 1;

  -- 2) Fallback by email in org (then bind user_id)
  IF v_emp_id IS NULL AND v_email IS NOT NULL THEN
    SELECT e.id
    INTO v_emp_id
    FROM public.employees e
    WHERE e.organization_id = v_org_id
      AND lower(e.email) = lower(v_email)
    LIMIT 1;

    IF v_emp_id IS NOT NULL THEN
      UPDATE public.employees
      SET user_id = v_uid, updated_at = now()
      WHERE id = v_emp_id;
    END IF;
  END IF;

  -- 3) Create minimal employee if still missing
  IF v_emp_id IS NULL THEN
    v_email_candidate := COALESCE(v_email, v_uid::text || '@timesheet.local');

    LOOP
      i := i + 1;
      EXIT WHEN i > 5;

      v_employee_number := 'TS-' || upper(substring(replace(v_uid::text, '-', '') from 1 for 8)) || '-' || lpad(i::text, 2, '0');

      BEGIN
        INSERT INTO public.employees (
          organization_id,
          user_id,
          first_name,
          last_name,
          email,
          employee_number,
          country,
          pay_rate,
          pay_type,
          employee_type,
          status
        ) VALUES (
          v_org_id,
          v_uid,
          COALESCE(NULLIF(v_first_name, ''), split_part(v_email_candidate, '@', 1), 'Timesheet'),
          COALESCE(NULLIF(v_last_name, ''), 'User'),
          v_email_candidate,
          v_employee_number,
          'UG',
          1,
          'hourly',
          'staff',
          'active'
        )
        RETURNING id INTO v_emp_id;

        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          -- If email is globally unique and already used elsewhere, use a deterministic local fallback.
          v_email_candidate := v_uid::text || '@timesheet.local';
      END;
    END LOOP;
  END IF;

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'Unable to provision employee mapping for current user';
  END IF;

  RETURN QUERY SELECT v_emp_id, v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_timesheet_employee_for_current_user() TO authenticated;
