-- Fix employee ID generation to ensure sequential numbers
-- The issue is that the function increments next_sequence but we need to ensure atomicity
-- Also need to ensure the trigger properly calls the function

-- First, ensure the trigger exists and is working correctly
-- The trigger should call generate_employee_number() which handles atomic increment

-- Update the function to ensure it properly increments the sequence atomically
-- The existing function already does this, but let's add a safeguard

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
  -- Load settings (singleton) with row-level lock to ensure atomicity
  SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE; -- Lock the row to prevent concurrent access

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

  -- Ensure uniqueness; loop if collision (rare but safe)
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    -- Update sequence again if collision
    IF s.department_rules ? dept_key THEN
      UPDATE public.employee_number_settings
      SET department_rules = jsonb_set(s.department_rules,
                                       ARRAY[dept_key, 'next_sequence'],
                                       to_jsonb(seq + 1), true),
          updated_at = now()
      WHERE id = s.id;
    ELSE
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
  END LOOP;

  RETURN candidate;
END;
$$;

-- Ensure trigger exists and is properly configured
DO $$ 
BEGIN
  -- Drop and recreate trigger to ensure it's using the updated function
  DROP TRIGGER IF EXISTS trg_set_employee_number_before_insert ON public.employees;
  
  CREATE TRIGGER trg_set_employee_number_before_insert
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_employee_number_before_insert();
END $$;

COMMENT ON FUNCTION public.generate_employee_number IS 'Generates sequential employee numbers atomically to prevent duplicates';

