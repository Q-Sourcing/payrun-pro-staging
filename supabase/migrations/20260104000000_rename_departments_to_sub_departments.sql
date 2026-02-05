-- ==========================================================
-- Migration: 20260104000000_rename_departments_to_sub_departments.sql
-- Purpose: Rename Departments to Sub-Departments for terminological consistency.
-- ==========================================================

-- 1. Rename the main table
ALTER TABLE IF EXISTS public.departments RENAME TO sub_departments;

-- 2. Rename references in other tables
-- Employees table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'department_id') THEN
    ALTER TABLE public.employees RENAME COLUMN department_id TO sub_department_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'department') THEN
    ALTER TABLE public.employees RENAME COLUMN department TO sub_department;
  END IF;
END $$;

-- Users table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'department_id') THEN
    ALTER TABLE public.users RENAME COLUMN department_id TO sub_department_id;
  END IF;
END $$;

-- Pay Runs table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pay_runs' AND column_name = 'department') THEN
    ALTER TABLE public.pay_runs RENAME COLUMN department TO sub_department;
  END IF;
END $$;

-- Intern Pay Run Items table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'intern_pay_run_items' AND column_name = 'department') THEN
    ALTER TABLE public.intern_pay_run_items RENAME COLUMN department TO sub_department;
  END IF;
END $$;

-- Employee Number Settings table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employee_number_settings' AND column_name = 'use_department_prefix') THEN
    ALTER TABLE public.employee_number_settings RENAME COLUMN use_department_prefix TO use_sub_department_prefix;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employee_number_settings' AND column_name = 'department_rules') THEN
    ALTER TABLE public.employee_number_settings RENAME COLUMN department_rules TO sub_department_rules;
  END IF;
END $$;

-- 3. Update Indexes
ALTER INDEX IF EXISTS idx_employees_department RENAME TO idx_employees_sub_department;
ALTER INDEX IF EXISTS idx_users_department RENAME TO idx_users_sub_department;

-- 4. Update row level security policies on sub_departments (renamed table)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.sub_departments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.sub_departments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.sub_departments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.sub_departments;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.sub_departments; CREATE POLICY "Enable read access for authenticated users" ON public.sub_departments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.sub_departments; CREATE POLICY "Enable insert access for authenticated users" ON public.sub_departments
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.sub_departments; CREATE POLICY "Enable update access for authenticated users" ON public.sub_departments
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.sub_departments; CREATE POLICY "Enable delete access for authenticated users" ON public.sub_departments
    FOR DELETE TO authenticated USING (true);

-- 5. Update Functions to use new terminology

-- Resolve dependencies: drop the old policy that uses get_user_department_id
DROP POLICY IF EXISTS "Department managers can view department users" ON public.users;

-- Update get_user_sub_department_id (renamed from get_user_department_id)
DROP FUNCTION IF EXISTS public.get_user_department_id(uuid);
CREATE OR REPLACE FUNCTION public.get_user_sub_department_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT sub_department_id FROM public.users WHERE id = user_id);
END;
$$;

-- 6. Update row level security policies on users table
DROP POLICY IF EXISTS "Sub-Department managers can view sub-department users" ON public.users;
CREATE POLICY "Sub-Department managers can view sub-department users" ON public.users
    FOR SELECT TO authenticated
    USING (
        (public.check_is_org_admin(auth.uid()) AND sub_department_id = public.get_user_sub_department_id(auth.uid()))
    );

-- 7. Update Triggers
ALTER TRIGGER set_updated_at ON public.sub_departments RENAME TO set_sub_departments_updated_at;

-- Update generate_employee_number
DROP FUNCTION IF EXISTS public.generate_employee_number(text, text, text, uuid, text);
CREATE OR REPLACE FUNCTION public.generate_employee_number(
  in_sub_department text,
  in_country text,
  in_employee_type text,
  in_pay_group_id uuid,
  in_prefix_override text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  s record;
  prefix_parts text[] := ARRAY[]::text[];
  prefix text;
  digits integer;
  format text;
  seq integer;
  candidate text;
  dept_key text := coalesce(in_sub_department, '');
  country_key text := coalesce(in_country, '');
  settings_id uuid;
BEGIN
  -- Load settings (singleton) with row-level lock to ensure atomicity
  SELECT id, number_format, default_prefix, sequence_digits, use_sub_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, sub_department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF s IS NULL THEN
    -- create default settings row if missing
    INSERT INTO public.employee_number_settings (default_prefix) VALUES ('EMP') RETURNING id INTO settings_id;
    SELECT id, number_format, default_prefix, sequence_digits, use_sub_department_prefix, include_country_code,
           use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, sub_department_rules, country_rules
    INTO s
    FROM public.employee_number_settings
    WHERE id = settings_id
    FOR UPDATE;
  END IF;

  digits := s.sequence_digits;
  format := s.number_format;

  -- Build prefix based on settings unless an override is provided
  IF in_prefix_override IS NOT NULL AND length(trim(in_prefix_override)) > 0 THEN
    prefix := regexp_replace(upper(trim(in_prefix_override)), '[^A-Z0-9\\-]+', '-', 'g');
  ELSE
    prefix_parts := ARRAY[]::text[];
    IF s.include_country_code AND country_key <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(country_key), '[^A-Z0-9]+', '-', 'g');
    END IF;
    IF s.use_employment_type AND coalesce(in_employee_type, '') <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), '[^A-Z0-9]+', '-', 'g');
    END IF;
    IF s.use_sub_department_prefix AND dept_key <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(dept_key), '[^A-Z0-9]+', '-', 'g');
    ELSE
      prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), '[^A-Z0-9]+', '-', 'g');
    END IF;
    prefix := array_to_string(prefix_parts, '-');
  END IF;

  -- Determine sequence: support per-sub-department start via sub_department_rules
  IF s.sub_department_rules ? dept_key THEN
    seq := (s.sub_department_rules -> dept_key ->> 'next_sequence')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-sub-department sequence atomically
    UPDATE public.employee_number_settings
    SET sub_department_rules = jsonb_set(s.sub_department_rules,
                                      ARRAY[dept_key, 'next_sequence'],
                                      to_jsonb(seq + 1), true),
        updated_at = now()
    WHERE id = s.id;
  ELSE
    seq := s.next_sequence;
    -- Atomically increment the sequence
    UPDATE public.employee_number_settings
    SET next_sequence = next_sequence + 1,
        updated_at = now()
    WHERE id = s.id;
  END IF;

  IF format = 'SEQUENCE' THEN
    candidate := lpad(seq::text, digits, '0');
  ELSE
    candidate := prefix || '-' || lpad(seq::text, digits, '0');
  END IF;

  -- Ensure uniqueness; loop if collision
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    IF format = 'SEQUENCE' THEN
      candidate := lpad(seq::text, digits, '0');
    ELSE
      candidate := prefix || '-' || lpad(seq::text, digits, '0');
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Update trigger function to use renamed columns
CREATE OR REPLACE FUNCTION public.set_employee_number_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_number IS NULL OR length(trim(NEW.employee_number)) = 0 THEN
    NEW.employee_number := public.generate_employee_number(
      NEW.sub_department,
      NEW.country,
      NEW.employee_type,
      NEW.pay_group_id,
      NEW.number_prefix_override
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Update Comments
COMMENT ON TABLE public.sub_departments IS 'Sub-Departments within a company unit';
COMMENT ON COLUMN public.employees.sub_department_id IS 'Reference to the sub-department the employee belongs to';
COMMENT ON COLUMN public.employees.sub_department IS 'Legacy/Text field for sub-department (if applicable)';
COMMENT ON COLUMN public.users.sub_department_id IS 'Reference to the sub-department the user belongs to';
COMMENT ON COLUMN public.employee_number_settings.use_sub_department_prefix IS 'Whether to use sub-department name as employee number prefix';
COMMENT ON COLUMN public.employee_number_settings.sub_department_rules IS 'Per-sub-department employee numbering rules';
COMMENT ON COLUMN public.intern_pay_run_items.sub_department IS 'Department/Sub-department for intern payroll item';

