-- Update employee number generation to accept optional prefix override

-- Recreate function with extra argument (keeps previous args for backward compatibility)
CREATE OR REPLACE FUNCTION public.generate_employee_number(
  in_department text,
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
  dept_key text := coalesce(in_department, '');
  country_key text := coalesce(in_country, '');
  settings_id uuid;
BEGIN
  -- Load settings (singleton) with row-level lock to ensure atomicity
  SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF s IS NULL THEN
    -- create default settings row if missing
    INSERT INTO public.employee_number_settings (default_prefix) VALUES ('EMP') RETURNING id INTO settings_id;
    SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
           use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
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
    IF s.use_department_prefix AND dept_key <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(dept_key), '[^A-Z0-9]+', '-', 'g');
    ELSE
      prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), '[^A-Z0-9]+', '-', 'g');
    END IF;
    prefix := array_to_string(prefix_parts, '-');
  END IF;

  -- Determine sequence: support per-department start via department_rules
  IF s.department_rules ? dept_key THEN
    seq := (s.department_rules -> dept_key ->> 'next_sequence')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-department sequence atomically
    UPDATE public.employee_number_settings
    SET department_rules = jsonb_set(s.department_rules,
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

-- Update trigger function to pass override through
CREATE OR REPLACE FUNCTION public.set_employee_number_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_number IS NULL OR length(trim(NEW.employee_number)) = 0 THEN
    NEW.employee_number := public.generate_employee_number(
      NEW.department,
      NEW.country,
      NEW.employee_type,
      NEW.pay_group_id,
      NEW.number_prefix_override
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_employee_number_before_insert') THEN
    CREATE TRIGGER trg_set_employee_number_before_insert
    BEFORE INSERT ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.set_employee_number_before_insert();
  END IF;
END $$;

