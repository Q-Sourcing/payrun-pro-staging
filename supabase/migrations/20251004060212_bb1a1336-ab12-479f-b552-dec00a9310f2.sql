-- Add employee_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN employee_type text NOT NULL DEFAULT 'local';

-- Add check constraint for valid employee types
ALTER TABLE public.employees 
ADD CONSTRAINT employee_type_check 
CHECK (employee_type IN ('local', 'expatriate'));

-- Add comment for documentation
COMMENT ON COLUMN public.employees.employee_type IS 'Employee classification: local (follows country-specific rules) or expatriate (company-defined policies)';

-- Create expatriate policies table for country-specific settings
CREATE TABLE public.expatriate_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country text NOT NULL,
  flat_tax_rate numeric,
  apply_flat_tax boolean NOT NULL DEFAULT false,
  social_security_treatment text NOT NULL DEFAULT 'full',
  social_security_reduced_rate numeric,
  exempt_lst boolean NOT NULL DEFAULT false,
  exempt_nhif boolean NOT NULL DEFAULT false,
  exempt_housing_levy boolean NOT NULL DEFAULT false,
  housing_allowance_percent numeric DEFAULT 0,
  education_allowance_percent numeric DEFAULT 0,
  travel_allowance_percent numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(country)
);

-- Enable RLS on expatriate policies
ALTER TABLE public.expatriate_policies ENABLE ROW LEVEL SECURITY;

-- Create policy for expatriate policies
DROP POLICY IF EXISTS "Allow all access to expatriate policies" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Allow all access to expatriate policies" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Allow all access to expatriate policies" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Allow all access to expatriate policies" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Allow all access to expatriate policies" 
ON public.expatriate_policies 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_expatriate_policies_updated_at
  BEFORE UPDATE ON public.expatriate_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expatriate policies for East African countries
INSERT INTO public.expatriate_policies (country, flat_tax_rate, apply_flat_tax, social_security_treatment, housing_allowance_percent, education_allowance_percent, travel_allowance_percent)
VALUES 
  ('Uganda', 15.00, true, 'exempt', 20.00, 10.00, 5.00),
  ('Kenya', 18.00, true, 'exempt', 20.00, 10.00, 5.00),
  ('Tanzania', 15.00, true, 'exempt', 20.00, 10.00, 5.00),
  ('Rwanda', 15.00, true, 'exempt', 20.00, 10.00, 5.00),
  ('South Sudan', 15.00, true, 'exempt', 20.00, 10.00, 5.00);