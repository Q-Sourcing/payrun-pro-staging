-- Add employee_number column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employee_number text UNIQUE;

-- Create employee_number_settings table for auto-numbering configuration
CREATE TABLE IF NOT EXISTS public.employee_number_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_format text NOT NULL DEFAULT 'PREFIX-SEQUENCE',
  default_prefix text NOT NULL DEFAULT 'EMP',
  sequence_digits integer NOT NULL DEFAULT 3,
  next_sequence integer NOT NULL DEFAULT 1,
  use_department_prefix boolean NOT NULL DEFAULT false,
  include_country_code boolean NOT NULL DEFAULT false,
  use_employment_type boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on employee_number_settings
ALTER TABLE public.employee_number_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_number_settings
DROP POLICY IF EXISTS "Allow all access to employee_number_settings" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Allow all access to employee_number_settings" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Allow all access to employee_number_settings" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Allow all access to employee_number_settings" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Allow all access to employee_number_settings"
  ON public.employee_number_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at on employee_number_settings
CREATE TRIGGER update_employee_number_settings_updated_at
  BEFORE UPDATE ON public.employee_number_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.employee_number_settings (
  number_format, 
  default_prefix, 
  sequence_digits, 
  next_sequence
) VALUES (
  'PREFIX-SEQUENCE',
  'EMP',
  3,
  1
) ON CONFLICT DO NOTHING;