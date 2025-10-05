-- Employee numbering: settings, generator, history, and column on employees

-- Settings table for employee numbering configuration
CREATE TABLE IF NOT EXISTS public.employee_number_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- global/company-level settings
  number_format text NOT NULL DEFAULT 'PREFIX-SEQUENCE', -- PREFIX-SEQUENCE | SEQUENCE | DEPARTMENT-PREFIX | CUSTOM
  default_prefix text NOT NULL DEFAULT 'EMP',
  sequence_digits integer NOT NULL DEFAULT 3 CHECK (sequence_digits BETWEEN 1 AND 10),
  use_department_prefix boolean NOT NULL DEFAULT false,
  include_country_code boolean NOT NULL DEFAULT false,
  use_employment_type boolean NOT NULL DEFAULT false,
  custom_prefix_per_pay_group boolean NOT NULL DEFAULT false,
  custom_format text,
  next_sequence integer NOT NULL DEFAULT 1 CHECK (next_sequence > 0),
  -- per-department starting sequences
  department_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- per-country formats
  country_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only a single row by convention; can be extended later for multi-tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_number_settings_singleton ON public.employee_number_settings ((true));

-- History table for audit trail of number changes
CREATE TABLE IF NOT EXISTS public.employee_number_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  old_employee_number text,
  new_employee_number text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  reason text
);

-- Add employee_number column to employees and enforce uniqueness and not null
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_number text;

-- Function to normalize and generate next employee number
CREATE OR REPLACE FUNCTION public.generate_employee_number(
  in_department text,
  in_country text,
  in_employee_type text,
  in_pay_group_id uuid
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
  dept_key text := coalesce(in_department, '');
  country_key text := coalesce(in_country, '');
  settings_id uuid;
BEGIN
  -- Load settings (singleton)
  SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1;

  IF s IS NULL THEN
    -- create default settings row if missing
    INSERT INTO public.employee_number_settings (default_prefix) VALUES ('EMP') RETURNING id INTO settings_id;
    SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
           use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
    INTO s
    FROM public.employee_number_settings
    WHERE id = settings_id;
  END IF;

  digits := s.sequence_digits;
  format := s.number_format;

  -- Build prefix based on settings
  prefix_parts := ARRAY[]::text[];
  IF s.include_country_code AND country_key <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(country_key), '[^A-Z0-9]+', '-', 'g');
  END IF;

  IF s.use_employment_type AND coalesce(in_employee_type, '') <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), '[^A-Z0-9]+', '-', 'g');
  END IF;

  IF s.use_department_prefix AND dept_key <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(dept_key), '[^A-Z0-9]+', '-', 'g');
  ELSE
    prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), '[^A-Z0-9]+', '-', 'g');
  END IF;

  prefix := array_to_string(prefix_parts, '-');

  -- Determine sequence: support per-department start via department_rules
  IF s.department_rules ? dept_key THEN
    seq := (s.department_rules -> dept_key ->> 'next_sequence')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-department sequence
    UPDATE public.employee_number_settings
    SET department_rules = jsonb_set(s.department_rules,
                                     ARRAY[dept_key, 'next_sequence'],
                                     to_jsonb(seq + 1), true),
        updated_at = now()
    WHERE id = s.id;
  ELSE
    seq := s.next_sequence;
    UPDATE public.employee_number_settings
    SET next_sequence = s.next_sequence + 1,
        updated_at = now()
    WHERE id = s.id;
  END IF;

  IF format = 'SEQUENCE' THEN
    candidate := lpad(seq::text, digits, '0');
  ELSE
    candidate := prefix || '-' || lpad(seq::text, digits, '0');
  END IF;

  -- Ensure uniqueness; loop if collision (rare but safe)
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

-- Trigger to assign employee_number on insert if null
CREATE OR REPLACE FUNCTION public.set_employee_number_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_number IS NULL OR length(trim(NEW.employee_number)) = 0 THEN
    NEW.employee_number := public.generate_employee_number(NEW.department, NEW.country, NEW.employee_type, NEW.pay_group_id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  -- Add trigger only once
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_employee_number_before_insert'
  ) THEN
    CREATE TRIGGER trg_set_employee_number_before_insert
    BEFORE INSERT ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.set_employee_number_before_insert();
  END IF;
END $$;

-- Enforce constraints after backfilling existing rows
UPDATE public.employees e
SET employee_number = public.generate_employee_number(e.department, e.country, e.employee_type, e.pay_group_id)
WHERE e.employee_number IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN employee_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_employee_number ON public.employees(employee_number);

-- Policy placeholders (allow all for now; refine as needed)
ALTER TABLE public.employee_number_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_number_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_number_settings_all ON public.employee_number_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY employee_number_history_all ON public.employee_number_history FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.employee_number_settings IS 'Company-wide employee numbering configuration';
COMMENT ON TABLE public.employee_number_history IS 'Audit trail for employee number changes';
COMMENT ON COLUMN public.employees.employee_number IS 'System-wide unique employee identifier (e.g., EMP-001)';

-- Audit trigger: record history when employee_number changes
CREATE OR REPLACE FUNCTION public.log_employee_number_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_number IS DISTINCT FROM OLD.employee_number THEN
    INSERT INTO public.employee_number_history (employee_id, old_employee_number, new_employee_number, changed_by, reason)
    VALUES (NEW.id, OLD.employee_number, NEW.employee_number, NULL, 'Manual or system change');
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_employee_number_change'
  ) THEN
    CREATE TRIGGER trg_log_employee_number_change
    AFTER UPDATE OF employee_number ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.log_employee_number_change();
  END IF;
END $$;


