-- Create company_settings table for branding and configuration
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'SimplePay Solutions',
  address text,
  phone text,
  email text,
  website text,
  tax_id text,
  logo_url text,
  primary_color text DEFAULT '#3366CC',
  secondary_color text DEFAULT '#666666',
  accent_color text DEFAULT '#FF6B35',
  include_logo boolean DEFAULT true,
  show_company_details boolean DEFAULT true,
  add_confidentiality_footer boolean DEFAULT true,
  include_generated_date boolean DEFAULT true,
  show_page_numbers boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for company settings
DROP POLICY IF EXISTS "Allow all access to company settings" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Allow all access to company settings" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Allow all access to company settings" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Allow all access to company settings" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Allow all access to company settings"
ON public.company_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (company_name)
VALUES ('SimplePay Solutions')
ON CONFLICT DO NOTHING;