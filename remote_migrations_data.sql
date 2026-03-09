SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict urRsvuKfYVRaWO3xsQXd0UBXHIiCaWR2g1rHFdlDNAlyf6TCRJQsaKWfnP3xgZR

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

INSERT INTO "supabase_migrations"."schema_migrations" ("version", "statements", "name", "created_by", "idempotency_key", "rollback") VALUES
	('20250929041050', '{"-- Create enum types for better data integrity
CREATE TYPE public.pay_type AS ENUM (''hourly'', ''salary'', ''piece_rate'')","CREATE TYPE public.pay_frequency AS ENUM (''weekly'', ''bi_weekly'', ''monthly'', ''custom'')","CREATE TYPE public.pay_run_status AS ENUM (''draft'', ''pending_approval'', ''approved'', ''processed'')","CREATE TYPE public.benefit_type AS ENUM (''health_insurance'', ''retirement'', ''dental'', ''vision'', ''other'')","-- Create benefits table
CREATE TABLE public.benefits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    cost_type TEXT CHECK (cost_type IN (''fixed'', ''percentage'')) NOT NULL DEFAULT ''fixed'',
    benefit_type benefit_type NOT NULL DEFAULT ''other'',
    applicable_countries TEXT[] DEFAULT ''{}'',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)","-- Create pay groups table
CREATE TABLE public.pay_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    pay_frequency pay_frequency NOT NULL DEFAULT ''monthly'',
    default_tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)","-- Create employees table
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    pay_type pay_type NOT NULL DEFAULT ''hourly'',
    pay_rate DECIMAL(10,2) NOT NULL,
    country TEXT NOT NULL,
    pay_group_id UUID REFERENCES public.pay_groups(id),
    status TEXT CHECK (status IN (''active'', ''inactive'')) NOT NULL DEFAULT ''active'',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)","-- Create pay runs table
CREATE TABLE public.pay_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_group_id UUID NOT NULL REFERENCES public.pay_groups(id),
    status pay_run_status NOT NULL DEFAULT ''draft'',
    total_gross_pay DECIMAL(12,2) DEFAULT 0.00,
    total_deductions DECIMAL(12,2) DEFAULT 0.00,
    total_net_pay DECIMAL(12,2) DEFAULT 0.00,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)","-- Create pay items table (individual employee payments in a pay run)
CREATE TABLE public.pay_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pay_run_id UUID NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    hours_worked DECIMAL(8,2),
    pieces_completed INTEGER,
    gross_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_deduction DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    benefit_deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(pay_run_id, employee_id)
)","-- Enable Row Level Security
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY","ALTER TABLE public.pay_groups ENABLE ROW LEVEL SECURITY","ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY","ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.pay_items ENABLE ROW LEVEL SECURITY","-- Create RLS policies for authenticated users
CREATE POLICY \"Authenticated users can view all benefits\" ON public.benefits FOR SELECT TO authenticated USING (true)","CREATE POLICY \"Authenticated users can manage benefits\" ON public.benefits FOR ALL TO authenticated USING (true)","CREATE POLICY \"Authenticated users can view all pay groups\" ON public.pay_groups FOR SELECT TO authenticated USING (true)","CREATE POLICY \"Authenticated users can manage pay groups\" ON public.pay_groups FOR ALL TO authenticated USING (true)","CREATE POLICY \"Authenticated users can view all employees\" ON public.employees FOR SELECT TO authenticated USING (true)","CREATE POLICY \"Authenticated users can manage employees\" ON public.employees FOR ALL TO authenticated USING (true)","CREATE POLICY \"Authenticated users can view all pay runs\" ON public.pay_runs FOR SELECT TO authenticated USING (true)","CREATE POLICY \"Authenticated users can manage pay runs\" ON public.pay_runs FOR ALL TO authenticated USING (true)","CREATE POLICY \"Authenticated users can view all pay items\" ON public.pay_items FOR SELECT TO authenticated USING (true)","CREATE POLICY \"Authenticated users can manage pay items\" ON public.pay_items FOR ALL TO authenticated USING (true)","-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public","-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON public.benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()","CREATE TRIGGER update_pay_groups_updated_at BEFORE UPDATE ON public.pay_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()","CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()","CREATE TRIGGER update_pay_runs_updated_at BEFORE UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()","CREATE TRIGGER update_pay_items_updated_at BEFORE UPDATE ON public.pay_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()"}', 'f6823747-1cf2-45b9-a284-5469a4b8db3c', NULL, NULL, NULL),
	('20250929100000', '{"-- Create payslip templates table
CREATE TABLE public.payslip_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)","-- Create payslip generations log table
CREATE TABLE public.payslip_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.payslip_templates(id) ON DELETE CASCADE,
    pay_run_id UUID REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    export_format TEXT NOT NULL DEFAULT ''pdf'',
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id)
)","-- Enable Row Level Security
ALTER TABLE public.payslip_templates ENABLE ROW LEVEL SECURITY","ALTER TABLE public.payslip_generations ENABLE ROW LEVEL SECURITY","-- Create RLS policies for payslip_templates
CREATE POLICY \"Users can view their own payslip templates\" 
ON public.payslip_templates FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id)","CREATE POLICY \"Users can insert their own payslip templates\" 
ON public.payslip_templates FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id)","CREATE POLICY \"Users can update their own payslip templates\" 
ON public.payslip_templates FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)","CREATE POLICY \"Users can delete their own payslip templates\" 
ON public.payslip_templates FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id)","-- Create RLS policies for payslip_generations
CREATE POLICY \"Users can view payslip generations for their templates\" 
ON public.payslip_generations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.payslip_templates 
        WHERE id = template_id AND user_id = auth.uid()
    )
)","CREATE POLICY \"Users can insert payslip generations\" 
ON public.payslip_generations FOR INSERT 
TO authenticated 
WITH CHECK (true)","-- Create indexes for better performance
CREATE INDEX idx_payslip_templates_user_id ON public.payslip_templates(user_id)","CREATE INDEX idx_payslip_templates_is_default ON public.payslip_templates(user_id, is_default)","CREATE INDEX idx_payslip_generations_template_id ON public.payslip_generations(template_id)","CREATE INDEX idx_payslip_generations_pay_run_id ON public.payslip_generations(pay_run_id)","CREATE INDEX idx_payslip_generations_employee_id ON public.payslip_generations(employee_id)","-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payslip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql","-- Create trigger for updated_at
CREATE TRIGGER update_payslip_templates_updated_at
    BEFORE UPDATE ON public.payslip_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_payslip_templates_updated_at()","-- Insert default templates for all users
INSERT INTO public.payslip_templates (name, description, config, user_id, is_default)
SELECT 
    ''Professional Corporate'',
    ''Clean, professional design with company branding'',
    ''{
        \"layout\": {
            \"header\": {
                \"showLogo\": true,
                \"showCompanyInfo\": true,
                \"alignment\": \"center\"
            },
            \"sections\": {
                \"employeeInfo\": true,
                \"payPeriod\": true,
                \"earnings\": true,
                \"deductions\": true,
                \"contributions\": true,
                \"totals\": true,
                \"leave\": false
            },
            \"order\": [\"employeeInfo\", \"payPeriod\", \"earnings\", \"deductions\", \"contributions\", \"totals\"]
        },
        \"styling\": {
            \"primaryColor\": \"#0e7288\",
            \"secondaryColor\": \"#f6ba15\",
            \"backgroundColor\": \"#ffffff\",
            \"textColor\": \"#0f172a\",
            \"accentColor\": \"#10b981\",
            \"borderColor\": \"#e2e8f0\",
            \"fontFamily\": \"Inter, sans-serif\",
            \"headingSize\": \"1.75rem\",
            \"bodySize\": \"0.875rem\",
            \"smallSize\": \"0.75rem\",
            \"fontWeight\": {
                \"normal\": \"400\",
                \"medium\": \"500\",
                \"bold\": \"600\"
            }
        },
        \"branding\": {
            \"showCompanyLogo\": true,
            \"showWatermark\": false,
            \"watermarkText\": \"\",
            \"confidentialityFooter\": true
        }
    }''::jsonb,
    u.id,
    true
FROM auth.users u
WHERE u.id IS NOT NULL"}', 'payslip_templates', NULL, NULL, NULL),
	('20250929110000', '{"-- Create expatriate_pay_groups table with proper schema
CREATE TABLE IF NOT EXISTS expatriate_pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paygroup_id text UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  currency text DEFAULT ''USD'',
  exchange_rate_to_local numeric(12,4) NOT NULL DEFAULT 0,
  tax_country text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)","-- Enable RLS
ALTER TABLE expatriate_pay_groups ENABLE ROW LEVEL SECURITY","-- Create RLS policies
CREATE POLICY \"Enable read access for all users\" ON \"public\".\"expatriate_pay_groups\"
AS permissive FOR SELECT
TO public
USING (true)","CREATE POLICY \"Enable insert for authenticated users\" ON \"public\".\"expatriate_pay_groups\"
AS permissive FOR INSERT
TO authenticated
WITH CHECK (true)","CREATE POLICY \"Enable update for authenticated users\" ON \"public\".\"expatriate_pay_groups\"
AS permissive FOR UPDATE
TO authenticated
USING (true)","CREATE POLICY \"Enable delete for authenticated users\" ON \"public\".\"expatriate_pay_groups\"
AS permissive FOR DELETE
TO authenticated
USING (true)","-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_country ON expatriate_pay_groups(country)","CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_currency ON expatriate_pay_groups(currency)","CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_tax_country ON expatriate_pay_groups(tax_country)","-- Create expatriate_pay_run_items table
CREATE TABLE IF NOT EXISTS expatriate_pay_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid REFERENCES pay_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  expatriate_pay_group_id uuid REFERENCES expatriate_pay_groups(id) ON DELETE CASCADE,
  daily_rate numeric(12,2) NOT NULL,
  days_worked integer NOT NULL,
  allowances_foreign numeric(12,2) DEFAULT 0,
  net_foreign numeric(12,2) NOT NULL,
  net_local numeric(12,2) NOT NULL,
  gross_local numeric(12,2) NOT NULL,
  tax_country text NOT NULL,
  exchange_rate_to_local numeric(12,4) NOT NULL,
  currency text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)","-- Enable RLS for expatriate_pay_run_items
ALTER TABLE expatriate_pay_run_items ENABLE ROW LEVEL SECURITY","-- Create RLS policies for expatriate_pay_run_items
CREATE POLICY \"Enable read access for all users\" ON \"public\".\"expatriate_pay_run_items\"
AS permissive FOR SELECT
TO public
USING (true)","CREATE POLICY \"Enable insert for authenticated users\" ON \"public\".\"expatriate_pay_run_items\"
AS permissive FOR INSERT
TO authenticated
WITH CHECK (true)","CREATE POLICY \"Enable update for authenticated users\" ON \"public\".\"expatriate_pay_run_items\"
AS permissive FOR UPDATE
TO authenticated
USING (true)","CREATE POLICY \"Enable delete for authenticated users\" ON \"public\".\"expatriate_pay_run_items\"
AS permissive FOR DELETE
TO authenticated
USING (true)","-- Create indexes for expatriate_pay_run_items
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_pay_run_id ON expatriate_pay_run_items(pay_run_id)","CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_employee_id ON expatriate_pay_run_items(employee_id)","CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_expatriate_pay_group_id ON expatriate_pay_run_items(expatriate_pay_group_id)"}', 'expatriate_pay_groups_fixed', NULL, NULL, NULL),
	('20251001050541', '{"-- Temporarily allow anonymous access for testing
-- Drop existing policies
DROP POLICY IF EXISTS \"Authenticated users can manage employees\" ON public.employees","DROP POLICY IF EXISTS \"Authenticated users can view all employees\" ON public.employees","DROP POLICY IF EXISTS \"Authenticated users can manage pay groups\" ON public.pay_groups","DROP POLICY IF EXISTS \"Authenticated users can view all pay groups\" ON public.pay_groups","DROP POLICY IF EXISTS \"Authenticated users can manage pay runs\" ON public.pay_runs","DROP POLICY IF EXISTS \"Authenticated users can view all pay runs\" ON public.pay_runs","DROP POLICY IF EXISTS \"Authenticated users can manage pay items\" ON public.pay_items","DROP POLICY IF EXISTS \"Authenticated users can view all pay items\" ON public.pay_items","DROP POLICY IF EXISTS \"Authenticated users can manage benefits\" ON public.benefits","DROP POLICY IF EXISTS \"Authenticated users can view all benefits\" ON public.benefits","-- Create new policies that allow anonymous access for testing
-- Employees table
CREATE POLICY \"Allow all access to employees\" ON public.employees FOR ALL USING (true) WITH CHECK (true)","-- Pay groups table
CREATE POLICY \"Allow all access to pay groups\" ON public.pay_groups FOR ALL USING (true) WITH CHECK (true)","-- Pay runs table
CREATE POLICY \"Allow all access to pay runs\" ON public.pay_runs FOR ALL USING (true) WITH CHECK (true)","-- Pay items table
CREATE POLICY \"Allow all access to pay items\" ON public.pay_items FOR ALL USING (true) WITH CHECK (true)","-- Benefits table
CREATE POLICY \"Allow all access to benefits\" ON public.benefits FOR ALL USING (true) WITH CHECK (true)"}', '4525ff5c-2af8-4111-a185-33aae0381795', NULL, NULL, NULL),
	('20251001051156', '{"-- Update employees table structure
-- Add new name columns
ALTER TABLE public.employees 
ADD COLUMN first_name TEXT,
ADD COLUMN middle_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN currency TEXT","-- Migrate existing name data to first_name
UPDATE public.employees 
SET first_name = name 
WHERE name IS NOT NULL","-- Make first_name not null after migration
ALTER TABLE public.employees 
ALTER COLUMN first_name SET NOT NULL","-- Drop the old name column
ALTER TABLE public.employees 
DROP COLUMN name","-- Add default currency based on country (optional, can be updated later)
UPDATE public.employees 
SET currency = CASE 
  WHEN country = ''Uganda'' THEN ''UGX''
  WHEN country = ''Kenya'' THEN ''KES''
  WHEN country = ''Tanzania'' THEN ''TZS''
  WHEN country = ''Rwanda'' THEN ''RWF''
  WHEN country = ''Burundi'' THEN ''BIF''
  WHEN country = ''United States'' THEN ''USD''
  WHEN country = ''United Kingdom'' THEN ''GBP''
  WHEN country = ''South Africa'' THEN ''ZAR''
  WHEN country = ''Nigeria'' THEN ''NGN''
  ELSE ''USD''
END
WHERE currency IS NULL"}', 'fb7695bc-7e51-4c76-ade4-8c664f58a26c', NULL, NULL, NULL),
	('20251002054436', '{"-- Create table for custom deductions per pay item
create table if not exists public.pay_item_custom_deductions (
  id uuid primary key default gen_random_uuid(),
  pay_item_id uuid not null,
  name text not null,
  amount numeric not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)","-- Foreign key to pay_items with cascade delete
alter table public.pay_item_custom_deductions
  add constraint pay_item_custom_deductions_pay_item_id_fkey
  foreign key (pay_item_id) references public.pay_items(id) on delete cascade","-- Enable RLS to match existing tables behavior
alter table public.pay_item_custom_deductions enable row level security","-- Permissive policy (consistent with current project policies)
create policy \"Allow all access to pay_item_custom_deductions\"
  on public.pay_item_custom_deductions
  for all
  using (true)
  with check (true)","-- Index for faster lookups by pay_item
create index if not exists idx_custom_deductions_pay_item_id
  on public.pay_item_custom_deductions(pay_item_id)"}', '8f41d918-c47d-4313-9575-11f8ce43996f', NULL, NULL, NULL),
	('20251003091136', '{"-- Add status column to pay_items for tracking payment status
create type public.pay_item_status as enum (''draft'', ''pending'', ''approved'', ''paid'')","alter table public.pay_items
  add column status pay_item_status not null default ''draft''","-- Create index for faster status filtering
create index if not exists idx_pay_items_status on public.pay_items(status)","-- Add employer_contributions column to track employer-side costs (like NSSF employer portion)
alter table public.pay_items
  add column employer_contributions numeric not null default 0.00","-- Update pay_item_custom_deductions to support both deductions and benefits
alter table public.pay_item_custom_deductions
  add column type text not null default ''deduction'' check (type in (''deduction'', ''benefit'', ''allowance''))","-- Add indices for better performance
create index if not exists idx_pay_items_pay_run_id on public.pay_items(pay_run_id)","create index if not exists idx_pay_items_employee_id on public.pay_items(employee_id)"}', '10b8a5ea-faa8-4f0a-a0dc-65be9f7ec382', NULL, NULL, NULL),
	('20251004060212', '{"-- Add employee_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN employee_type text NOT NULL DEFAULT ''local''","-- Add check constraint for valid employee types
ALTER TABLE public.employees 
ADD CONSTRAINT employee_type_check 
CHECK (employee_type IN (''local'', ''expatriate''))","-- Add comment for documentation
COMMENT ON COLUMN public.employees.employee_type IS ''Employee classification: local (follows country-specific rules) or expatriate (company-defined policies)''","-- Create expatriate policies table for country-specific settings
CREATE TABLE public.expatriate_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country text NOT NULL,
  flat_tax_rate numeric,
  apply_flat_tax boolean NOT NULL DEFAULT false,
  social_security_treatment text NOT NULL DEFAULT ''full'',
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
)","-- Enable RLS on expatriate policies
ALTER TABLE public.expatriate_policies ENABLE ROW LEVEL SECURITY","-- Create policy for expatriate policies
CREATE POLICY \"Allow all access to expatriate policies\" 
ON public.expatriate_policies 
FOR ALL 
USING (true) 
WITH CHECK (true)","-- Add trigger for updated_at
CREATE TRIGGER update_expatriate_policies_updated_at
  BEFORE UPDATE ON public.expatriate_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()","-- Insert default expatriate policies for East African countries
INSERT INTO public.expatriate_policies (country, flat_tax_rate, apply_flat_tax, social_security_treatment, housing_allowance_percent, education_allowance_percent, travel_allowance_percent)
VALUES 
  (''Uganda'', 15.00, true, ''exempt'', 20.00, 10.00, 5.00),
  (''Kenya'', 18.00, true, ''exempt'', 20.00, 10.00, 5.00),
  (''Tanzania'', 15.00, true, ''exempt'', 20.00, 10.00, 5.00),
  (''Rwanda'', 15.00, true, ''exempt'', 20.00, 10.00, 5.00),
  (''South Sudan'', 15.00, true, ''exempt'', 20.00, 10.00, 5.00)"}', 'bb1a1336-ab12-479f-b552-dec00a9310f2', NULL, NULL, NULL),
	('20251004085422', '{"-- Add new fields to employees table for comprehensive employee data

-- Personal Details
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS tin TEXT,
ADD COLUMN IF NOT EXISTS nssf_number TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT","-- Bank Details
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT","-- Department/Project
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS department TEXT","-- Add indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees(national_id)","CREATE INDEX IF NOT EXISTS idx_employees_tin ON employees(tin)","CREATE INDEX IF NOT EXISTS idx_employees_nssf_number ON employees(nssf_number)","CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)","-- Add comments for documentation
COMMENT ON COLUMN employees.gender IS ''Employee gender: Male, Female, or Other''","COMMENT ON COLUMN employees.date_of_birth IS ''Employee date of birth''","COMMENT ON COLUMN employees.national_id IS ''National ID or identification number''","COMMENT ON COLUMN employees.tin IS ''Tax Identification Number''","COMMENT ON COLUMN employees.nssf_number IS ''Social Security/NSSF number''","COMMENT ON COLUMN employees.passport_number IS ''Passport number for international employees''","COMMENT ON COLUMN employees.bank_name IS ''Employee bank name for salary payments''","COMMENT ON COLUMN employees.bank_branch IS ''Bank branch for salary payments''","COMMENT ON COLUMN employees.account_number IS ''Bank account number for salary payments''","COMMENT ON COLUMN employees.account_type IS ''Bank account type (Savings, Current, Salary Account)''","COMMENT ON COLUMN employees.department IS ''Employee department or project assignment''"}', 'feaca120-f761-4920-85fe-b3a3e0e7e406', NULL, NULL, NULL),
	('20251004093716', '{"-- Create company_settings table for branding and configuration
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT ''SimplePay Solutions'',
  address text,
  phone text,
  email text,
  website text,
  tax_id text,
  logo_url text,
  primary_color text DEFAULT ''#3366CC'',
  secondary_color text DEFAULT ''#666666'',
  accent_color text DEFAULT ''#FF6B35'',
  include_logo boolean DEFAULT true,
  show_company_details boolean DEFAULT true,
  add_confidentiality_footer boolean DEFAULT true,
  include_generated_date boolean DEFAULT true,
  show_page_numbers boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
)","-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY","-- Create policy for company settings
CREATE POLICY \"Allow all access to company settings\"
ON public.company_settings
FOR ALL
USING (true)
WITH CHECK (true)","-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()","-- Insert default company settings
INSERT INTO public.company_settings (company_name)
VALUES (''SimplePay Solutions'')
ON CONFLICT DO NOTHING"}', '597b5389-a48b-4461-8c26-74e288b0716a', NULL, NULL, NULL),
	('20251004101512', '{"-- Add project field to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS project TEXT"}', 'dc5deed5-c15e-4603-828a-e5df8b0d5111', NULL, NULL, NULL),
	('20251005110000', '{"-- Employee numbering: settings, generator, history, and column on employees

-- Settings table for employee numbering configuration
CREATE TABLE IF NOT EXISTS public.employee_number_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- global/company-level settings
  number_format text NOT NULL DEFAULT ''PREFIX-SEQUENCE'', -- PREFIX-SEQUENCE | SEQUENCE | DEPARTMENT-PREFIX | CUSTOM
  default_prefix text NOT NULL DEFAULT ''EMP'',
  sequence_digits integer NOT NULL DEFAULT 3 CHECK (sequence_digits BETWEEN 1 AND 10),
  use_department_prefix boolean NOT NULL DEFAULT false,
  include_country_code boolean NOT NULL DEFAULT false,
  use_employment_type boolean NOT NULL DEFAULT false,
  custom_prefix_per_pay_group boolean NOT NULL DEFAULT false,
  custom_format text,
  next_sequence integer NOT NULL DEFAULT 1 CHECK (next_sequence > 0),
  -- per-department starting sequences
  department_rules jsonb NOT NULL DEFAULT ''{}''::jsonb,
  -- per-country formats
  country_rules jsonb NOT NULL DEFAULT ''{}''::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)","-- Ensure only a single row by convention; can be extended later for multi-tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_number_settings_singleton ON public.employee_number_settings ((true))","-- History table for audit trail of number changes
CREATE TABLE IF NOT EXISTS public.employee_number_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  old_employee_number text,
  new_employee_number text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  reason text
)","-- Add employee_number column to employees and enforce uniqueness and not null
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_number text","-- Function to normalize and generate next employee number
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
  dept_key text := coalesce(in_department, '''');
  country_key text := coalesce(in_country, '''');
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
    INSERT INTO public.employee_number_settings (default_prefix) VALUES (''EMP'') RETURNING id INTO settings_id;
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
  IF s.include_country_code AND country_key <> '''' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(country_key), ''[^A-Z0-9]+'', ''-'', ''g'');
  END IF;

  IF s.use_employment_type AND coalesce(in_employee_type, '''') <> '''' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), ''[^A-Z0-9]+'', ''-'', ''g'');
  END IF;

  IF s.use_department_prefix AND dept_key <> '''' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(dept_key), ''[^A-Z0-9]+'', ''-'', ''g'');
  ELSE
    prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), ''[^A-Z0-9]+'', ''-'', ''g'');
  END IF;

  prefix := array_to_string(prefix_parts, ''-'');

  -- Determine sequence: support per-department start via department_rules
  IF s.department_rules ? dept_key THEN
    seq := (s.department_rules -> dept_key ->> ''next_sequence'')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-department sequence
    UPDATE public.employee_number_settings
    SET department_rules = jsonb_set(s.department_rules,
                                     ARRAY[dept_key, ''next_sequence''],
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

  IF format = ''SEQUENCE'' THEN
    candidate := lpad(seq::text, digits, ''0'');
  ELSE
    candidate := prefix || ''-'' || lpad(seq::text, digits, ''0'');
  END IF;

  -- Ensure uniqueness; loop if collision (rare but safe)
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    IF format = ''SEQUENCE'' THEN
      candidate := lpad(seq::text, digits, ''0'');
    ELSE
      candidate := prefix || ''-'' || lpad(seq::text, digits, ''0'');
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$","-- Trigger to assign employee_number on insert if null
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
$$","DO $$ BEGIN
  -- Add trigger only once
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = ''trg_set_employee_number_before_insert''
  ) THEN
    CREATE TRIGGER trg_set_employee_number_before_insert
    BEFORE INSERT ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.set_employee_number_before_insert();
  END IF;
END $$","-- Enforce constraints after backfilling existing rows
UPDATE public.employees e
SET employee_number = public.generate_employee_number(e.department, e.country, e.employee_type, e.pay_group_id)
WHERE e.employee_number IS NULL","ALTER TABLE public.employees
  ALTER COLUMN employee_number SET NOT NULL","CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_employee_number ON public.employees(employee_number)","-- Policy placeholders (allow all for now; refine as needed)
ALTER TABLE public.employee_number_settings ENABLE ROW LEVEL SECURITY","ALTER TABLE public.employee_number_history ENABLE ROW LEVEL SECURITY","CREATE POLICY employee_number_settings_all ON public.employee_number_settings FOR ALL USING (true) WITH CHECK (true)","CREATE POLICY employee_number_history_all ON public.employee_number_history FOR ALL USING (true) WITH CHECK (true)","COMMENT ON TABLE public.employee_number_settings IS ''Company-wide employee numbering configuration''","COMMENT ON TABLE public.employee_number_history IS ''Audit trail for employee number changes''","COMMENT ON COLUMN public.employees.employee_number IS ''System-wide unique employee identifier (e.g., EMP-001)''","-- Audit trigger: record history when employee_number changes
CREATE OR REPLACE FUNCTION public.log_employee_number_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_number IS DISTINCT FROM OLD.employee_number THEN
    INSERT INTO public.employee_number_history (employee_id, old_employee_number, new_employee_number, changed_by, reason)
    VALUES (NEW.id, OLD.employee_number, NEW.employee_number, NULL, ''Manual or system change'');
  END IF;
  RETURN NEW;
END;
$$","DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = ''trg_log_employee_number_change''
  ) THEN
    CREATE TRIGGER trg_log_employee_number_change
    AFTER UPDATE OF employee_number ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.log_employee_number_change();
  END IF;
END $$"}', 'employee_numbering', NULL, NULL, NULL),
	('20251005113000', '{"-- LST payment plans and assignments

CREATE TABLE IF NOT EXISTS public.lst_payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT ''Uganda'',
  method text NOT NULL DEFAULT ''official_brackets'', -- official_brackets | fixed | custom_per_employee
  annual_amount numeric NOT NULL DEFAULT 0, -- used for fixed/custom
  months integer NOT NULL DEFAULT 3 CHECK (months >= 1 AND months <= 24),
  distribution text NOT NULL DEFAULT ''equal'', -- equal | custom_amounts | percentages
  custom_amounts jsonb, -- [{month:\"2025-10-01\", amount: 33333}, ...]
  percentages jsonb, -- [50,30,20]
  start_month date NOT NULL, -- first month applied
  apply_future boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)","CREATE TABLE IF NOT EXISTS public.lst_employee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.lst_payment_plans(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  annual_amount numeric NOT NULL, -- resolved annual LST for this employee
  months integer NOT NULL,
  start_month date NOT NULL,
  distribution text NOT NULL,
  custom_amounts jsonb,
  percentages jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, employee_id)
)","-- Helper function: compute LST annual amount by official brackets (Uganda)
CREATE OR REPLACE FUNCTION public.ug_lst_annual_amount(gross_pay numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  IF gross_pay < 100000 THEN RETURN 0; END IF;
  IF gross_pay < 200000 THEN RETURN 5000; END IF;
  IF gross_pay < 300000 THEN RETURN 10000; END IF;
  IF gross_pay < 400000 THEN RETURN 20000; END IF;
  IF gross_pay < 500000 THEN RETURN 30000; END IF;
  IF gross_pay < 600000 THEN RETURN 40000; END IF;
  IF gross_pay < 700000 THEN RETURN 60000; END IF;
  IF gross_pay < 800000 THEN RETURN 70000; END IF;
  IF gross_pay < 900000 THEN RETURN 80000; END IF;
  IF gross_pay < 1000000 THEN RETURN 90000; END IF;
  RETURN 100000;
END;
$$","COMMENT ON TABLE public.lst_payment_plans IS ''LST payment plan templates for batches''","COMMENT ON TABLE public.lst_employee_assignments IS ''LST plan assignments per employee''"}', 'lst_payment_plans', NULL, NULL, NULL),
	('20251005120000', '{"-- Add pay_run_id column to pay_runs table
ALTER TABLE public.pay_runs 
ADD COLUMN pay_run_id VARCHAR(50) UNIQUE","-- Create index for better performance
CREATE INDEX idx_pay_runs_pay_run_id ON public.pay_runs(pay_run_id)","-- Add comment to explain the column
COMMENT ON COLUMN public.pay_runs.pay_run_id IS ''Unique identifier for pay run in format [Prefix]-[YYYYMMDD]-[HHMMSS]''"}', 'add_payrun_id', NULL, NULL, NULL),
	('20251005130000', '{"-- Zoho People Integration Database Schema

-- Integration tokens table for OAuth storage
CREATE TABLE IF NOT EXISTS public.integration_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token_type VARCHAR(20) DEFAULT ''Bearer'',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(integration_name)
)","-- Sync configurations table
CREATE TABLE IF NOT EXISTS public.sync_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN (''realtime'', ''hourly'', ''daily'', ''weekly'')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN (''inbound'', ''outbound'', ''bidirectional'')),
    data_mapping JSONB DEFAULT ''[]'',
    filters JSONB DEFAULT ''{}'',
    retry_attempts INTEGER DEFAULT 3,
    timeout INTEGER DEFAULT 30000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Sync logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN (''pending'', ''processing'', ''completed'', ''failed'')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Integration health monitoring table
CREATE TABLE IF NOT EXISTS public.integration_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN (''healthy'', ''warning'', ''critical'')),
    last_sync TIMESTAMP WITH TIME ZONE,
    uptime DECIMAL(5,2) DEFAULT 0,
    api_response_time INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    total_syncs INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Alert rules table
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    threshold DECIMAL(10,2) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    notification_channels TEXT[] DEFAULT ''{}'',
    escalation_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Notification channels table
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN (''email'', ''sms'', ''webhook'', ''slack'')),
    name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL DEFAULT ''{}'',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Alert logs table
CREATE TABLE IF NOT EXISTS public.alert_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    integration_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT ''{}'',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Attendance records table for storing Zoho attendance data
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN (''present'', ''absent'', ''half-day'', ''holiday'')),
    leave_type VARCHAR(50),
    remarks TEXT,
    synced_from_zoho BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_tokens_name ON public.integration_tokens(integration_name)","CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON public.sync_logs(sync_id)","CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at)","CREATE INDEX IF NOT EXISTS idx_integration_health_name_checked ON public.integration_health(integration_name, checked_at)","CREATE INDEX IF NOT EXISTS idx_alert_logs_rule_id ON public.alert_logs(rule_id)","CREATE INDEX IF NOT EXISTS idx_alert_logs_triggered_at ON public.alert_logs(triggered_at)","CREATE INDEX IF NOT EXISTS idx_audit_logs_integration_action ON public.audit_logs(integration_name, action)","CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp)","CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, date)","-- Comments for documentation
COMMENT ON TABLE public.integration_tokens IS ''Stores OAuth tokens for external integrations''","COMMENT ON TABLE public.sync_configurations IS ''Configuration for data synchronization between systems''","COMMENT ON TABLE public.sync_logs IS ''Logs of synchronization operations''","COMMENT ON TABLE public.integration_health IS ''Health monitoring data for integrations''","COMMENT ON TABLE public.alert_rules IS ''Rules for triggering alerts based on integration health''","COMMENT ON TABLE public.notification_channels IS ''Channels for sending alerts and notifications''","COMMENT ON TABLE public.alert_logs IS ''Log of triggered alerts''","COMMENT ON TABLE public.audit_logs IS ''Audit trail for integration activities''","COMMENT ON TABLE public.attendance_records IS ''Attendance records synced from Zoho People''","-- Row Level Security (RLS) policies
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY","ALTER TABLE public.sync_configurations ENABLE ROW LEVEL SECURITY","ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY","ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY","ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY","ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY","-- Create policies for admin access (adjust based on your auth setup)
CREATE POLICY \"Admin access to integration data\" ON public.integration_tokens
    FOR ALL USING (true)","-- Adjust this based on your authentication system

CREATE POLICY \"Admin access to sync configurations\" ON public.sync_configurations
    FOR ALL USING (true)","CREATE POLICY \"Admin access to sync logs\" ON public.sync_logs
    FOR ALL USING (true)","CREATE POLICY \"Admin access to integration health\" ON public.integration_health
    FOR ALL USING (true)","CREATE POLICY \"Admin access to alert rules\" ON public.alert_rules
    FOR ALL USING (true)","CREATE POLICY \"Admin access to notification channels\" ON public.notification_channels
    FOR ALL USING (true)","CREATE POLICY \"Admin access to alert logs\" ON public.alert_logs
    FOR ALL USING (true)","CREATE POLICY \"Admin access to audit logs\" ON public.audit_logs
    FOR ALL USING (true)","CREATE POLICY \"Admin access to attendance records\" ON public.attendance_records
    FOR ALL USING (true)"}', 'zoho_integration_tables', NULL, NULL, NULL),
	('20251005134256', '{"-- Create settings table to store user preferences and system configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, key)
)","-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY","-- RLS Policies
CREATE POLICY \"Users can view their own settings\"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL)","CREATE POLICY \"Users can insert their own settings\"
  ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL)","CREATE POLICY \"Users can update their own settings\"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)","CREATE POLICY \"Users can delete their own settings\"
  ON public.settings FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL)","-- Trigger for updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()"}', '3d2fa36f-34a9-4ef8-b955-f600284dbb2d', NULL, NULL, NULL),
	('20251005134921', '{"-- Add employee_number column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employee_number text UNIQUE","-- Create employee_number_settings table for auto-numbering configuration
CREATE TABLE IF NOT EXISTS public.employee_number_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_format text NOT NULL DEFAULT ''PREFIX-SEQUENCE'',
  default_prefix text NOT NULL DEFAULT ''EMP'',
  sequence_digits integer NOT NULL DEFAULT 3,
  next_sequence integer NOT NULL DEFAULT 1,
  use_department_prefix boolean NOT NULL DEFAULT false,
  include_country_code boolean NOT NULL DEFAULT false,
  use_employment_type boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
)","-- Enable RLS on employee_number_settings
ALTER TABLE public.employee_number_settings ENABLE ROW LEVEL SECURITY","-- RLS Policies for employee_number_settings
CREATE POLICY \"Allow all access to employee_number_settings\"
  ON public.employee_number_settings FOR ALL
  USING (true)
  WITH CHECK (true)","-- Trigger for updated_at on employee_number_settings
CREATE TRIGGER update_employee_number_settings_updated_at
  BEFORE UPDATE ON public.employee_number_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()","-- Insert default settings
INSERT INTO public.employee_number_settings (
  number_format, 
  default_prefix, 
  sequence_digits, 
  next_sequence
) VALUES (
  ''PREFIX-SEQUENCE'',
  ''EMP'',
  3,
  1
) ON CONFLICT DO NOTHING"}', '46d2d5b5-c842-4cb7-873a-a6332e03be80', NULL, NULL, NULL),
	('20251005135013', '{"-- Add employee_number column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employee_number text UNIQUE","-- Create employee_number_settings table for auto-numbering configuration
CREATE TABLE IF NOT EXISTS public.employee_number_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_format text NOT NULL DEFAULT ''PREFIX-SEQUENCE'',
  default_prefix text NOT NULL DEFAULT ''EMP'',
  sequence_digits integer NOT NULL DEFAULT 3,
  next_sequence integer NOT NULL DEFAULT 1,
  use_department_prefix boolean NOT NULL DEFAULT false,
  include_country_code boolean NOT NULL DEFAULT false,
  use_employment_type boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
)","-- Enable RLS on employee_number_settings
ALTER TABLE public.employee_number_settings ENABLE ROW LEVEL SECURITY","-- Drop existing policy if it exists
DROP POLICY IF EXISTS \"Allow all access to employee_number_settings\" ON public.employee_number_settings","-- RLS Policies for employee_number_settings
CREATE POLICY \"Allow all access to employee_number_settings\"
  ON public.employee_number_settings FOR ALL
  USING (true)
  WITH CHECK (true)","-- Trigger for updated_at on employee_number_settings
DROP TRIGGER IF EXISTS update_employee_number_settings_updated_at ON public.employee_number_settings","CREATE TRIGGER update_employee_number_settings_updated_at
  BEFORE UPDATE ON public.employee_number_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()","-- Insert default settings
INSERT INTO public.employee_number_settings (
  number_format, 
  default_prefix, 
  sequence_digits, 
  next_sequence
) VALUES (
  ''PREFIX-SEQUENCE'',
  ''EMP'',
  3,
  1
) ON CONFLICT DO NOTHING"}', '8872d406-de8a-49e7-8d63-36f5e2b99059', NULL, NULL, NULL),
	('20251005135104', '{"-- Add employee_number column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employee_number text UNIQUE","-- Create employee_number_settings table for auto-numbering configuration
CREATE TABLE IF NOT EXISTS public.employee_number_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_format text NOT NULL DEFAULT ''PREFIX-SEQUENCE'',
  default_prefix text NOT NULL DEFAULT ''EMP'',
  sequence_digits integer NOT NULL DEFAULT 3,
  next_sequence integer NOT NULL DEFAULT 1,
  use_department_prefix boolean NOT NULL DEFAULT false,
  include_country_code boolean NOT NULL DEFAULT false,
  use_employment_type boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
)","-- Enable RLS on employee_number_settings
ALTER TABLE public.employee_number_settings ENABLE ROW LEVEL SECURITY","-- Drop existing policy if it exists
DROP POLICY IF EXISTS \"Allow all access to employee_number_settings\" ON public.employee_number_settings","-- RLS Policies for employee_number_settings
CREATE POLICY \"Allow all access to employee_number_settings\"
  ON public.employee_number_settings FOR ALL
  USING (true)
  WITH CHECK (true)","-- Trigger for updated_at on employee_number_settings
DROP TRIGGER IF EXISTS update_employee_number_settings_updated_at ON public.employee_number_settings","CREATE TRIGGER update_employee_number_settings_updated_at
  BEFORE UPDATE ON public.employee_number_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()","-- Insert default settings
INSERT INTO public.employee_number_settings (
  number_format, 
  default_prefix, 
  sequence_digits, 
  next_sequence
) VALUES (
  ''PREFIX-SEQUENCE'',
  ''EMP'',
  3,
  1
) ON CONFLICT DO NOTHING"}', 'f6f94972-4f21-4f97-8ce6-c390d3c743e9', NULL, NULL, NULL),
	('20251005140000', '{"-- User Role System Database Schema

-- Users table with role-based access control
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        ''super_admin'',
        ''organization_admin'', 
        ''ceo_executive'',
        ''payroll_manager'',
        ''employee'',
        ''hr_business_partner'',
        ''finance_controller''
    )),
    organization_id UUID REFERENCES public.pay_groups(id) ON DELETE SET NULL,
    department_id VARCHAR(100),
    manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 480, -- 8 hours in minutes
    permissions TEXT[] DEFAULT ''{}'',
    restrictions TEXT[] DEFAULT ''{}'',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Role assignments table for tracking role changes
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        ''super_admin'',
        ''organization_admin'', 
        ''ceo_executive'',
        ''payroll_manager'',
        ''employee'',
        ''hr_business_partner'',
        ''finance_controller''
    )),
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- User sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
)","-- Audit logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT ''{}'',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN (''success'', ''failure'', ''denied'')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Permission checks table for caching permission results
CREATE TABLE IF NOT EXISTS public.permission_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    has_permission BOOLEAN NOT NULL,
    context JSONB DEFAULT ''{}'',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT ''{}'',
    dashboard_config JSONB DEFAULT ''{}'',
    notification_settings JSONB DEFAULT ''{}'',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
)","-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email)","CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role)","CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id)","CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id)","CREATE INDEX IF NOT EXISTS idx_users_manager ON public.users(manager_id)","CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active)","CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON public.role_assignments(user_id)","CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON public.role_assignments(role)","CREATE INDEX IF NOT EXISTS idx_role_assignments_active ON public.role_assignments(is_active)","CREATE INDEX IF NOT EXISTS idx_role_assignments_assigned_at ON public.role_assignments(assigned_at)","CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id)","CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token)","CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active)","CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at)","CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id)","CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action)","CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource)","CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp)","-- Add result column if it doesn''t exist (for compatibility with earlier audit_logs table)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS result VARCHAR(20) CHECK (result IN (''success'', ''failure'', ''denied''))","CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON public.audit_logs(result)","CREATE INDEX IF NOT EXISTS idx_permission_cache_user ON public.permission_cache(user_id)","CREATE INDEX IF NOT EXISTS idx_permission_cache_resource ON public.permission_cache(resource)","CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON public.permission_cache(expires_at)","-- Comments for documentation
COMMENT ON TABLE public.users IS ''User accounts with role-based access control''","COMMENT ON TABLE public.role_assignments IS ''History of role assignments and changes''","COMMENT ON TABLE public.user_sessions IS ''Active user sessions for security management''","COMMENT ON TABLE public.audit_logs IS ''Audit trail for all user actions and system events''","COMMENT ON TABLE public.permission_cache IS ''Cached permission check results for performance''","COMMENT ON TABLE public.user_preferences IS ''User-specific preferences and dashboard configuration''","-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY","ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY","ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY","ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.permission_cache ENABLE ROW LEVEL SECURITY","ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY","-- RLS Policies for users table
CREATE POLICY \"Users can view their own data\" ON public.users
    FOR SELECT USING (auth.uid() = id)","CREATE POLICY \"Super admins can view all users\" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = ''super_admin''
        )
    )","CREATE POLICY \"Organization admins can view organization users\" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u1, public.users u2
            WHERE u1.id = auth.uid() 
            AND u1.role = ''organization_admin''
            AND u2.id = public.users.id
            AND u1.organization_id = u2.organization_id
        )
    )","CREATE POLICY \"Department managers can view department users\" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u1, public.users u2
            WHERE u1.id = auth.uid() 
            AND u1.role = ''payroll_manager''
            AND u2.id = public.users.id
            AND u1.department_id = u2.department_id
        )
    )","-- RLS Policies for role assignments
CREATE POLICY \"Users can view their own role assignments\" ON public.role_assignments
    FOR SELECT USING (auth.uid() = user_id)","CREATE POLICY \"Admins can view all role assignments\" ON public.role_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN (''super_admin'', ''organization_admin'')
        )
    )","-- RLS Policies for user sessions
CREATE POLICY \"Users can view their own sessions\" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id)","CREATE POLICY \"Admins can view all sessions\" ON public.user_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN (''super_admin'', ''organization_admin'')
        )
    )","-- RLS Policies for audit logs (handle data type compatibility)
CREATE POLICY \"Users can view their own audit logs\" ON public.audit_logs 
    FOR SELECT USING (auth.uid()::text = user_id)","CREATE POLICY \"Admins can view all audit logs\" ON public.audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN (''super_admin'', ''organization_admin'')
        )
    )","-- RLS Policies for permission cache
CREATE POLICY \"Users can view their own permission cache\" ON public.permission_cache
    FOR SELECT USING (auth.uid() = user_id)","CREATE POLICY \"System can manage permission cache\" ON public.permission_cache
    FOR ALL USING (true)","-- Allow system operations

-- RLS Policies for user preferences
CREATE POLICY \"Users can manage their own preferences\" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id)","-- Functions for role-based access control
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN (
        SELECT role FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","CREATE OR REPLACE FUNCTION public.has_permission(
    user_id UUID, 
    permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    user_role := public.get_user_role(user_id);
    
    -- Super admin has all permissions
    IF user_role = ''super_admin'' THEN
        RETURN true;
    END IF;
    
    -- Check role-specific permissions
    CASE user_role
        WHEN ''organization_admin'' THEN
            RETURN permission_name IN (
                ''view_organization_employees'',
                ''edit_organization_employees'',
                ''process_payroll'',
                ''approve_payroll'',
                ''view_financial_reports'',
                ''manage_organization_users''
            );
        WHEN ''ceo_executive'' THEN
            RETURN permission_name IN (
                ''view_organization_employees'',
                ''view_financial_reports'',
                ''view_executive_reports'',
                ''approve_payroll''
            );
        WHEN ''payroll_manager'' THEN
            RETURN permission_name IN (
                ''view_department_employees'',
                ''edit_department_employees'',
                ''process_payroll'',
                ''view_department_reports'',
                ''approve_expenses'',
                ''approve_leave'',
                ''approve_overtime''
            );
        WHEN ''employee'' THEN
            RETURN permission_name IN (
                ''view_own_data'',
                ''edit_own_data'',
                ''view_own_reports''
            );
        WHEN ''hr_business_partner'' THEN
            RETURN permission_name IN (
                ''view_organization_employees'',
                ''edit_organization_employees'',
                ''view_department_reports'',
                ''approve_leave''
            );
        WHEN ''finance_controller'' THEN
            RETURN permission_name IN (
                ''view_organization_employees'',
                ''view_financial_reports'',
                ''view_executive_reports'',
                ''approve_payroll'',
                ''manage_budgets''
            );
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Function to clean up expired permission cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.permission_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql","CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column()","CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column()","-- Insert default super admin user (for initial setup)
INSERT INTO public.users (
    email,
    first_name,
    last_name,
    role,
    is_active,
    two_factor_enabled,
    session_timeout,
    permissions,
    restrictions
) VALUES (
    ''admin@payroll.com'',
    ''Super'',
    ''Administrator'',
    ''super_admin'',
    true,
    true,
    480,
    ARRAY[
        ''view_all_employees'',
        ''edit_all_employees'',
        ''process_payroll'',
        ''approve_payroll'',
        ''view_financial_reports'',
        ''view_executive_reports'',
        ''manage_users'',
        ''system_configuration'',
        ''view_audit_logs'',
        ''manage_integrations'',
        ''view_system_health'',
        ''view_sensitive_data'',
        ''export_data'',
        ''bulk_operations'',
        ''delete_records''
    ],
    ARRAY[]::TEXT[]
) ON CONFLICT (email) DO NOTHING"}', 'user_role_system', NULL, NULL, NULL),
	('20251005150000', '{"-- Super Admin Setup Migration
-- This migration sets up the initial super administrator account

-- Insert the pre-configured super admin user
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    two_factor_enabled,
    session_timeout,
    permissions,
    restrictions,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    ''nalungukevin@gmail.com'',
    ''Nalungu'',
    ''Kevin'',
    ''super_admin'',
    true,
    false, -- Will be set up during initial login
    480, -- 8 hours
    ARRAY[
        ''view_all_employees'',
        ''edit_all_employees'',
        ''process_payroll'',
        ''approve_payroll'',
        ''view_financial_reports'',
        ''view_executive_reports'',
        ''manage_users'',
        ''system_configuration'',
        ''view_audit_logs'',
        ''manage_integrations'',
        ''view_system_health'',
        ''view_sensitive_data'',
        ''export_data'',
        ''bulk_operations'',
        ''delete_records''
    ],
    ARRAY[]::TEXT[],
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    permissions = EXCLUDED.permissions,
    restrictions = EXCLUDED.restrictions,
    updated_at = NOW()","-- Create a function to check if this is the first login
CREATE OR REPLACE FUNCTION public.is_first_login(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT last_login IS NULL 
        FROM public.users 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create a function to get super admin setup status
CREATE OR REPLACE FUNCTION public.get_super_admin_setup_status()
RETURNS JSON AS $$
DECLARE
    super_admin_count INTEGER;
    setup_complete BOOLEAN;
    result JSON;
BEGIN
    -- Count super admins
    SELECT COUNT(*) INTO super_admin_count
    FROM public.users 
    WHERE role = ''super_admin'' AND is_active = true;
    
    -- Check if setup is complete (super admin has logged in)
    SELECT COUNT(*) > 0 INTO setup_complete
    FROM public.users 
    WHERE role = ''super_admin'' 
    AND is_active = true 
    AND last_login IS NOT NULL;
    
    result := json_build_object(
        ''super_admin_count'', super_admin_count,
        ''setup_complete'', setup_complete,
        ''needs_initial_setup'', super_admin_count > 0 AND NOT setup_complete
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create a function to complete super admin setup
CREATE OR REPLACE FUNCTION public.complete_super_admin_setup(
    user_id UUID,
    security_questions JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update user to mark setup as complete
    UPDATE public.users 
    SET 
        two_factor_enabled = true,
        updated_at = NOW()
    WHERE id = user_id AND role = ''super_admin'';
    
    -- Log the setup completion
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details,
        ip_address,
        user_agent,
        timestamp,
        result
    ) VALUES (
        user_id,
        ''super_admin_setup_completed'',
        ''system'',
        COALESCE(security_questions, ''{}''::jsonb),
        ''127.0.0.1'',
        ''System'',
        NOW(),
        ''success''
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create a function to generate secure temporary password
CREATE OR REPLACE FUNCTION public.generate_temp_password()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := ''ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'';
    password TEXT := '''';
    i INTEGER;
BEGIN
    FOR i IN 1..16 LOOP
        password := password || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    RETURN password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create a function to send setup email (placeholder)
CREATE OR REPLACE FUNCTION public.send_super_admin_setup_email(
    user_email TEXT,
    temp_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- In a real implementation, this would send an email
    -- For now, we''ll just log it
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details,
        ip_address,
        user_agent,
        timestamp,
        result
    ) VALUES (
        (SELECT id FROM public.users WHERE email = user_email LIMIT 1),
        ''setup_email_sent'',
        ''system'',
        json_build_object(''email'', user_email, ''temp_password'', temp_password),
        ''127.0.0.1'',
        ''System'',
        NOW(),
        ''success''
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role, is_active)","CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login)","CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON public.audit_logs(action, timestamp)","-- Add comments for documentation
COMMENT ON FUNCTION public.is_first_login(UUID) IS ''Check if this is the users first login''","COMMENT ON FUNCTION public.get_super_admin_setup_status() IS ''Get the current status of super admin setup''","COMMENT ON FUNCTION public.complete_super_admin_setup(UUID, JSONB) IS ''Mark super admin setup as complete''","COMMENT ON FUNCTION public.generate_temp_password() IS ''Generate a secure temporary password''","COMMENT ON FUNCTION public.send_super_admin_setup_email(TEXT, TEXT) IS ''Send setup email to super admin''","-- Create a view for super admin dashboard
CREATE OR REPLACE VIEW public.super_admin_dashboard AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.two_factor_enabled,
    u.last_login,
    u.created_at,
    COUNT(DISTINCT s.id) as active_sessions,
    COUNT(DISTINCT al.id) as recent_activity_count
FROM public.users u
LEFT JOIN public.user_sessions s ON u.id = s.user_id AND s.is_active = true
LEFT JOIN public.audit_logs al ON u.id::text = al.user_id 
    AND al.timestamp >= NOW() - INTERVAL ''24 hours''
WHERE u.role = ''super_admin''
GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
         u.two_factor_enabled, u.last_login, u.created_at","-- Grant necessary permissions
GRANT SELECT ON public.super_admin_dashboard TO authenticated","GRANT EXECUTE ON FUNCTION public.is_first_login(UUID) TO authenticated","GRANT EXECUTE ON FUNCTION public.get_super_admin_setup_status() TO authenticated","GRANT EXECUTE ON FUNCTION public.complete_super_admin_setup(UUID, JSONB) TO authenticated","GRANT EXECUTE ON FUNCTION public.generate_temp_password() TO authenticated","GRANT EXECUTE ON FUNCTION public.send_super_admin_setup_email(TEXT, TEXT) TO authenticated"}', 'super_admin_setup', NULL, NULL, NULL),
	('20251005160000', '{"-- Create audit log table for payroll calculations
CREATE TABLE IF NOT EXISTS public.pay_calculation_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  pay_run_id UUID REFERENCES pay_runs(id),
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  calculation_type TEXT DEFAULT ''payroll_calculation'',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
)","-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pay_calculation_audit_employee_id ON pay_calculation_audit_log(employee_id)","CREATE INDEX IF NOT EXISTS idx_pay_calculation_audit_pay_run_id ON pay_calculation_audit_log(pay_run_id)","CREATE INDEX IF NOT EXISTS idx_pay_calculation_audit_calculated_at ON pay_calculation_audit_log(calculated_at)","-- Enable RLS
ALTER TABLE public.pay_calculation_audit_log ENABLE ROW LEVEL SECURITY","-- Create RLS policy for authenticated users
CREATE POLICY \"Authenticated users can view audit logs\" ON public.pay_calculation_audit_log 
FOR SELECT TO authenticated USING (true)","-- Create RLS policy for service role to insert audit logs
CREATE POLICY \"Service role can insert audit logs\" ON public.pay_calculation_audit_log 
FOR INSERT TO service_role WITH CHECK (true)","-- Add comment
COMMENT ON TABLE public.pay_calculation_audit_log IS ''Audit log for payroll calculations performed by Edge Functions''"}', 'payroll_calculation_audit', NULL, NULL, NULL),
	('20251011084337', '{"-- Create user roles enum
CREATE TYPE public.app_role AS ENUM (''super_admin'', ''admin'', ''manager'', ''employee'')","-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
)","-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY","ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY","-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$","-- RLS Policies for profiles
CREATE POLICY \"Users can view all profiles\"
ON public.profiles
FOR SELECT
TO authenticated
USING (true)","CREATE POLICY \"Users can update own profile\"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)","CREATE POLICY \"Users can insert own profile\"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id)","-- RLS Policies for user_roles
CREATE POLICY \"Super admins can view all roles\"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), ''super_admin''))","CREATE POLICY \"Users can view own roles\"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id)","CREATE POLICY \"Super admins can manage all roles\"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), ''super_admin''))
WITH CHECK (public.has_role(auth.uid(), ''super_admin''))","-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>''first_name'',
    NEW.raw_user_meta_data->>''last_name''
  );
  RETURN NEW;
END;
$$","-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user()","-- Create the super admin user role (you''ll need to sign up first, then run this manually with the actual user_id)
-- This is a placeholder comment - you''ll add the role after the user signs up"}', '70e34db0-8767-4d62-b66b-aa6327af6ea3', NULL, NULL, NULL),
	('20251014154911', '{"-- ===============================================================
-- PAYRUN PRO MERGE CONFLICT RECONCILIATION WITH FALLBACK SAFETY
-- ===============================================================
-- Author: Nalungu Kevin Colin
-- Purpose: Safely unify conflicting migrations; roll back on error
-- ===============================================================

do $$
declare
  migration_failed boolean := false;
begin
  begin
    -- ⚙️ BEGIN SCHEMA UPDATE TRANSACTION -------------------------

    -- 🧩 Ensure payroll_configurations exists
    if not exists (select 1 from pg_tables where tablename=''payroll_configurations'') then
      create table payroll_configurations (
        id uuid primary key default gen_random_uuid(),
        organization_id uuid,
        use_strict_mode boolean default true,
        updated_at timestamptz default now()
      );
    end if;

    -- 🧱 Ensure paygroup_employees exists
    if not exists (select 1 from pg_tables where tablename=''paygroup_employees'') then
      create table paygroup_employees (
        id uuid primary key default gen_random_uuid(),
        pay_group_id uuid not null references pay_groups(id) on delete cascade,
        employee_id uuid not null references employees(id) on delete cascade,
        assigned_by uuid references auth.users(id),
        assigned_at timestamptz default now(),
        active boolean default true,
        notes text
      );
    end if;

    -- 🔐 Enable RLS (if not enabled)
    alter table paygroup_employees enable row level security;

    -- 🛡️ RLS policies (idempotent)
      if not exists (select 1 from pg_policies where policyname=''view paygroup_employees'') then
        create policy \"view paygroup_employees\"
        on paygroup_employees for select
        using (
          auth.uid() in (select user_id from user_roles where role in (''Super Admin'',''Organization Admin'',''Payroll Manager''))
          or assigned_by = auth.uid()
        );
      end if;
      if not exists (select 1 from pg_policies where policyname=''insert paygroup_employees'') then
        create policy \"insert paygroup_employees\"
        on paygroup_employees for insert
        with check (auth.uid() in (select user_id from user_roles where role in (''Super Admin'',''Organization Admin'',''Payroll Manager'')));
      end if;
      if not exists (select 1 from pg_policies where policyname=''update paygroup_employees'') then
        create policy \"update paygroup_employees\"
        on paygroup_employees for update
        using (auth.uid() in (select user_id from user_roles where role in (''Super Admin'',''Organization Admin'',''Payroll Manager'')));
      end if;
      if not exists (select 1 from pg_policies where policyname=''delete paygroup_employees'') then
        create policy \"delete paygroup_employees\"
        on paygroup_employees for delete
        using (auth.uid() in (select user_id from user_roles where role in (''Super Admin'',''Organization Admin'',''Payroll Manager'')));
      end if;

    -- 🧩 Ensure employee ID fields exist + indexes
    alter table employees
      add column if not exists national_id text,
      add column if not exists tin text,
      add column if not exists social_security_number text,
      add column if not exists passport_number text;
    create index if not exists idx_employees_national_id on employees (national_id);
    create index if not exists idx_employees_tin on employees (tin);
    create index if not exists idx_employees_ssn on employees (social_security_number);

    -- ⚙️ Create or replace function for unique/smart assignment
    create or replace function enforce_unique_or_smart_paygroup_assignment()
    returns trigger as $fn$
    declare
      org_mode boolean;
      duplicate_count int;
      emp_org_id uuid;
    begin
      select e.organization_id into emp_org_id from employees e where e.id = new.employee_id;
      select use_strict_mode into org_mode from payroll_configurations where organization_id = emp_org_id limit 1;
      if org_mode is null then org_mode := true; end if;
      if (new.active = false) then return new; end if;

      select count(*) into duplicate_count
      from paygroup_employees pe
      join employees e on e.id = pe.employee_id
      where pe.active = true
        and (
          (e.national_id is not null and e.national_id = (select national_id from employees where id=new.employee_id)) or
          (e.tin is not null and e.tin = (select tin from employees where id=new.employee_id)) or
          (e.social_security_number is not null and e.social_security_number = (select social_security_number from employees where id=new.employee_id))
        )
        and pe.employee_id != new.employee_id;

      if duplicate_count > 0 then
        if org_mode = true then
          raise exception ''Strict Mode: Employee with same identification already active in another paygroup.'';
        else
          update paygroup_employees
          set active=false
          where employee_id in (
            select id from employees where
              (national_id=(select national_id from employees where id=new.employee_id) and national_id is not null) or
              (tin=(select tin from employees where id=new.employee_id) and tin is not null) or
              (social_security_number=(select social_security_number from employees where id=new.employee_id) and social_security_number is not null)
          )
          and id != new.id;
        end if;
      end if;
      return new;
    end;
    $fn$ language plpgsql security definer;

    -- 🔁 Recreate trigger cleanly
    drop trigger if exists trg_enforce_unique_or_smart on paygroup_employees;
    create trigger trg_enforce_unique_or_smart
    before insert or update on paygroup_employees
    for each row execute function enforce_unique_or_smart_paygroup_assignment();

    -- 📈 Indexes for link table
    create index if not exists idx_pge_group on paygroup_employees (pay_group_id);
    create index if not exists idx_pge_employee on paygroup_employees (employee_id);

    -- ✅ COMMIT IF ALL OK
    commit;
    raise notice ''✅ Migration applied successfully.'';

  exception
    when others then
      migration_failed := true;
      rollback;
      raise notice ''⚠️ Migration failed — rolled back to previous state.'';
  end;

end $$","-- ===============================================================
-- END SAFE MIGRATION BLOCK WITH AUTOMATIC ROLLBACK
-- ==============================================================="}', 'merge_conflicts_safe_reconcile', NULL, NULL, NULL),
	('20251014160000', '{"-- ===============================================================
-- PAYRUN PRO DATABASE HEALTH MONITOR SETUP
-- ===============================================================
-- Purpose: Create helper functions and monitoring infrastructure
-- Author: Senior Supabase + PostgreSQL Reliability Engineer
-- ===============================================================

-- Create helper function for Edge Function to execute diagnostic queries
CREATE OR REPLACE FUNCTION exec_raw_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Execute the query and return results as JSON
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION
  WHEN others THEN
    -- Return error information safely
    RETURN json_build_object(''error'', SQLERRM);
END;
$$","-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_raw_sql(text) TO service_role","-- Create monitoring table to track health over time
CREATE TABLE IF NOT EXISTS database_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date timestamptz DEFAULT now(),
  health_score int,
  health_status text,
  critical_issues_count int,
  total_checks int,
  passed_checks int,
  report_data jsonb
)","-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_health_log_date ON database_health_log (check_date DESC)","-- Function to log health check results
CREATE OR REPLACE FUNCTION log_health_check(
  p_health_score int,
  p_health_status text,
  p_critical_issues_count int,
  p_total_checks int,
  p_passed_checks int,
  p_report_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO database_health_log (
    health_score, health_status, critical_issues_count,
    total_checks, passed_checks, report_data
  ) VALUES (
    p_health_score, p_health_status, p_critical_issues_count,
    p_total_checks, p_passed_checks, p_report_data
  );
END;
$$","-- Grant permissions
GRANT EXECUTE ON FUNCTION log_health_check(int, text, int, int, int, jsonb) TO service_role","GRANT SELECT, INSERT ON database_health_log TO service_role"}', 'database_health_monitor', NULL, NULL, NULL),
	('20250106000000', '{"-- Create payslip templates table
CREATE TABLE public.payslip_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)","-- Create payslip generations log table (foreign keys will be added later)
CREATE TABLE public.payslip_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.payslip_templates(id) ON DELETE CASCADE,
    pay_run_id UUID, -- Will add foreign key constraint later when pay_runs table exists
    employee_id UUID, -- Will add foreign key constraint later when employees table exists
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    export_format TEXT NOT NULL DEFAULT ''pdf'',
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id)
)","-- Enable Row Level Security
ALTER TABLE public.payslip_templates ENABLE ROW LEVEL SECURITY","ALTER TABLE public.payslip_generations ENABLE ROW LEVEL SECURITY","-- Create RLS policies for payslip_templates
CREATE POLICY \"Users can view their own payslip templates\" 
ON public.payslip_templates FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id)","CREATE POLICY \"Users can insert their own payslip templates\" 
ON public.payslip_templates FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id)","CREATE POLICY \"Users can update their own payslip templates\" 
ON public.payslip_templates FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)","CREATE POLICY \"Users can delete their own payslip templates\" 
ON public.payslip_templates FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id)","-- Create RLS policies for payslip_generations
CREATE POLICY \"Users can view payslip generations for their templates\" 
ON public.payslip_generations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.payslip_templates 
        WHERE id = template_id AND user_id = auth.uid()
    )
)","CREATE POLICY \"Users can insert payslip generations\" 
ON public.payslip_generations FOR INSERT 
TO authenticated 
WITH CHECK (true)","-- Create indexes for better performance
CREATE INDEX idx_payslip_templates_user_id ON public.payslip_templates(user_id)","CREATE INDEX idx_payslip_templates_is_default ON public.payslip_templates(user_id, is_default)","CREATE INDEX idx_payslip_generations_template_id ON public.payslip_generations(template_id)","CREATE INDEX idx_payslip_generations_pay_run_id ON public.payslip_generations(pay_run_id)","CREATE INDEX idx_payslip_generations_employee_id ON public.payslip_generations(employee_id)","-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payslip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql","-- Create trigger for updated_at
CREATE TRIGGER update_payslip_templates_updated_at
    BEFORE UPDATE ON public.payslip_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_payslip_templates_updated_at()","-- Insert default templates for all users
INSERT INTO public.payslip_templates (name, description, config, user_id, is_default)
SELECT 
    ''Professional Corporate'',
    ''Clean, professional design with company branding'',
    ''{
        \"layout\": {
            \"header\": {
                \"showLogo\": true,
                \"showCompanyInfo\": true,
                \"alignment\": \"center\"
            },
            \"sections\": {
                \"employeeInfo\": true,
                \"payPeriod\": true,
                \"earnings\": true,
                \"deductions\": true,
                \"contributions\": true,
                \"totals\": true,
                \"leave\": false
            },
            \"order\": [\"employeeInfo\", \"payPeriod\", \"earnings\", \"deductions\", \"contributions\", \"totals\"]
        },
        \"styling\": {
            \"primaryColor\": \"#0e7288\",
            \"secondaryColor\": \"#f6ba15\",
            \"backgroundColor\": \"#ffffff\",
            \"textColor\": \"#0f172a\",
            \"accentColor\": \"#10b981\",
            \"borderColor\": \"#e2e8f0\",
            \"fontFamily\": \"Inter, sans-serif\",
            \"headingSize\": \"1.75rem\",
            \"bodySize\": \"0.875rem\",
            \"smallSize\": \"0.75rem\",
            \"fontWeight\": {
                \"normal\": \"400\",
                \"medium\": \"500\",
                \"bold\": \"600\"
            }
        },
        \"branding\": {
            \"showCompanyLogo\": true,
            \"showWatermark\": false,
            \"watermarkText\": \"\",
            \"confidentialityFooter\": true
        }
    }''::jsonb,
    u.id,
    true
FROM auth.users u
WHERE u.id IS NOT NULL"}', 'payslip_templates', NULL, NULL, NULL),
	('20251219001000', '{"-- Migration: Harden OBAC Multi-Tenancy
-- Phase 3: Lifecycle & Functional Security

-- 1. Payroll Lifecycle Protection
-- This trigger ensures that approved/paid pay runs cannot be modified or deleted.
-- It also enforces that only authorized roles can approve payroll.
CREATE OR REPLACE FUNCTION public.enforce_pay_run_security()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent Deletion of protected states
  IF (TG_OP = ''DELETE'') THEN
    IF OLD.status IN (''approved'', ''paid'', ''completed'') AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION ''Cannot delete a payroll that has been approved or paid'';
    END IF;
    RETURN OLD;
  END IF;

  -- 2. Enforce Approval Authority (Status Change to Approved)
  IF (NEW.status = ''approved'' AND (OLD.status IS NULL OR OLD.status != ''approved'')) THEN
    -- Check for explicit permission
    IF NOT public.has_permission(''payroll.approve'', ''ORGANIZATION'', NEW.organization_id) THEN
      RAISE EXCEPTION ''Insufficient authority to approve payroll. Role ORG_FINANCE_CONTROLLER or equivalent required.'';
    END IF;
    
    -- Record approval event
    INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description)
    VALUES (auth.uid(), NEW.organization_id, ''PAYROLL_APPROVED'', ''PAY_RUN'', NEW.id::text, ''Payroll approved and locked.'');
  END IF;

  -- 3. Lock Data in Approved/Paid States
  -- If the status is already approved/paid, only allow status updates (no data changes)
  IF (OLD.status IN (''approved'', ''paid'', ''completed'')) THEN
    -- Allow transition from approved to paid
    IF (OLD.status = ''approved'' AND NEW.status = ''paid'') THEN
        -- OK
    ELSIF OLD.status = NEW.status THEN
        -- No data changes allowed once locked
        IF ROW(NEW.total_gross_pay, NEW.total_deductions, NEW.total_net_pay, NEW.pay_period_start, NEW.pay_period_end) 
           IS DISTINCT FROM 
           ROW(OLD.total_gross_pay, OLD.total_deductions, OLD.total_net_pay, OLD.pay_period_start, OLD.pay_period_end) 
        THEN
            RAISE EXCEPTION ''Cannot modify financial data for an approved/paid payroll. Rollback approval first if permitted.'';
        END IF;
    ELSE
        -- Prevent other status regressions unless platform admin
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION ''Cannot revert status of approved/paid payroll.'';
        END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql","DROP TRIGGER IF EXISTS trg_enforce_pay_run_security ON public.pay_runs","CREATE TRIGGER trg_enforce_pay_run_security
BEFORE UPDATE OR DELETE ON public.pay_runs
FOR EACH ROW EXECUTE FUNCTION public.enforce_pay_run_security()","-- 2. Automated Security Audit Triggers
-- Logs all changes to critical RBAC tables.
CREATE OR REPLACE FUNCTION public.audit_rbac_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = ''DELETE'') THEN
    v_org_id := OLD.org_id;
    v_details := ''Removed: '' || row_to_json(OLD)::text;
  ELSE
    v_org_id := NEW.org_id;
    v_details := CASE WHEN TG_OP = ''INSERT'' THEN ''Added: '' ELSE ''Modified: '' END || row_to_json(NEW)::text;
  END IF;

  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    v_org_id, 
    ''RBAC_'' || TG_OP || ''_'' || TG_TABLE_NAME, 
    TG_TABLE_NAME, 
    CASE WHEN TG_OP = ''DELETE'' THEN OLD.code ELSE NEW.code END, -- For rbac_roles
    ''RBAC change detected in '' || TG_TABLE_NAME,
    jsonb_build_object(''details'', v_details)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql","-- Roles
DROP TRIGGER IF EXISTS trg_audit_rbac_roles ON public.rbac_roles","CREATE TRIGGER trg_audit_rbac_roles
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_changes()","-- Assignments (needs different id handling)
CREATE OR REPLACE FUNCTION public.audit_rbac_assignments()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    CASE WHEN TG_OP = ''DELETE'' THEN OLD.org_id ELSE NEW.org_id END, 
    ''ASSIGNMENT_'' || TG_OP, 
    ''rbac_assignments'', 
    (CASE WHEN TG_OP = ''DELETE'' THEN OLD.user_id ELSE NEW.user_id END)::text,
    ''Role assignment changed for user'',
    jsonb_build_object(''role'', CASE WHEN TG_OP = ''DELETE'' THEN OLD.role_code ELSE NEW.role_code END)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql","DROP TRIGGER IF EXISTS trg_audit_rbac_assignments ON public.rbac_assignments","CREATE TRIGGER trg_audit_rbac_assignments
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_assignments()"}', 'functional_security_audit', NULL, NULL, NULL),
	('20251224000000', '{"-- Add RLS policies for head_office_pay_group_members table
-- This allows authenticated users to manage pay group members for their organization

-- Enable RLS on the table
ALTER TABLE head_office_pay_group_members ENABLE ROW LEVEL SECURITY","-- Drop existing policies if they exist
DROP POLICY IF EXISTS \"Users can view pay group members for their organization\" ON head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can insert pay group members for their organization\" ON head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can update pay group members for their organization\" ON head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can delete pay group members for their organization\" ON head_office_pay_group_members","-- SELECT policy: Users can view pay group members for their organization
CREATE POLICY \"Users can view pay group members for their organization\"
ON head_office_pay_group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> ''organization_id'')::uuid
  )
)","-- INSERT policy: Users can insert pay group members for their organization
CREATE POLICY \"Users can insert pay group members for their organization\"
ON head_office_pay_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> ''organization_id'')::uuid
  )
)","-- UPDATE policy: Users can update pay group members for their organization
CREATE POLICY \"Users can update pay group members for their organization\"
ON head_office_pay_group_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> ''organization_id'')::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> ''organization_id'')::uuid
  )
)","-- DELETE policy: Users can delete pay group members for their organization
CREATE POLICY \"Users can delete pay group members for their organization\"
ON head_office_pay_group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> ''organization_id'')::uuid
  )
)"}', 'add_head_office_pay_group_members_rls', NULL, NULL, NULL),
	('20251219000800', '{"-- Migration: Harden OBAC Multi-Tenancy
-- Phase 1: Tenant-scoped roles and permissions

-- 1. Add org_id to rbac_roles
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE","-- 2. Ensure Platform Sentinel Org exists
INSERT INTO public.organizations (id, name) 
VALUES (''00000000-0000-0000-0000-000000000000'', ''Platform System'')
ON CONFLICT (id) DO NOTHING","-- 3. Populate org_ids
-- Platform roles use the sentinel
UPDATE public.rbac_roles 
SET org_id = ''00000000-0000-0000-0000-000000000000'' 
WHERE tier = ''PLATFORM'' AND (org_id IS NULL OR org_id != ''00000000-0000-0000-0000-000000000000'')","-- Other roles use the primary org or inherit from scope
UPDATE public.rbac_roles 
SET org_id = ''00000000-0000-0000-0000-000000000001'' 
WHERE tier != ''PLATFORM'' AND org_id IS NULL","-- 4. Enforce constraint: org_id is the SENTINEL for PLATFORM tier, something else for others
ALTER TABLE public.rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_org_id_check","ALTER TABLE public.rbac_roles ADD CONSTRAINT rbac_roles_org_id_check 
  CHECK (
    (tier = ''PLATFORM'' AND org_id = ''00000000-0000-0000-0000-000000000000'') OR 
    (tier != ''PLATFORM'' AND org_id != ''00000000-0000-0000-0000-000000000000'' AND org_id IS NOT NULL)
  )","-- 5. Add org_id to mapping tables
ALTER TABLE public.rbac_role_permissions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE","ALTER TABLE public.rbac_assignments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE","-- Update mapping tables to inherit org_id from roles
UPDATE public.rbac_role_permissions rrp
SET org_id = rr.org_id
FROM public.rbac_roles rr
WHERE rrp.role_code = rr.code AND (rrp.org_id IS NULL OR rrp.org_id != rr.org_id)","-- Update assignments
UPDATE public.rbac_assignments ra
SET org_id = COALESCE(
  CASE 
    WHEN ra.scope_type = ''ORGANIZATION'' THEN ra.scope_id
    WHEN ra.scope_type = ''GLOBAL'' THEN ''00000000-0000-0000-0000-000000000000''
    ELSE (SELECT organization_id FROM public.companies WHERE id = ra.scope_id)
  END,
  ''00000000-0000-0000-0000-000000000001''
)
WHERE ra.org_id IS NULL","-- 6. Update Primary Keys to be Composite (code, org_id)
ALTER TABLE public.rbac_role_permissions DROP CONSTRAINT IF EXISTS rbac_role_permissions_role_code_fkey","ALTER TABLE public.rbac_assignments DROP CONSTRAINT IF EXISTS rbac_assignments_role_code_fkey","ALTER TABLE public.rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_pkey CASCADE","ALTER TABLE public.rbac_roles ADD PRIMARY KEY (code, org_id)","ALTER TABLE public.rbac_role_permissions ADD CONSTRAINT rbac_role_permissions_role_fkey 
  FOREIGN KEY (role_code, org_id) REFERENCES public.rbac_roles(code, org_id) ON DELETE CASCADE","ALTER TABLE public.rbac_assignments ADD CONSTRAINT rbac_assignments_role_fkey 
  FOREIGN KEY (role_code, org_id) REFERENCES public.rbac_roles(code, org_id) ON DELETE CASCADE","ALTER TABLE public.rbac_role_permissions DROP CONSTRAINT IF EXISTS rbac_role_permissions_pkey","ALTER TABLE public.rbac_role_permissions ADD PRIMARY KEY (role_code, permission_key, org_id)","-- 7. Strict Validation Function
CREATE OR REPLACE FUNCTION public.validate_rbac_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Ensure User belongs to the Org (unless platform admin/sentinel)
  IF NEW.org_id != ''00000000-0000-0000-0000-000000000000'' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = NEW.user_id AND organization_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION ''User does not belong to the target organization'';
    END IF;
  END IF;

  -- 2. Ensure Scope belongs to the Org
  IF NEW.scope_type = ''COMPANY'' THEN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.scope_id AND organization_id = NEW.org_id) THEN
      RAISE EXCEPTION ''Target company does not belong to the assignment organization'';
    END IF;
  ELSIF NEW.scope_type = ''PROJECT'' THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.scope_id AND organization_id = NEW.org_id) THEN
      RAISE EXCEPTION ''Target project does not belong to the assignment organization'';
    END IF;
  ELSIF NEW.scope_type = ''ORGANIZATION'' THEN
    IF NEW.scope_id != NEW.org_id THEN
      RAISE EXCEPTION ''Organization scope ID must match the assignment organization ID'';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql","DROP TRIGGER IF EXISTS trg_validate_rbac_assignment ON public.rbac_assignments","CREATE TRIGGER trg_validate_rbac_assignment
BEFORE INSERT OR UPDATE ON public.rbac_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_rbac_assignment()","-- 8. Security Audit Table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    org_id UUID REFERENCES public.organizations(id),
    event_type TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT ''{}''::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
)","ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY"}', 'harden_rbac_multitenancy', NULL, NULL, NULL),
	('20251224010000', '{"-- Consolidation of RLS policies for Head Office tables
-- Standardizes role checks and fixes organization-level isolation

-- 1. Helper Function to get org_id from JWT (handles both ''org_id'' and ''organization_id'' keys if they differ)
CREATE OR REPLACE FUNCTION public.get_auth_org_id() 
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> ''org_id''),
    (auth.jwt() ->> ''organization_id'')
  )::uuid;
END;
$$ LANGUAGE plpgsql STABLE","-- 2. Helper Function to check HO management role
CREATE OR REPLACE FUNCTION public.is_ho_manager() 
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() ->> ''role'') IN (
    ''Super Admin'', ''Organization Admin'', ''Payroll Manager'',
    ''super_admin'', ''admin'', ''manager'', ''payroll_manager'',
    ''PLATFORM_SUPER_ADMIN'', ''ORG_ADMIN'', ''COMPANY_PAYROLL_ADMIN''
  );
END;
$$ LANGUAGE plpgsql STABLE","-- 3. Update head_office_pay_group_members policies
ALTER TABLE public.head_office_pay_group_members ENABLE ROW LEVEL SECURITY","DROP POLICY IF EXISTS \"View HO Membership\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Manage HO Membership\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can view pay group members for their organization\" ON head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can insert pay group members for their organization\" ON head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can update pay group members for their organization\" ON head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can delete pay group members for their organization\" ON head_office_pay_group_members","CREATE POLICY \"View HO Membership\" ON public.head_office_pay_group_members 
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
  )
)","CREATE POLICY \"Manage HO Membership\" ON public.head_office_pay_group_members 
FOR ALL TO authenticated 
USING (
  public.is_ho_manager() AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
  )
)
WITH CHECK (
  public.is_ho_manager() AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
  )
)","-- 4. Fix Pay Group table policies to be consistent with get_auth_org_id()
-- Regular
DROP POLICY IF EXISTS \"View Regular HO Paygroups\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Manage Regular HO Paygroups\" ON public.head_office_pay_groups_regular","CREATE POLICY \"View Regular HO Paygroups\" ON public.head_office_pay_groups_regular 
FOR SELECT USING (organization_id = public.get_auth_org_id())","CREATE POLICY \"Manage Regular HO Paygroups\" ON public.head_office_pay_groups_regular 
FOR ALL TO authenticated USING (organization_id = public.get_auth_org_id() AND public.is_ho_manager())","-- Interns
DROP POLICY IF EXISTS \"View Intern HO Paygroups\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Manage Intern HO Paygroups\" ON public.head_office_pay_groups_interns","CREATE POLICY \"View Intern HO Paygroups\" ON public.head_office_pay_groups_interns 
FOR SELECT USING (organization_id = public.get_auth_org_id())","CREATE POLICY \"Manage Intern HO Paygroups\" ON public.head_office_pay_groups_interns 
FOR ALL TO authenticated USING (organization_id = public.get_auth_org_id() AND public.is_ho_manager())","-- Expatriates
DROP POLICY IF EXISTS \"View Expatriate HO Paygroups\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Manage Expatriate HO Paygroups\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"View Expatriate HO Paygroups\" ON public.head_office_pay_groups_expatriates 
FOR SELECT USING (organization_id = public.get_auth_org_id())","CREATE POLICY \"Manage Expatriate HO Paygroups\" ON public.head_office_pay_groups_expatriates 
FOR ALL TO authenticated USING (organization_id = public.get_auth_org_id() AND public.is_ho_manager())"}', 'fix_ho_rls_and_joins', NULL, NULL, NULL),
	('20260308124547', '{"
-- 1. Drop the restrictive role check constraint
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Update handle_new_user to normalize roles safely before inserting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  raw_role TEXT;
  safe_role TEXT;
BEGIN
  BEGIN
    org_id := (NEW.raw_user_meta_data->>''organization_id'')::UUID;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;

  raw_role := COALESCE(NEW.raw_user_meta_data->>''role'', ''user'');

  -- Normalize invitation/non-standard roles to valid values
  safe_role := CASE
    WHEN raw_role IN (''super_admin'', ''org_admin'', ''user'') THEN raw_role
    WHEN raw_role IN (''admin'', ''organization_admin'') THEN ''org_admin''
    ELSE ''user''
  END;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>''first_name'',
    NEW.raw_user_meta_data->>''last_name'',
    safe_role,
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    role = EXCLUDED.role,
    organization_id = COALESCE(public.user_profiles.organization_id, EXCLUDED.organization_id);

  RETURN NEW;
END;
$$;
"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20251019054143', '{"-- Pull remote fixes: enum and constraint updates
-- This migration captures the fixes already applied in the remote database

-- Fix pay_frequency enum to include \"Daily Rate\"
ALTER TYPE public.pay_frequency ADD VALUE IF NOT EXISTS ''Daily Rate''","-- Fix pay_type enum to include \"daily_rate\"  
ALTER TYPE public.pay_type ADD VALUE IF NOT EXISTS ''daily_rate''","-- Fix employee_type_check constraint to accept capitalized values
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employee_type_check","ALTER TABLE public.employees 
ADD CONSTRAINT employee_type_check 
CHECK (employee_type IN (''Local'', ''Expatriate''))","-- Update existing employee_type records to use capitalized values
UPDATE public.employees 
SET employee_type = ''Local'' 
WHERE employee_type = ''local''","UPDATE public.employees 
SET employee_type = ''Expatriate'' 
WHERE employee_type = ''expatriate''","-- Ensure pay_frequency column exists in pay_groups
ALTER TABLE pay_groups
  ADD COLUMN IF NOT EXISTS pay_frequency TEXT DEFAULT ''Monthly''","-- Update existing pay_groups records to have proper pay_frequency
UPDATE pay_groups 
SET pay_frequency = ''Daily Rate'' 
WHERE type = ''Expatriate'' AND pay_frequency IS NULL","-- Ensure type column exists in pay_groups
ALTER TABLE pay_groups
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT ''Local''","-- Update existing pay_groups records to have proper type values
UPDATE pay_groups 
SET type = ''Local'' 
WHERE type IS NULL OR type = ''''","-- Add constraint for pay_groups type
ALTER TABLE pay_groups
  DROP CONSTRAINT IF EXISTS check_pay_groups_type","ALTER TABLE pay_groups
  ADD CONSTRAINT check_pay_groups_type
  CHECK (type IN (''Local'', ''Expatriate'', ''Contractor'', ''Intern'', ''Casual''))"}', 'pull_remote_fixes', NULL, NULL, NULL),
	('20251019060742', '{"-- START OF migration.sql -- Create schemas CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS storage; CREATE SCHEMA IF NOT EXISTS realtime; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS graphql; CREATE SCHEMA IF NOT EXISTS graphql_public; CREATE SCHEMA IF NOT EXISTS public;

-- Extensions (may require superuser) CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog; CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS uuid_ossp WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster; CREATE EXTENSION IF NOT EXISTS postgis_sfcgal; CREATE EXTENSION IF NOT EXISTS postgis_topology; CREATE EXTENSION IF NOT EXISTS pgsodium; CREATE EXTENSION IF NOT EXISTS pgjwt; CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS ltree; CREATE EXTENSION IF NOT EXISTS hstore; CREATE EXTENSION IF NOT EXISTS file_fdw; CREATE EXTENSION IF NOT EXISTS postgres_fdw; CREATE EXTENSION IF NOT EXISTS pgrowlocks; CREATE EXTENSION IF NOT EXISTS pg_repack; CREATE EXTENSION IF NOT EXISTS pg_stat_monitor; CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS rum; CREATE EXTENSION IF NOT EXISTS btree_gin; CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pg_buffercache; CREATE EXTENSION IF NOT EXISTS pg_prewarm; CREATE EXTENSION IF NOT EXISTS pg_cron; CREATE EXTENSION IF NOT EXISTS pgcrypto; -- repeated safe CREATE EXTENSION IF NOT EXISTS tablefunc; CREATE EXTENSION IF NOT EXISTS xml2; CREATE EXTENSION IF NOT EXISTS pgjwt; -- repeated safe

-- Create user-defined types (as observed). If a type already exists, these checks avoid error. DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''payrunstatus'')
THEN CREATE TYPE public.payrunstatus AS ENUM (''draft'', ''pendingapproval'', ''approved'', ''processed'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''payitemstatus'')
THEN CREATE TYPE public.payitemstatus AS ENUM (''draft'', ''pending'', ''approved'', ''paid'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''paytype'')
THEN CREATE TYPE public.paytype AS ENUM (''hourly'', ''salary'', ''piecerate'', ''dailyrate'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''payfrequency'')
THEN CREATE TYPE public.payfrequency AS ENUM (''weekly'', ''biweekly'', ''monthly'', ''dailyrate'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''paygrouptype'')
THEN CREATE TYPE public.paygrouptype AS ENUM (''local'', ''expatriate'', ''contractor'', ''intern'', ''temporary'', ''Expatriate'', ''Local'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''benefittype'')
THEN CREATE TYPE public.benefittype AS ENUM (''healthinsurance'', ''retirement'', ''dental'', ''vision'', ''other'')","END IF","-- Auth schema enums
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''aallevel'')
THEN CREATE TYPE auth.aallevel AS ENUM (''aal1'', ''aal2'', ''aal3'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''factortype'')
THEN CREATE TYPE auth.factortype AS ENUM (''totp'', ''webauthn'', ''phone'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''factorstatus'')
THEN CREATE TYPE auth.factorstatus AS ENUM (''unverified'', ''verified'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''oauthresponsetype'')
THEN CREATE TYPE auth.oauthresponsetype AS ENUM (''code'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''oauthclienttype'')
THEN CREATE TYPE auth.oauthclienttype AS ENUM (''public'', ''confidential'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''oauthregistrationtype'')
THEN CREATE TYPE auth.oauthregistrationtype AS ENUM (''dynamic'', ''manual'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''codechallengemethod'')
THEN CREATE TYPE auth.codechallengemethod AS ENUM (''s256'', ''plain'')","END IF","IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''onetimetokentype'')
THEN CREATE TYPE auth.onetimetokentype AS ENUM (''confirmationtoken'', ''reauthenticationtoken'', ''recoverytoken'', ''emailchangetokennew'', ''emailchangetokencurrent'', ''phonechangetoken'')","END IF",END,"-- Sequences (ensure existence) DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = ''S'' AND relname = ''auth.refreshtokensidseq'')
THEN CREATE SEQUENCE auth.refreshtokensidseq","END IF",END,"-- Functions (stubs or recreated where necessary) -- vault.crypto_aead_det_noncegen used as default DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = ''cryptoaeaddetnoncegen'' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = ''vault''))
THEN CREATE OR REPLACE FUNCTION vault.cryptoaeaddetnoncegen() RETURNS bytea LANGUAGE sql SECURITY DEFINER AS SELECT gen_random_bytes(12)","END IF",END,"-- storage.get_level used as default for storage.prefixes.level DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = ''getlevel'' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = ''storage''))
THEN CREATE OR REPLACE FUNCTION storage.getlevel(nametext) RETURNS integer LANGUAGE sql STABLE AS SELECT 0","END IF",END,"-- realtime.broadcast_changes exists in realtime schema in Supabase; create safe stub if missing DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = ''broadcastchanges'' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = ''realtime''))
THEN CREATE OR REPLACE FUNCTION realtime.broadcastchanges(topictext,optext,eventtext,tablenametext,tableschematetext,newrowjsonb,oldrowjsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS BEGIN -- Stub: actual realtime.broadcast_changes is provided by Supabase realtime. This stub is no-op for local dev. RETURN; END;","END IF",END,"-- Example helper used in default for storage.objects path tokens: string_to_array built-in used, so no helper needed.

-- Tables: create in dependency order where possible

-- Schema: storage.prefixes CREATE TABLE IF NOT EXISTS storage.prefixes ( bucket_id text NOT NULL, name text NOT NULL, level integer NOT NULL DEFAULT storage.getlevel(name), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), PRIMARY KEY (bucket_id, name, level) );

-- Schema: storage.buckets (referenced by storage.prefixes and storage.objects) CREATE TYPE IF NOT EXISTS storage.buckettype AS ENUM (''STANDARD'',''ANALYTICS''); CREATE TABLE IF NOT EXISTS storage.buckets ( id text PRIMARY KEY, name text, owner uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), public boolean DEFAULT false, avif_autodetection boolean DEFAULT false, file_size_limit bigint, allowed_mime_types text[], owner_id text, type storage.buckettype DEFAULT ''STANDARD''::storage.buckettype );

-- storage.objects CREATE TABLE IF NOT EXISTS storage.objects ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, bucket_id text, name text, owner uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), last_accessed_at timestamptz DEFAULT now(), metadata jsonb, path_tokens text[] DEFAULT string_to_array(name, ''/''::text), version text, owner_id text, user_metadata jsonb, level integer );

-- storage.s3_multipart_uploads CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads ( id text PRIMARY KEY, in_progress_size bigint DEFAULT 0, upload_signature text, bucket_id text, key text, version text, owner_id text, created_at timestamptz DEFAULT now(), user_metadata jsonb );

-- storage.s3_multipart_uploads_parts CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads_parts ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, upload_id text, size bigint DEFAULT 0, part_number integer, bucket_id text, key text, etag text, owner_id text, version text, created_at timestamptz DEFAULT now() );

-- storage.buckets_analytics CREATE TABLE IF NOT EXISTS storage.buckets_analytics ( id text PRIMARY KEY, type storage.buckettype DEFAULT ''ANALYTICS''::storage.buckettype, format text DEFAULT ''ICEBERG''::text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

-- storage.migrations CREATE TABLE IF NOT EXISTS storage.migrations ( id integer, name character varying UNIQUE, hash character varying, executed_at timestamp DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id) );

-- Schema: public (key tables) CREATE TABLE IF NOT EXISTS public.users ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email character varying UNIQUE, first_name character varying, last_name character varying, role character varying NOT NULL CHECK (role::text = ANY (ARRAY[''super_admin''::character varying, ''organization_admin''::character varying, ''ceo_executive''::character varying, ''payroll_manager''::character varying, ''employee''::character varying, ''hr_business_partner''::character varying, ''finance_controller''::character varying]::text[])), organization_id uuid, department_id character varying, manager_id uuid, is_active boolean DEFAULT true, last_login timestamptz, two_factor_enabled boolean DEFAULT false, session_timeout integer DEFAULT 480, permissions text[] DEFAULT ''{}''::text[], restrictions text[] DEFAULT ''{}''::text[], created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.employee_number_settings ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, number_format text DEFAULT ''PREFIX-SEQUENCE''::text, default_prefix text DEFAULT ''EMP''::text, sequence_digits integer DEFAULT 3 CHECK (sequence_digits >= 1 AND sequence_digits <= 10), use_department_prefix boolean DEFAULT false, include_country_code boolean DEFAULT false, use_employment_type boolean DEFAULT false, custom_prefix_per_pay_group boolean DEFAULT false, custom_format text, next_sequence integer DEFAULT 1 CHECK (next_sequence > 0), department_rules jsonb DEFAULT ''{}''::jsonb, country_rules jsonb DEFAULT ''{}''::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.database_health_log ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, check_date timestamptz DEFAULT now(), health_score integer, health_status text, critical_issues_count integer, total_checks integer, passed_checks integer, report_data jsonb )","CREATE TABLE IF NOT EXISTS public.pay_item_custom_deductions ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_item_id uuid, name text, amount numeric DEFAULT 0.00, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), type text DEFAULT ''deduction''::text CHECK (type = ANY (ARRAY[''deduction''::text, ''benefit''::text, ''allowance''::text])) )","CREATE TABLE IF NOT EXISTS public.settings ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, category text, key text, value jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.integration_health ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, integration_name character varying, status character varying CHECK (status::text = ANY (ARRAY[''healthy''::character varying, ''warning''::character varying, ''critical''::character varying]::text[])), last_sync timestamptz, uptime numeric DEFAULT 0, api_response_time integer DEFAULT 0, error_rate numeric DEFAULT 0, total_syncs integer DEFAULT 0, successful_syncs integer DEFAULT 0, failed_syncs integer DEFAULT 0, checked_at timestamptz, created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.payrun_employees ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_id uuid, employee_id uuid, pay_group_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.pay_runs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_date date DEFAULT CURRENT_DATE, pay_period_start date, pay_period_end date, pay_group_id uuid, status public.payrunstatus DEFAULT ''draft''::public.payrunstatus, total_gross_pay numeric DEFAULT 0.00, total_deductions numeric DEFAULT 0.00, total_net_pay numeric DEFAULT 0.00, approved_by uuid, approved_at timestamptz, created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), pay_run_id character varying UNIQUE )","CREATE TABLE IF NOT EXISTS public.pay_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_id uuid, employee_id uuid, hours_worked numeric, pieces_completed integer, gross_pay numeric DEFAULT 0.00, tax_deduction numeric DEFAULT 0.00, benefit_deductions numeric DEFAULT 0.00, total_deductions numeric DEFAULT 0.00, net_pay numeric DEFAULT 0.00, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), status public.payitemstatus DEFAULT ''draft''::public.payitemstatus, employer_contributions numeric DEFAULT 0.00 )","CREATE TABLE IF NOT EXISTS public.pay_calculation_audit_log ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employee_id uuid, pay_run_id uuid, input_data jsonb, output_data jsonb, calculation_type text DEFAULT ''payroll_calculation''::text, calculated_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.permission_cache ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, resource character varying, permission character varying, has_permission boolean, context jsonb DEFAULT ''{}''::jsonb, expires_at timestamptz, created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.paygroup_employees ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_group_id uuid, employee_id uuid, assigned_by uuid, assigned_at timestamptz DEFAULT now(), active boolean DEFAULT true, notes text )","CREATE TABLE IF NOT EXISTS public.pay_groups ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, country text, pay_frequency public.payfrequency DEFAULT ''monthly''::public.payfrequency, default_tax_percentage numeric DEFAULT 0.00, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), type public.paygrouptype DEFAULT ''local''::public.paygrouptype )","CREATE TABLE IF NOT EXISTS public.expatriate_pay_groups ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, paygroup_id text UNIQUE, name text, country text, currency text DEFAULT ''USD''::text, exchange_rate_to_local numeric DEFAULT 0, tax_country text, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.expatriate_pay_run_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_id uuid, employee_id uuid, expatriate_pay_group_id uuid, daily_rate numeric, days_worked integer, allowances_foreign numeric DEFAULT 0, net_foreign numeric, net_local numeric, gross_local numeric, tax_country text, exchange_rate_to_local numeric, currency text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.payslip_templates ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, description text, config jsonb, user_id uuid, is_default boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.payslip_generations ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, template_id uuid, pay_run_id uuid, employee_id uuid, generated_at timestamptz DEFAULT now(), export_format text DEFAULT ''pdf''::text, file_size integer, created_by uuid )","CREATE TABLE IF NOT EXISTS public.user_preferences ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid UNIQUE, preferences jsonb DEFAULT ''{}''::jsonb, dashboard_config jsonb DEFAULT ''{}''::jsonb, notification_settings jsonb DEFAULT ''{}''::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.profiles ( id uuid PRIMARY KEY, email text, first_name text, last_name text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.employees ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email text UNIQUE, phone text, pay_type public.paytype DEFAULT ''hourly''::public.paytype, pay_rate numeric, country text, pay_group_id uuid, status text DEFAULT ''active''::text CHECK (status = ANY (ARRAY[''active''::text, ''inactive''::text])), user_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), first_name text, middle_name text, last_name text, currency text, employee_type text DEFAULT ''local''::text CHECK (employee_type = ANY (ARRAY[''local''::text, ''expatriate''::text])), gender text, date_of_birth date, national_id text, tin text, nssf_number text, passport_number text, bank_name text, bank_branch text, account_number text, account_type text, department text, project text, employee_number text, social_security_number text, employee_category text CHECK (employee_category IS NULL OR (employee_category = ANY (ARRAY[''Intern''::text, ''Trainee''::text, ''Temporary''::text, ''Permanent''::text, ''On Contract''::text, ''Casual''::text]))), employment_status text DEFAULT ''Active''::text CHECK (employment_status = ANY (ARRAY[''Active''::text, ''Terminated''::text, ''Deceased''::text, ''Resigned''::text, ''Probation''::text, ''Notice Period''::text])) )","CREATE TABLE IF NOT EXISTS public.attendance_records ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employee_id uuid, date date, check_in time, check_out time, total_hours numeric DEFAULT 0, overtime_hours numeric DEFAULT 0, status character varying CHECK (status::text = ANY (ARRAY[''present''::character varying, ''absent''::character varying, ''half-day''::character varying, ''holiday''::character varying]::text[])), leave_type character varying, remarks text, synced_from_zoho boolean DEFAULT false, synced_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.employee_number_history ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employee_id uuid, old_employee_number text, new_employee_number text, changed_at timestamptz DEFAULT now(), changed_by uuid, reason text )","CREATE TABLE IF NOT EXISTS public.user_sessions ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, session_token character varying UNIQUE, ip_address inet, user_agent text, created_at timestamptz DEFAULT now(), expires_at timestamptz, is_active boolean DEFAULT true )","CREATE TABLE IF NOT EXISTS public.sync_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, sync_id character varying, type character varying, direction character varying, status character varying CHECK (status::text = ANY (ARRAY[''pending''::character varying, ''processing''::character varying, ''completed''::character varying, ''failed''::character varying]::text[])), started_at timestamptz, completed_at timestamptz, records_processed integer DEFAULT 0, records_failed integer DEFAULT 0, error_message text, retry_count integer DEFAULT 0, created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.alert_rules ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, integration_name character varying, name character varying, condition character varying, threshold numeric, enabled boolean DEFAULT true, notification_channels text[] DEFAULT ''{}''::text[], escalation_level integer DEFAULT 1, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.alert_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, rule_id uuid, rule_name character varying, integration_name character varying, status character varying, message text, triggered_at timestamptz, created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.audit_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, integration_name character varying, action character varying, user_id character varying, resource character varying, details jsonb DEFAULT ''{}''::jsonb, ip_address inet, user_agent text, timestamp timestamptz, created_at timestamptz DEFAULT now(), result character varying CHECK (result::text = ANY (ARRAY[''success''::character varying, ''failure''::character varying, ''denied''::character varying]::text[])) )","CREATE TABLE IF NOT EXISTS public.permission_cache ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, resource character varying, permission character varying, has_permission boolean, context jsonb DEFAULT ''{}''::jsonb, expires_at timestamptz, created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.payslip_generations ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, template_id uuid, pay_run_id uuid, employee_id uuid, generated_at timestamptz DEFAULT now(), export_format text DEFAULT ''pdf''::text, file_size integer, created_by uuid )","CREATE TABLE IF NOT EXISTS public.payslip_templates ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, description text, config jsonb, user_id uuid, is_default boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.company_settings ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, company_name text DEFAULT ''SimplePay Solutions''::text, address text, phone text, email text, website text, tax_id text, logo_url text, primary_color text DEFAULT ''#3366CC''::text, secondary_color text DEFAULT ''#666666''::text, accent_color text DEFAULT ''#FF6B35''::text, include_logo boolean DEFAULT true, show_company_details boolean DEFAULT true, add_confidentiality_footer boolean DEFAULT true, include_generated_date boolean DEFAULT true, show_page_numbers boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.benefits ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, cost numeric, cost_type text DEFAULT ''fixed''::text CHECK (cost_type = ANY (ARRAY[''fixed''::text, ''percentage''::text])), benefit_type public.benefittype DEFAULT ''other''::public.benefittype, applicable_countries text[] DEFAULT ''{}''::text[], created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.lst_payment_plans ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, country text DEFAULT ''Uganda''::text, method text DEFAULT ''official_brackets''::text, annual_amount numeric DEFAULT 0, months integer DEFAULT 3 CHECK (months >= 1 AND months <= 24), distribution text DEFAULT ''equal''::text, custom_amounts jsonb, percentages jsonb, start_month date, apply_future boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.lst_employee_assignments ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, plan_id uuid, employee_id uuid, annual_amount numeric, months integer, start_month date, distribution text, custom_amounts jsonb, percentages jsonb, created_at timestamptz DEFAULT now() )","CREATE TABLE IF NOT EXISTS public.user_roles ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, role public.app_role, created_at timestamptz DEFAULT now() )","-- Note: public.app_role enum may be required — create if missing DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''approle'')
THEN CREATE TYPE public.approle AS ENUM (''superadmin'', ''admin'', ''manager'', ''employee'')","END IF",END,"-- Schema: auth CREATE TABLE IF NOT EXISTS auth.users ( instance_id uuid, id uuid PRIMARY KEY, aud character varying, role character varying, email character varying, encrypted_password character varying, email_confirmed_at timestamptz, invited_at timestamptz, confirmation_token character varying, confirmation_sent_at timestamptz, recovery_token character varying, recovery_sent_at timestamptz, email_change_token_new character varying, email_change character varying, email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz, phone text UNIQUE DEFAULT NULL::character varying, phone_confirmed_at timestamptz, phone_change character varying DEFAULT ''''::character varying, phone_change_token character varying DEFAULT ''''::character varying, phone_change_sent_at timestamptz, confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED, email_change_token_current character varying DEFAULT ''''::character varying, email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2), banned_until timestamptz, reauthentication_token character varying DEFAULT ''''::character varying, reauthentication_sent_at timestamptz, is_sso_user boolean DEFAULT false, deleted_at timestamptz, is_anonymous boolean DEFAULT false );

CREATE TABLE IF NOT EXISTS auth.sessions ( id uuid PRIMARY KEY, user_id uuid, created_at timestamptz, updated_at timestamptz, factor_id uuid, aal auth.aallevel, not_after timestamptz, refreshed_at timestamp, user_agent text, ip inet, tag text, oauth_client_id uuid )","CREATE TABLE IF NOT EXISTS auth.identities ( provider_id text, user_id uuid, identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz, email text GENERATED ALWAYS AS (lower((identity_data ->> ''email''::text))) STORED, id uuid DEFAULT gen_random_uuid() PRIMARY KEY )","CREATE TABLE IF NOT EXISTS auth.one_time_tokens ( id uuid PRIMARY KEY, user_id uuid, token_type auth.onetimetokentype, token_hash text NOT NULL CHECK (char_length(token_hash) > 0), relates_to text, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now() )","CREATE TABLE IF NOT EXISTS auth.refresh_tokens ( instance_id uuid, id bigint DEFAULT nextval(''auth.refresh_tokens_id_seq''::regclass) PRIMARY KEY, token character varying UNIQUE, user_id character varying, revoked boolean, created_at timestamptz, updated_at timestamptz, parent character varying, session_id uuid )","CREATE TABLE IF NOT EXISTS auth.sso_providers ( id uuid PRIMARY KEY, resource_id text, created_at timestamptz, updated_at timestamptz, disabled boolean )","CREATE TABLE IF NOT EXISTS auth.saml_providers ( id uuid PRIMARY KEY, sso_provider_id uuid, entity_id text UNIQUE NOT NULL CHECK (char_length(entity_id) > 0), metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0), metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0), attribute_mapping jsonb, created_at timestamptz, updated_at timestamptz, name_id_format text )","CREATE TABLE IF NOT EXISTS auth.saml_relay_states ( id uuid PRIMARY KEY, sso_provider_id uuid, request_id text NOT NULL CHECK (char_length(request_id) > 0), for_email text, redirect_to text, created_at timestamptz, updated_at timestamptz, flow_state_id uuid )","CREATE TABLE IF NOT EXISTS auth.flow_state ( id uuid PRIMARY KEY, user_id uuid, auth_code text, code_challenge_method auth.codechallengemethod, code_challenge text, provider_type text, provider_access_token text, provider_refresh_token text, created_at timestamptz, updated_at timestamptz, authentication_method text, auth_code_issued_at timestamptz )","CREATE TABLE IF NOT EXISTS auth.mfa_factors ( id uuid PRIMARY KEY, user_id uuid, friendly_name text, factor_type auth.factortype, status auth.factorstatus, created_at timestamptz, updated_at timestamptz, secret text, phone text, last_challenged_at timestamptz UNIQUE, web_authn_credential jsonb, web_authn_aaguid uuid )","CREATE TABLE IF NOT EXISTS auth.mfa_challenges ( id uuid PRIMARY KEY, factor_id uuid, created_at timestamptz, verified_at timestamptz, ip_address inet, otp_code text, web_authn_session_data jsonb )","CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims ( id uuid PRIMARY KEY, session_id uuid, created_at timestamptz, updated_at timestamptz, authentication_method text )","CREATE TABLE IF NOT EXISTS auth.oauth_clients ( id uuid PRIMARY KEY, client_secret_hash text, registration_type auth.oauthregistrationtype, redirect_uris text, grant_types text, client_name text CHECK (char_length(client_name) <= 1024), client_uri text CHECK (char_length(client_uri) <= 2048), logo_uri text CHECK (char_length(logo_uri) <= 2048), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz, client_type auth.oauthclienttype DEFAULT ''confidential''::auth.oauthclienttype )","CREATE TABLE IF NOT EXISTS auth.oauth_authorizations ( id uuid PRIMARY KEY, authorization_id text UNIQUE, client_id uuid, user_id uuid, redirect_uri text CHECK (char_length(redirect_uri) <= 2048), scope text CHECK (char_length(scope) <= 4096), state text CHECK (char_length(state) <= 4096), resource text CHECK (char_length(resource) <= 2048), code_challenge text CHECK (char_length(code_challenge) <= 128), code_challenge_method auth.codechallengemethod, response_type auth.oauthresponsetype DEFAULT ''code''::auth.oauthresponsetype, status auth.oauth_authorization_status DEFAULT ''pending''::auth.oauth_authorization_status, authorization_code text UNIQUE CHECK (char_length(authorization_code) <= 255), created_at timestamptz DEFAULT now(), expires_at timestamptz DEFAULT (now() + ''00:03:00''::interval), approved_at timestamptz )","-- auth.schema_migrations (tracks migrations in auth schema) CREATE TABLE IF NOT EXISTS auth.schema_migrations ( version character varying PRIMARY KEY );

-- auth.audit_log_entries CREATE TABLE IF NOT EXISTS auth.audit_log_entries ( instance_id uuid, id uuid PRIMARY KEY, payload json, created_at timestamptz, ip_address character varying DEFAULT ''''::character varying );

CREATE TABLE IF NOT EXISTS auth.instances ( id uuid PRIMARY KEY, uuid uuid, raw_base_config text, created_at timestamptz, updated_at timestamptz )","CREATE TABLE IF NOT EXISTS auth.sso_domains ( id uuid PRIMARY KEY, sso_provider_id uuid, domain text NOT NULL CHECK (char_length(domain) > 0), created_at timestamptz, updated_at timestamptz )","CREATE TABLE IF NOT EXISTS auth.oauth_consents ( id uuid PRIMARY KEY, user_id uuid, client_id uuid, scopes text CHECK (char_length(scopes) <= 2048), granted_at timestamptz DEFAULT now(), revoked_at timestamptz )","-- Schema: realtime CREATE TABLE IF NOT EXISTS realtime.subscription ( id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, subscription_id uuid, entity regclass, filters realtime.user_defined_filter[] DEFAULT ''{}''::realtime.user_defined_filter[], claims jsonb, claims_role regrole DEFAULT realtime.to_regrole((claims ->> ''role''::text)), created_at timestamp DEFAULT timezone(''utc''::text, now()) );

CREATE TABLE IF NOT EXISTS realtime.schema_migrations ( version bigint PRIMARY KEY, inserted_at timestamp )","CREATE TABLE IF NOT EXISTS realtime.messages ( topic text, extension text, payload jsonb, event text, private boolean DEFAULT false, updated_at timestamp DEFAULT now(), inserted_at timestamp DEFAULT now(), id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY )","-- END OF migration.sql"}', 'complete_schema_sync', NULL, NULL, NULL),
	('20251219000900', '{"-- Migration: Harden OBAC Multi-Tenancy
-- Phase 2: Platform Authority & Bypass

-- 0. Update JWT Sync Logic to include organization_id
-- This ensures RLS policies can use auth.jwt() -> app_metadata -> organization_id efficiently.
CREATE OR REPLACE FUNCTION public.sync_rbac_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_roles JSONB;
    v_permissions JSONB;
    v_is_platform_admin BOOLEAN;
    v_org_id UUID;
BEGIN
    IF (TG_OP = ''DELETE'') THEN v_user_id := OLD.user_id; ELSE v_user_id := NEW.user_id; END IF;

    -- Collect roles
    SELECT jsonb_agg(jsonb_build_object(''role'', role_code, ''scope_type'', scope_type, ''scope_id'', scope_id, ''org_id'', org_id)) 
    INTO v_roles FROM public.rbac_assignments WHERE user_id = v_user_id;

    -- Collect permissions
    SELECT jsonb_agg(DISTINCT rp.permission_key) 
    INTO v_permissions FROM public.rbac_assignments a
    JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code AND rp.org_id = a.org_id
    WHERE a.user_id = v_user_id;

    -- Check platform admin
    v_is_platform_admin := public.is_platform_admin(v_user_id);
    
    -- Get primary organization_id
    SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = v_user_id;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, ''{}''::jsonb) || 
        jsonb_build_object(
            ''rbac_roles'', coalesce(v_roles, ''[]''::jsonb),
            ''rbac_permissions'', coalesce(v_permissions, ''[]''::jsonb),
            ''is_platform_admin'', v_is_platform_admin,
            ''organization_id'', v_org_id
        )
    WHERE id = v_user_id;
    RETURN NULL;
END;
$$","-- 1. Explicit Platform Admin Helper
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- If we''re checking the current user and have a JWT, check it first for speed
  IF _user_id = auth.uid() AND current_setting(''request.jwt.claims'', true) IS NOT NULL THEN
    v_is_admin := (auth.jwt() -> ''app_metadata'' ->> ''is_platform_admin'')::boolean;
    IF v_is_admin IS TRUE THEN RETURN TRUE; END IF;
  END IF;

  -- Reliable DB fallback
  SELECT (raw_app_meta_data ->> ''is_platform_admin'')::boolean
  INTO v_is_admin
  FROM auth.users
  WHERE id = _user_id;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- 2. Update has_permission with Short-Circuit
CREATE OR REPLACE FUNCTION public.has_permission(
  _permission_key TEXT,
  _scope_type TEXT DEFAULT NULL,
  _scope_id UUID DEFAULT NULL,
  _user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  -- PLATFORM BYPASS: Explicitly required short-circuit
  IF public.is_platform_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Standard Permission Check
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_assignments ra
    JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code AND ra.org_id = rrp.org_id
    WHERE ra.user_id = _user_id
      AND rrp.permission_key = _permission_key
      AND (
        -- Scope Resolution Logic
        _scope_type IS NULL
        OR ra.scope_type = ''GLOBAL''
        OR (ra.scope_type = _scope_type AND (_scope_id IS NULL OR ra.scope_id = _scope_id))
        OR (ra.scope_type = ''ORGANIZATION'' AND _scope_type IN (''COMPANY'', ''PROJECT''))
        OR (ra.scope_type = ''COMPANY'' AND _scope_type = ''PROJECT'')
      )
  ) INTO v_has_perm;

  RETURN v_has_perm;
END;
$$","-- 3. Standardize RLS Pattern Across Core Tables
-- We rewrite these to ensure They follow the architectural pattern:
-- (Bypass OR (Tenant Isolation AND Permission Check))

-- Ensure projects has organization_id for strict multi-tenancy
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE","UPDATE public.projects SET organization_id = ''00000000-0000-0000-0000-000000000001'' WHERE organization_id IS NULL","-- Organizations
DROP POLICY IF EXISTS \"organizations_select_policy\" ON public.organizations","CREATE POLICY \"organizations_select_policy\" ON public.organizations
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    public.has_permission(''organizations.view'', ''ORGANIZATION'', id)
)","-- Companies
DROP POLICY IF EXISTS \"companies_select_policy\" ON public.companies","CREATE POLICY \"companies_select_policy\" ON public.companies
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> ''app_metadata'' ->> ''organization_id'')::uuid 
     AND public.has_permission(''companies.view'', ''COMPANY'', id))
)","-- Projects
DROP POLICY IF EXISTS \"projects_select_policy\" ON public.projects","CREATE POLICY \"projects_select_policy\" ON public.projects
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> ''app_metadata'' ->> ''organization_id'')::uuid 
     AND public.has_permission(''projects.view'', ''PROJECT'', id))
)","-- Employees
DROP POLICY IF EXISTS \"employees_select_policy\" ON public.employees","CREATE POLICY \"employees_select_policy\" ON public.employees
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> ''app_metadata'' ->> ''organization_id'')::uuid 
     AND (
       public.has_permission(''people.view'', ''ORGANIZATION'', organization_id) OR
       (company_id IS NOT NULL AND public.has_permission(''people.view'', ''COMPANY'', company_id))
     )
    )
)","-- Pay Runs
DROP POLICY IF EXISTS \"pay_runs_select_policy\" ON public.pay_runs","CREATE POLICY \"pay_runs_select_policy\" ON public.pay_runs
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> ''app_metadata'' ->> ''organization_id'')::uuid 
     AND public.has_permission(''payroll.view'', ''ORGANIZATION'', organization_id))
)","-- RBAC Tables (Self-Management & Platform access)
ALTER TABLE public.rbac_assignments ENABLE ROW LEVEL SECURITY","DROP POLICY IF EXISTS \"Users can view their own role assignments\" ON public.rbac_assignments","DROP POLICY IF EXISTS \"rbac_assignments_select_policy\" ON public.rbac_assignments","CREATE POLICY \"rbac_assignments_select_policy\" ON public.rbac_assignments
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    user_id = auth.uid() OR
    public.has_permission(''admin.manage_users'', ''ORGANIZATION'', org_id)
)"}', 'platform_authority_bypass', NULL, NULL, NULL),
	('20251224020000', '{"-- Hardened RLS policies for Head Office components
-- Aligns with the OBAC architecture (Platform Bypass + Scope Checks)

-- 1. Helper Function to get org_id from JWT (Checking app_metadata first)
CREATE OR REPLACE FUNCTION public.get_auth_org_id() 
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> ''app_metadata'' ->> ''organization_id''),
    (auth.jwt() ->> ''organization_id''),
    (auth.jwt() ->> ''org_id'')
  )::uuid;
END;
$$ LANGUAGE plpgsql STABLE","-- 2. Standardize head_office_pay_group_members RLS
ALTER TABLE public.head_office_pay_group_members ENABLE ROW LEVEL SECURITY","DROP POLICY IF EXISTS \"View HO Membership\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Manage HO Membership\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can view pay group members for their organization\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can insert pay group members for their organization\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can update pay group members for their organization\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can delete pay group members for their organization\" ON public.head_office_pay_group_members","-- SELECT: Platform admins or users with people.view in the org
DROP POLICY IF EXISTS \"ho_membership_select_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_membership_select_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_membership_select_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_membership_select_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_membership_select_policy\" ON public.head_office_pay_group_members","CREATE POLICY \"ho_membership_select_policy\" ON public.head_office_pay_group_members
FOR SELECT TO authenticated
USING (
  public.is_platform_admin() OR
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
    AND (
      public.has_permission(''people.view'', ''ORGANIZATION'', e.organization_id) OR
      public.has_permission(''payroll.prepare'', ''ORGANIZATION'', e.organization_id)
    )
  )
)","-- ALL (Manage): Platform admins or users with payroll.prepare in the org
DROP POLICY IF EXISTS \"ho_membership_manage_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_membership_manage_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_membership_manage_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_membership_manage_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_membership_manage_policy\" ON public.head_office_pay_group_members","CREATE POLICY \"ho_membership_manage_policy\" ON public.head_office_pay_group_members
FOR ALL TO authenticated
USING (
  public.is_platform_admin() OR
  (
    public.has_permission(''payroll.prepare'', ''ORGANIZATION'', public.get_auth_org_id()) AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = head_office_pay_group_members.employee_id
      AND e.organization_id = public.get_auth_org_id()
    )
  )
)
WITH CHECK (
  public.is_platform_admin() OR
  (
    public.has_permission(''payroll.prepare'', ''ORGANIZATION'', public.get_auth_org_id()) AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = head_office_pay_group_members.employee_id
      AND e.organization_id = public.get_auth_org_id()
    )
  )
)","-- 3. Fix HO Pay Group Tables to use standard bypass/permission pattern
-- Regular
DROP POLICY IF EXISTS \"View Regular HO Paygroups\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Manage Regular HO Paygroups\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_regular_select_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_pg_regular_select_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_regular_select_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_regular_select_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_regular_select_policy\" ON public.head_office_pay_groups_regular","CREATE POLICY \"ho_pg_regular_select_policy\" ON public.head_office_pay_groups_regular
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id())","DROP POLICY IF EXISTS \"ho_pg_regular_manage_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_pg_regular_manage_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_regular_manage_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_regular_manage_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_regular_manage_policy\" ON public.head_office_pay_groups_regular","CREATE POLICY \"ho_pg_regular_manage_policy\" ON public.head_office_pay_groups_regular
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission(''payroll.prepare'', ''ORGANIZATION'', organization_id)))","-- Interns
DROP POLICY IF EXISTS \"View Intern HO Paygroups\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Manage Intern HO Paygroups\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_interns_select_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_pg_interns_select_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_interns_select_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_interns_select_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_interns_select_policy\" ON public.head_office_pay_groups_interns","CREATE POLICY \"ho_pg_interns_select_policy\" ON public.head_office_pay_groups_interns
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id())","DROP POLICY IF EXISTS \"ho_pg_interns_manage_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_pg_interns_manage_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_interns_manage_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_interns_manage_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_interns_manage_policy\" ON public.head_office_pay_groups_interns","CREATE POLICY \"ho_pg_interns_manage_policy\" ON public.head_office_pay_groups_interns
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission(''payroll.prepare'', ''ORGANIZATION'', organization_id)))","-- Expatriates
DROP POLICY IF EXISTS \"View Expatriate HO Paygroups\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Manage Expatriate HO Paygroups\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_expatriates_select_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_pg_expatriates_select_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_expatriates_select_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_expatriates_select_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_expatriates_select_policy\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"ho_pg_expatriates_select_policy\" ON public.head_office_pay_groups_expatriates
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id())","DROP POLICY IF EXISTS \"ho_pg_expatriates_manage_policy\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"ho_pg_expatriates_manage_policy\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"ho_pg_expatriates_manage_policy\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"ho_pg_expatriates_manage_policy\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"ho_pg_expatriates_manage_policy\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"ho_pg_expatriates_manage_policy\" ON public.head_office_pay_groups_expatriates
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission(''payroll.prepare'', ''ORGANIZATION'', organization_id)))"}', 'hardened_ho_rls', NULL, NULL, NULL),
	('20251224030000', '{"-- Migration to drop legacy foreign key constraints on pay_runs
-- This allows pay runs to reference pay groups from multiple source tables via pay_group_master

BEGIN","-- 1. Drop the legacy constraint identified in error messages
ALTER TABLE public.pay_runs
DROP CONSTRAINT IF EXISTS fk_pay_runs_paygroup","-- 2. Drop the standard PostgreSQL generated constraint if it exists
ALTER TABLE public.pay_runs
DROP CONSTRAINT IF EXISTS pay_runs_pay_group_id_fkey","-- 3. Ensure pay_group_id is nullable (it should be, but let''s be safe)
ALTER TABLE public.pay_runs
ALTER COLUMN pay_group_id DROP NOT NULL","-- 4. Verify/Add pay_group_master_id foreign key (linking to the unified master table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = ''pay_runs_pay_group_master_id_fkey''
  ) THEN
    ALTER TABLE public.pay_runs
    ADD CONSTRAINT pay_runs_pay_group_master_id_fkey
    FOREIGN KEY (pay_group_master_id)
    REFERENCES public.pay_group_master(id)
    ON DELETE SET NULL; -- Set NULL if the master record is deleted
  END IF;
END $$",COMMIT}', 'fix_pay_runs_fk', NULL, NULL, NULL),
	('20251224040000', '{"-- Repair Pay Group Master Synchronization (Version 2.1)
-- This migration backfills all missing pay groups from various source tables into pay_group_master
-- with correct organization_id, category, and employee_type mapping.

-- 0. Ensure organization_id exists on pay_group_master
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=''pay_group_master'' AND column_name=''organization_id'') THEN
    ALTER TABLE public.pay_group_master ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$","-- 1. Backfill from regular pay_groups (Projects Regular, Projects Daily/Monthly)
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  pay_type,
  organization_id
)
SELECT
  ''regular'' as type,
  ''pay_groups'' as source_table,
  id as source_id,
  null as code,
  name,
  country,
  ''UGX'' as currency,
  true as active,
  category,
  employee_type,
  pay_frequency,
  pay_type,
  organization_id
FROM public.pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  employee_type = EXCLUDED.employee_type,
  pay_frequency = EXCLUDED.pay_frequency,
  pay_type = EXCLUDED.pay_type,
  organization_id = EXCLUDED.organization_id","-- 2. Backfill from expatriate_pay_groups
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  organization_id
)
SELECT
  ''expatriate'' as type,
  ''expatriate_pay_groups'' as source_table,
  id as source_id,
  paygroup_id as code,
  name,
  country,
  currency,
  true as active,
  ''head_office'' as category,
  ''expatriate'' as employee_type,
  organization_id
FROM public.expatriate_pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  currency = EXCLUDED.currency,
  organization_id = EXCLUDED.organization_id","-- 3. Backfill from head_office_pay_groups_regular (The missing Raj Group)
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  organization_id
)
SELECT
  ''regular'' as type,
  ''head_office_pay_groups_regular'' as source_table,
  id as source_id,
  ''HO-REG-'' || substring(id::text from 1 for 4) as code,
  name,
  ''UG'' as country,
  ''UGX'' as currency,
  (status = ''active'') as active,
  ''head_office'' as category,
  ''regular'' as employee_type,
  pay_frequency,
  organization_id
FROM public.head_office_pay_groups_regular
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  pay_frequency = EXCLUDED.pay_frequency,
  organization_id = EXCLUDED.organization_id","-- 4. Backfill from head_office_pay_groups_interns
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  organization_id
)
SELECT
  ''intern'' as type,
  ''head_office_pay_groups_interns'' as source_table,
  id as source_id,
  ''HO-INT-'' || substring(id::text from 1 for 4) as code,
  name,
  ''UG'' as country,
  ''UGX'' as currency,
  (status = ''active'') as active,
  ''head_office'' as category,
  ''interns'' as employee_type,
  pay_frequency,
  organization_id
FROM public.head_office_pay_groups_interns
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  pay_frequency = EXCLUDED.pay_frequency,
  organization_id = EXCLUDED.organization_id","-- 5. Backfill from head_office_pay_groups_expatriates
INSERT INTO public.pay_group_master (
  type,
  source_table,
  source_id,
  code,
  name,
  country,
  currency,
  active,
  category,
  employee_type,
  pay_frequency,
  organization_id
)
SELECT
  ''expatriate'' as type,
  ''head_office_pay_groups_expatriates'' as source_table,
  id as source_id,
  ''HO-EXP-'' || substring(id::text from 1 for 4) as code,
  name,
  ''UG'' as country,
  ''USD'' as currency,
  (status = ''active'') as active,
  ''head_office'' as category,
  ''expatriate'' as employee_type,
  pay_frequency,
  organization_id
FROM public.head_office_pay_groups_expatriates
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  pay_frequency = EXCLUDED.pay_frequency,
  organization_id = EXCLUDED.organization_id"}', 'repair_pay_group_master', NULL, NULL, NULL),
	('20251224050000', '{"-- Fix missing relationship for payrun_approval_steps
-- This allows PostgREST to resolve the relationship between approval steps and user profiles

-- 1. Add foreign key from payrun_approval_steps.approver_user_id to user_profiles
-- We use user_profiles instead of auth.users because the frontend usually joins with full_name/avatar
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_approver_user_id_fkey","ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_approver_user_id_fkey
FOREIGN KEY (approver_user_id)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL","-- 2. Add foreign key for actioned_by
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_actioned_by_fkey","ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_actioned_by_fkey
FOREIGN KEY (actioned_by)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL","-- 3. Add foreign key for original_approver_id
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_original_approver_id_fkey","ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_original_approver_id_fkey
FOREIGN KEY (original_approver_id)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL","-- 4. Add foreign key for delegated_by
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_delegated_by_fkey","ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_delegated_by_fkey
FOREIGN KEY (delegated_by)
REFERENCES public.user_profiles(id)
ON DELETE SET NULL"}', 'fix_approval_steps_fk', NULL, NULL, NULL),
	('20251216143000', '{"-- Update handle_new_user to capture organization_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Try to cast the organization_id from metadata to UUID safely
  BEGIN
    org_id := (NEW.raw_user_meta_data->>''organization_id'')::UUID;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role, organization_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>''first_name'', 
    NEW.raw_user_meta_data->>''last_name'',
    COALESCE(NEW.raw_user_meta_data->>''role'', ''user''),
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    organization_id = COALESCE(public.user_profiles.organization_id, EXCLUDED.organization_id); -- Don''t overwrite if already set (though for new user it won''t be)
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER"}', 'update_trigger_org_id', NULL, NULL, NULL),
	('20251224060000', '{"-- Final fix for pay run deletion constraints
-- Ensures all dependent tables use ON DELETE CASCADE to prevent 400 Bad Request errors

-- 1. pay_calculation_audit_log
ALTER TABLE public.pay_calculation_audit_log
DROP CONSTRAINT IF EXISTS pay_calculation_audit_log_pay_run_id_fkey","ALTER TABLE public.pay_calculation_audit_log
ADD CONSTRAINT pay_calculation_audit_log_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE","-- 2. expatriate_pay_run_items
ALTER TABLE public.expatriate_pay_run_items
DROP CONSTRAINT IF EXISTS expatriate_pay_run_items_pay_run_id_fkey","ALTER TABLE public.expatriate_pay_run_items
ADD CONSTRAINT expatriate_pay_run_items_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE","-- 3. pay_items (Ensuring it''s correct)
ALTER TABLE public.pay_items
DROP CONSTRAINT IF EXISTS pay_items_pay_run_id_fkey","ALTER TABLE public.pay_items
ADD CONSTRAINT pay_items_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE","-- 4. payslip_generations (Ensuring it''s correct)
ALTER TABLE public.payslip_generations
DROP CONSTRAINT IF EXISTS payslip_generations_pay_run_id_fkey","ALTER TABLE public.payslip_generations
ADD CONSTRAINT payslip_generations_pay_run_id_fkey
FOREIGN KEY (pay_run_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE","-- 5. payrun_approval_steps (Already has it, but for completeness)
ALTER TABLE public.payrun_approval_steps
DROP CONSTRAINT IF EXISTS payrun_approval_steps_payrun_id_fkey","ALTER TABLE public.payrun_approval_steps
ADD CONSTRAINT payrun_approval_steps_payrun_id_fkey
FOREIGN KEY (payrun_id)
REFERENCES public.pay_runs(id)
ON DELETE CASCADE"}', 'fix_deletion_constraints', NULL, NULL, NULL),
	('20251224070000', '{"-- Add missing status values to pay_run_status enum
-- This prevents crashes in security triggers that reference these values

-- Use DO block to safely add enum values (if they don''t exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = ''pay_run_status'' AND e.enumlabel = ''paid'') THEN
        ALTER TYPE public.pay_run_status ADD VALUE ''paid'';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = ''pay_run_status'' AND e.enumlabel = ''completed'') THEN
        ALTER TYPE public.pay_run_status ADD VALUE ''completed'';
    END IF;
END $$","-- Update the security trigger to be more robust and include ''processed''
CREATE OR REPLACE FUNCTION public.enforce_pay_run_security()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent Deletion of protected states
  -- We include ''processed'' here because processed payrolls should be archived/locked, not deleted.
  IF (TG_OP = ''DELETE'') THEN
    IF OLD.status IN (''approved'', ''processed'', ''paid'', ''completed'') AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION ''Cannot delete a payroll that has been approved, processed, or paid. Status: %'', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- 2. Enforce Approval Authority (Status Change to Approved)
  IF (NEW.status = ''approved'' AND (OLD.status IS NULL OR OLD.status != ''approved'')) THEN
    -- Check for explicit permission
    IF NOT public.has_permission(''payroll.approve'', ''ORGANIZATION'', NEW.organization_id) THEN
      RAISE EXCEPTION ''Insufficient authority to approve payroll. Role ORG_FINANCE_CONTROLLER or equivalent required.'';
    END IF;
    
    -- Record approval event
    INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description)
    VALUES (auth.uid(), NEW.organization_id, ''PAYROLL_APPROVED'', ''PAY_RUN'', NEW.id::text, ''Payroll approved and locked.'');
  END IF;

  -- 3. Lock Data in Approved/Processed/Paid States
  -- If the status is already approved/processed/paid, only allow status updates (no data changes)
  IF (OLD.status IN (''approved'', ''processed'', ''paid'', ''completed'')) THEN
    -- Allow transition from approved to processed/paid
    IF (OLD.status = ''approved'' AND NEW.status IN (''processed'', ''paid'')) THEN
        -- OK
    ELSIF OLD.status = NEW.status THEN
        -- No data changes allowed once locked
        IF ROW(NEW.total_gross_pay, NEW.total_deductions, NEW.total_net_pay, NEW.pay_period_start, NEW.pay_period_end) 
           IS DISTINCT FROM 
           ROW(OLD.total_gross_pay, OLD.total_deductions, OLD.total_net_pay, OLD.pay_period_start, OLD.pay_period_end) 
        THEN
            RAISE EXCEPTION ''Cannot modify financial data for a locked payroll. Status: %'', OLD.status;
        END IF;
    ELSE
        -- Prevent other status regressions unless platform admin
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION ''Cannot revert status of a locked payroll. Status: % -> %'', OLD.status, NEW.status;
        END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql"}', 'fix_pay_run_status_enum', NULL, NULL, NULL),
	('20251224081000', '{"-- Standardize employee types: migrate ''local'' to ''regular''
-- This ensures that legacy pay groups are visible in the new Creation UI which filters for ''regular''

BEGIN","-- 1. Update main pay_groups table
UPDATE public.pay_groups 
SET employee_type = ''regular'' 
WHERE employee_type = ''local''","-- 2. Update pay_group_master (the unified view/table used for lookup)
UPDATE public.pay_group_master 
SET employee_type = ''regular'' 
WHERE employee_type = ''local''","-- 3. Update employees table for consistency
UPDATE public.employees 
SET employee_type = ''regular'' 
WHERE employee_type = ''local''",COMMIT}', 'migrate_local_to_regular', NULL, NULL, NULL),
	('20251224081100', '{"-- Repair pay_group_master: backfill all missing pay groups
-- This ensures that all existing REGULAR and EXPATRIATE groups are unified in the master index

BEGIN","-- 1. Backfill from public.pay_groups (Regular/Piece Rate)
INSERT INTO public.pay_group_master (
  type, 
  source_table, 
  source_id, 
  code, 
  name, 
  country, 
  currency, 
  active,
  category,
  employee_type,
  pay_frequency,
  pay_type
)
SELECT
  ''regular''::text as type,
  ''pay_groups''::text as source_table,
  id as source_id,
  NULL as code,
  name,
  country,
  ''UGX'' as currency,
  true as active,
  category,
  employee_type,
  pay_frequency,
  pay_type
FROM public.pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  category = EXCLUDED.category,
  employee_type = EXCLUDED.employee_type,
  pay_frequency = EXCLUDED.pay_frequency,
  pay_type = EXCLUDED.pay_type","-- 2. Backfill from public.expatriate_pay_groups
INSERT INTO public.pay_group_master (
  type, 
  source_table, 
  source_id, 
  code, 
  name, 
  country, 
  currency, 
  active,
  category,
  employee_type,
  pay_frequency
)
SELECT
  ''expatriate''::text as type,
  ''expatriate_pay_groups''::text as source_table,
  id as source_id,
  paygroup_id as code,
  name,
  country,
  currency,
  true as active,
  COALESCE(
    CASE 
      WHEN name ILIKE ''%head office%'' OR name ILIKE ''%head%'' THEN ''head_office''
      WHEN name ILIKE ''%project%'' THEN ''projects''
    END,
    ''head_office''
  ) as category,
  ''expatriate'' as employee_type,
  NULL as pay_frequency
FROM public.expatriate_pay_groups
ON CONFLICT (type, source_table, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  category = EXCLUDED.category,
  employee_type = EXCLUDED.employee_type,
  code = EXCLUDED.code",COMMIT}', 'repair_pay_group_master', NULL, NULL, NULL),
	('20251229120000', '{"-- ==========================================================
-- PAYROLL APPROVAL ENHANCEMENTS MIGRATION
-- Extends existing approval workflow infrastructure with:
-- - Global approval toggle
-- - Approval scopes (which payroll actions require approval)
-- - Approver type selection (role vs individual vs hybrid)
-- - Workflow versioning for audit safety
-- - Override tracking
-- ==========================================================

-- 1. Extend org_settings table with new approval fields
DO $$
BEGIN
    -- Add payroll_approvals_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''org_settings''
        AND column_name = ''payroll_approvals_enabled''
    ) THEN
        ALTER TABLE public.org_settings
        ADD COLUMN payroll_approvals_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Add approvals_enabled_scopes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''org_settings''
        AND column_name = ''approvals_enabled_scopes''
    ) THEN
        ALTER TABLE public.org_settings
        ADD COLUMN approvals_enabled_scopes JSONB DEFAULT ''[]''::jsonb;
    END IF;
END $$","COMMENT ON COLUMN public.org_settings.payroll_approvals_enabled IS ''Global toggle to enable/disable payroll approvals for the organization''","COMMENT ON COLUMN public.org_settings.approvals_enabled_scopes IS ''Array of payroll action scopes that require approval: payroll_run_creation, payroll_run_finalization, payroll_reruns, payroll_adjustments, payroll_overrides, backdated_changes''","-- 2. Extend approval_workflows table with scope and versioning
DO $$
BEGIN
    -- Add applies_to_scopes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''approval_workflows''
        AND column_name = ''applies_to_scopes''
    ) THEN
        ALTER TABLE public.approval_workflows
        ADD COLUMN applies_to_scopes JSONB DEFAULT ''[]''::jsonb;
    END IF;

    -- Add version column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''approval_workflows''
        AND column_name = ''version''
    ) THEN
        ALTER TABLE public.approval_workflows
        ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$","COMMENT ON COLUMN public.approval_workflows.applies_to_scopes IS ''Array of payroll action scopes this workflow covers''","COMMENT ON COLUMN public.approval_workflows.version IS ''Workflow version number, incremented on each edit''","-- 3. Extend approval_workflow_steps table with approver type fields
DO $$
BEGIN
    -- Add approver_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''approval_workflow_steps''
        AND column_name = ''approver_type''
    ) THEN
        ALTER TABLE public.approval_workflow_steps
        ADD COLUMN approver_type TEXT CHECK (approver_type IN (''role'', ''individual'', ''hybrid'')) DEFAULT ''role'';
    END IF;

    -- Add fallback_user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''approval_workflow_steps''
        AND column_name = ''fallback_user_id''
    ) THEN
        ALTER TABLE public.approval_workflow_steps
        ADD COLUMN fallback_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$","COMMENT ON COLUMN public.approval_workflow_steps.approver_type IS ''How approver is selected: role (position-based), individual (specific user), hybrid (role with individual fallback)''","COMMENT ON COLUMN public.approval_workflow_steps.fallback_user_id IS ''Fallback user for hybrid approver type when role has no assignee''","-- 4. Extend payrun_approval_steps table with override and versioning fields
DO $$
BEGIN
    -- Add workflow_version column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''payrun_approval_steps''
        AND column_name = ''workflow_version''
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN workflow_version INTEGER;
    END IF;

    -- Add override tracking columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''payrun_approval_steps''
        AND column_name = ''override_reason''
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN override_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''payrun_approval_steps''
        AND column_name = ''override_by''
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN override_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''payrun_approval_steps''
        AND column_name = ''override_at''
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN override_at TIMESTAMPTZ;
    END IF;
END $$","COMMENT ON COLUMN public.payrun_approval_steps.workflow_version IS ''Snapshot of workflow version used for this approval instance''","COMMENT ON COLUMN public.payrun_approval_steps.override_reason IS ''Mandatory reason if approval was overridden''","COMMENT ON COLUMN public.payrun_approval_steps.override_by IS ''User who performed the override (Super Admin or Tenant Admin)''","COMMENT ON COLUMN public.payrun_approval_steps.override_at IS ''Timestamp when override was performed''","-- 5. Create approval_workflow_versions table for audit trail
CREATE TABLE IF NOT EXISTS public.approval_workflow_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    workflow_snapshot JSONB NOT NULL, -- Complete snapshot of workflow and steps
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(workflow_id, version)
)","COMMENT ON TABLE public.approval_workflow_versions IS ''Historical versions of workflows for audit trail and in-flight approval protection''","COMMENT ON COLUMN public.approval_workflow_versions.workflow_snapshot IS ''Complete JSON snapshot of workflow configuration and all steps at this version''","-- 6. Enable RLS on workflow_versions table
ALTER TABLE public.approval_workflow_versions ENABLE ROW LEVEL SECURITY","-- RLS Policy: Read by org members
DROP POLICY IF EXISTS \"Workflow Versions Readable by Org Members\" ON public.approval_workflow_versions","DROP POLICY IF EXISTS \"Workflow Versions Readable by Org Members\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Workflow Versions Readable by Org Members\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Workflow Versions Readable by Org Members\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Workflow Versions Readable by Org Members\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Workflow Versions Readable by Org Members\"
ON public.approval_workflow_versions FOR SELECT TO authenticated
USING (
    workflow_id IN (
        SELECT id FROM public.approval_workflows WHERE org_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    )
)","-- RLS Policy: Insert by admins (created via trigger)
DROP POLICY IF EXISTS \"Workflow Versions Managed by Admins\" ON public.approval_workflow_versions","DROP POLICY IF EXISTS \"Workflow Versions Managed by Admins\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Workflow Versions Managed by Admins\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Workflow Versions Managed by Admins\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Workflow Versions Managed by Admins\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Workflow Versions Managed by Admins\"
ON public.approval_workflow_versions FOR INSERT TO authenticated
WITH CHECK (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
)","-- 7. Create trigger function to create workflow version snapshot
CREATE OR REPLACE FUNCTION public.create_workflow_version_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create version snapshot on UPDATE that actually changes workflow
    IF (TG_OP = ''UPDATE'' AND OLD.version = NEW.version) THEN
        RETURN NEW;
    END IF;
    
    -- Create snapshot of current workflow with all steps
    INSERT INTO public.approval_workflow_versions (
        workflow_id,
        version,
        workflow_snapshot,
        created_by
    )
    SELECT 
        NEW.id,
        NEW.version,
        jsonb_build_object(
            ''workflow'', row_to_json(NEW)::jsonb,
            ''steps'', (
                SELECT jsonb_agg(row_to_json(steps))
                FROM public.approval_workflow_steps steps
                WHERE steps.workflow_id = NEW.id
            )
        ),
        auth.uid()
    ON CONFLICT (workflow_id, version) DO NOTHING;
    
    RETURN NEW;
END;
$$","-- 8. Attach trigger to approval_workflows table
DROP TRIGGER IF EXISTS tr_workflow_version_snapshot ON public.approval_workflows","CREATE TRIGGER tr_workflow_version_snapshot
AFTER INSERT OR UPDATE ON public.approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.create_workflow_version_snapshot()","-- 9. Update status check constraint to include ''approved_overridden''
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE public.payrun_approval_steps 
    DROP CONSTRAINT IF EXISTS payrun_approval_steps_status_check;
    
    -- Add updated constraint with new status
    ALTER TABLE public.payrun_approval_steps
    ADD CONSTRAINT payrun_approval_steps_status_check
    CHECK (status IN (''pending'', ''approved'', ''rejected'', ''skipped'', ''approved_overridden''));
END $$","-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON public.org_settings(organization_id)","CREATE INDEX IF NOT EXISTS idx_approval_workflows_org_scopes ON public.approval_workflows USING GIN(applies_to_scopes)","CREATE INDEX IF NOT EXISTS idx_workflow_steps_approver_type ON public.approval_workflow_steps(approver_type)","CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON public.approval_workflow_versions(workflow_id)","CREATE INDEX IF NOT EXISTS idx_payrun_steps_status ON public.payrun_approval_steps(status)","CREATE INDEX IF NOT EXISTS idx_payrun_steps_override_by ON public.payrun_approval_steps(override_by) WHERE override_by IS NOT NULL","-- Migration complete"}', 'payroll_approval_enhancements', NULL, NULL, NULL),
	('20251229155200', '{"-- ==========================================================
-- FLEXIBLE PER-TYPE PAYROLL APPROVALS MIGRATION
-- ==========================================================

-- 1. Create payroll_approval_configs table
CREATE TABLE IF NOT EXISTS public.payroll_approval_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
)","COMMENT ON TABLE public.payroll_approval_configs IS ''Configuration for specific payroll streams/types (e.g., Head Office, Manpower)''","-- 2. Create payroll_approval_categories (Join Table with Unique Category constraint)
CREATE TABLE IF NOT EXISTS public.payroll_approval_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID NOT NULL REFERENCES public.payroll_approval_configs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL UNIQUE REFERENCES public.employee_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
)","COMMENT ON TABLE public.payroll_approval_categories IS ''Maps employee categories to a specific approval configuration. Category ID is UNIQUE to prevent overlap.''","-- 3. Enable RLS
ALTER TABLE public.payroll_approval_configs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.payroll_approval_categories ENABLE ROW LEVEL SECURITY","-- 4. RLS Policies for payroll_approval_configs
DROP POLICY IF EXISTS \"Configs are viewable by org members\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Configs are viewable by org members\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Configs are viewable by org members\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Configs are viewable by org members\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Configs are viewable by org members\" ON public.payroll_approval_configs","CREATE POLICY \"Configs are viewable by org members\" ON public.payroll_approval_configs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
    )","DROP POLICY IF EXISTS \"Configs are manageable by admins\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Configs are manageable by admins\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Configs are manageable by admins\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Configs are manageable by admins\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Configs are manageable by admins\" ON public.payroll_approval_configs","CREATE POLICY \"Configs are manageable by admins\" ON public.payroll_approval_configs
    FOR ALL USING (
        public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
    )","-- 5. RLS Policies for payroll_approval_categories
DROP POLICY IF EXISTS \"Categories mapping viewable by org members\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Categories mapping viewable by org members\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Categories mapping viewable by org members\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Categories mapping viewable by org members\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Categories mapping viewable by org members\" ON public.payroll_approval_categories","CREATE POLICY \"Categories mapping viewable by org members\" ON public.payroll_approval_categories
    FOR SELECT USING (
        config_id IN (
            SELECT id FROM public.payroll_approval_configs WHERE organization_id IN (
                SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    )","DROP POLICY IF EXISTS \"Categories mapping manageable by admins\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Categories mapping manageable by admins\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Categories mapping manageable by admins\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Categories mapping manageable by admins\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Categories mapping manageable by admins\" ON public.payroll_approval_categories","CREATE POLICY \"Categories mapping manageable by admins\" ON public.payroll_approval_categories
    FOR ALL USING (
        config_id IN (
            SELECT id FROM public.payroll_approval_configs WHERE organization_id IN (
                SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
        ) AND (
            public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
        )
    )","-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_payroll_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql","CREATE TRIGGER tr_payroll_approval_configs_updated_at
    BEFORE UPDATE ON public.payroll_approval_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_config_updated_at()","-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_approval_configs_org ON public.payroll_approval_configs(organization_id)","CREATE INDEX IF NOT EXISTS idx_payroll_approval_categories_config ON public.payroll_approval_categories(config_id)"}', 'flexible_payroll_approvals', NULL, NULL, NULL),
	('20250112000000', '{"-- Add date_joined field to employees table
-- This tracks when the employee joined the organization (separate from created_at which tracks when record was added)

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_joined DATE","-- Add comment for documentation
COMMENT ON COLUMN public.employees.date_joined IS ''Date when employee joined the organization (separate from created_at which is when record was added)''","-- Add index for querying by join date
CREATE INDEX IF NOT EXISTS idx_employees_date_joined ON public.employees(date_joined)"}', 'add_employee_date_fields', NULL, NULL, NULL),
	('20251029132330', '{"-- Create a master index for all pay-group types
CREATE TABLE IF NOT EXISTS public.pay_group_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (''regular'',''expatriate'',''contractor'',''intern'')),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  code text UNIQUE,
  name text NOT NULL,
  country text,
  currency text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, source_table, source_id)
);

-- Add type column to pay_groups if it doesn''t exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=''pay_groups'' AND column_name=''type'') THEN
    ALTER TABLE public.pay_groups ADD COLUMN type text CHECK (type IN (''regular'',''expatriate'',''contractor'',''intern''));
  END IF;
END $$;

-- Seed master with existing REGULAR groups from pay_groups
INSERT INTO public.pay_group_master (type, source_table, source_id, code, name, country, currency, active)
SELECT
  ''regular''::text, ''pay_groups''::text, pg.id, null::text, pg.name, pg.country, null::text, true
FROM public.pay_groups pg
ON CONFLICT (type, source_table, source_id) DO NOTHING;

-- Seed master with existing EXPATRIATE groups
INSERT INTO public.pay_group_master (type, source_table, source_id, code, name, country, currency, active)
SELECT
  ''expatriate''::text, ''expatriate_pay_groups''::text, epg.id, epg.paygroup_id, epg.name, epg.country, epg.currency, true
FROM public.expatriate_pay_groups epg
ON CONFLICT (type, source_table, source_id) DO NOTHING;

-- Add new columns on pay_runs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=''pay_runs'' AND column_name=''pay_group_master_id'') THEN
    ALTER TABLE public.pay_runs ADD COLUMN pay_group_master_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=''pay_runs'' AND column_name=''payroll_type'') THEN
    ALTER TABLE public.pay_runs ADD COLUMN payroll_type text CHECK (payroll_type IN (''regular'',''expatriate'',''contractor'',''intern''));
  END IF;
END $$;

-- Backfill pay_runs.pay_group_master_id for regular pay runs
UPDATE public.pay_runs pr
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pgm.type = ''regular'' 
  AND pgm.source_table = ''pay_groups'' 
  AND pgm.source_id = pr.pay_group_id
  AND pr.pay_group_master_id IS NULL;

-- Backfill for expatriate pay runs
UPDATE public.pay_runs pr
SET pay_group_master_id = pgm.id
FROM public.pay_group_master pgm
WHERE pgm.type = ''expatriate'' 
  AND pgm.source_table = ''expatriate_pay_groups''
  AND (pgm.source_id = pr.pay_group_id OR pgm.code = pr.pay_group_id::text)
  AND pr.pay_group_master_id IS NULL;

-- Add foreign key constraint (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ''pay_runs_pay_group_master_id_fkey'') THEN
    ALTER TABLE public.pay_runs
      ADD CONSTRAINT pay_runs_pay_group_master_id_fkey
      FOREIGN KEY (pay_group_master_id)
      REFERENCES public.pay_group_master(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pay_group_master_type_active ON public.pay_group_master(type, active);
CREATE INDEX IF NOT EXISTS idx_pay_runs_master ON public.pay_runs(pay_group_master_id);
CREATE INDEX IF NOT EXISTS idx_pay_runs_payroll_type ON public.pay_runs(payroll_type);

-- Enable RLS
ALTER TABLE public.pay_group_master ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS pgm_select ON public.pay_group_master;
CREATE POLICY pgm_select ON public.pay_group_master FOR SELECT USING (true);"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20251229170000', '{"-- ==========================================================
-- 🛠️ FIX: RLS INFINITE RECURSION
-- ==========================================================
-- Migration: 20251229170000_fix_rls_recursion.sql
-- Purpose: 
-- 1. Redefine security helpers as LANGUAGE plpgsql to prevent inlining.
-- 2. Replace recursive subqueries in policies with safe helper calls.

-- 1. Redefine security helpers as LANGUAGE plpgsql (PREVENTS INLINING)
-- These must be SECURITY DEFINER to bypass RLS when checking roles.
-- We set search_path to public for security.

CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = ''super_admin''
  );
END;
$$","CREATE OR REPLACE FUNCTION public.check_is_org_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role IN (''super_admin'', ''organization_admin'') 
  );
END;
$$","CREATE OR REPLACE FUNCTION public.check_is_org_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role IN (''super_admin'', ''organization_admin'', ''payroll_manager'') 
  );
END;
$$","-- 2. Update recursive policies on public.users
-- We drop and recreate them to use the safe helpers.

DROP POLICY IF EXISTS \"Super admins can view all users\" ON public.users","DROP POLICY IF EXISTS \"Super admins can view all users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Super admins can view all users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Super admins can view all users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Super admins can view all users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Super admins can view all users\" ON public.users","CREATE POLICY \"Super admins can view all users\" ON public.users
    FOR ALL TO authenticated
    USING (public.check_is_super_admin(auth.uid()))","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.users","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.users","CREATE POLICY \"Organization admins can view organization users\" ON public.users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users u1
            WHERE u1.id = auth.uid() 
            AND u1.role = ''organization_admin''
            AND u1.organization_id = public.users.organization_id
        )
    )","-- Wait, the second one above is still recursive if it queries public.users!
-- Let''s use a helper for org_id too.

CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.users WHERE id = user_id);
END;
$$","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.users","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Organization admins can view organization users\" ON public.users","CREATE POLICY \"Organization admins can view organization users\" ON public.users
    FOR SELECT TO authenticated
    USING (
        (public.check_is_org_super_admin(auth.uid()) AND organization_id = public.get_user_organization_id(auth.uid()))
    )","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.users","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.users","CREATE POLICY \"Department managers can view department users\" ON public.users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users u1
            WHERE u1.id = auth.uid() 
            AND u1.role = ''payroll_manager''
            AND u1.department_id = public.users.department_id
        )
    )","-- Still potentially recursive. Let''s make it fully safe.

CREATE OR REPLACE FUNCTION public.get_user_department_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT department_id FROM public.users WHERE id = user_id);
END;
$$","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.users","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.users","CREATE POLICY \"Department managers can view department users\" ON public.users
    FOR SELECT TO authenticated
    USING (
        (public.check_is_org_admin(auth.uid()) AND department_id = public.get_user_department_id(auth.uid()))
    )","-- 3. Verify other tables that might have inherited the legacy LANGUAGE sql helpers
-- The helpers are CREATE OR REPLACE, so they are already updated globally.

-- 4. Final Audit
COMMENT ON FUNCTION public.check_is_super_admin(uuid) IS ''Safe RLS helper (plpgsql) to check super_admin role without recursion.''","COMMENT ON FUNCTION public.get_user_organization_id(uuid) IS ''Safe RLS helper to get user organization without recursion.''"}', 'fix_rls_recursion', NULL, NULL, NULL),
	('20251229180000', '{"-- ==========================================================
-- 🛠️ FIX: UNIFY LEGACY AND OBAC PERMISSIONS
-- ==========================================================
-- Migration: 20251229180000_unify_permission_checks.sql
-- Purpose: 
-- Update RLS helper functions to check BOTH legacy public.users roles
-- AND the new public.rbac_assignments to ensure users are correctly authorized.

-- 1. check_is_super_admin
-- Checks for legacy ''super_admin'' OR OBAC ''PLATFORM_SUPER_ADMIN''
CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Role
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role = ''super_admin''
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Role
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id AND role_code = ''PLATFORM_SUPER_ADMIN''
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$","-- 2. check_is_org_super_admin
-- Checks for legacy ''super_admin''/''organization_admin'' OR OBAC ''PLATFORM_SUPER_ADMIN''/''ORG_ADMIN''
CREATE OR REPLACE FUNCTION public.check_is_org_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Roles
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role IN (''super_admin'', ''organization_admin'') 
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id AND role_code IN (''PLATFORM_SUPER_ADMIN'', ''ORG_ADMIN'')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$","-- 3. check_is_org_admin (General Admin + Payroll Manager)
CREATE OR REPLACE FUNCTION public.check_is_org_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Roles
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role IN (''super_admin'', ''organization_admin'', ''payroll_manager'') 
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id 
    AND role_code IN (''PLATFORM_SUPER_ADMIN'', ''ORG_ADMIN'', ''ORG_FINANCE_CONTROLLER'', ''COMPANY_PAYROLL_ADMIN'')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$","COMMENT ON FUNCTION public.check_is_super_admin(uuid) IS ''Checks for Global Admin privileges in both legacy (users) and modern (OBAC) systems.''","COMMENT ON FUNCTION public.check_is_org_super_admin(uuid) IS ''Checks for Org Admin privileges in both legacy and modern systems.''"}', 'unify_permission_checks', NULL, NULL, NULL),
	('20251229190000', '{"-- ==========================================================
-- 🛠️ FIX: RBAC READ PERMISSIONS
-- ==========================================================
-- Migration: 20251229190000_fix_rbac_read_policy.sql
-- Purpose: 
-- Allow users to read their own entries in public.rbac_assignments.
-- Without this, the frontend cannot verify if a user has an admin role,
-- causing valid admins to be treated as standard users.

-- 1. Enable RLS (just in case)
ALTER TABLE public.rbac_assignments ENABLE ROW LEVEL SECURITY","-- 2. Policy: Users can read own assignments
DROP POLICY IF EXISTS \"Users can read own rbac assignments\" ON public.rbac_assignments","DROP POLICY IF EXISTS \"Users can read own rbac assignments\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can read own rbac assignments\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Users can read own rbac assignments\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Users can read own rbac assignments\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Users can read own rbac assignments\" ON public.rbac_assignments","CREATE POLICY \"Users can read own rbac assignments\" ON public.rbac_assignments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid())","-- 3. Policy: Super Admins can view all assignments
-- We use the safe PL/PGSQL helper we defined earlier.
DROP POLICY IF EXISTS \"Super admins can view all rbac assignments\" ON public.rbac_assignments","DROP POLICY IF EXISTS \"Super admins can view all rbac assignments\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Super admins can view all rbac assignments\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Super admins can view all rbac assignments\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Super admins can view all rbac assignments\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Super admins can view all rbac assignments\" ON public.rbac_assignments","CREATE POLICY \"Super admins can view all rbac assignments\" ON public.rbac_assignments
    FOR ALL TO authenticated
    USING (public.check_is_super_admin(auth.uid()))","-- 4. Policy: Org Admins can view assignments in their org?
-- rbac_assignments doesn''t have org_id directly, it links to users or just has user_id.
-- For now, letting users read their own is sufficient for the frontend check.

-- 5. Fallback for user_roles (Legacy)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY","DROP POLICY IF EXISTS \"Users can read own legacy role\" ON public.user_roles","DROP POLICY IF EXISTS \"Users can read own legacy role\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Users can read own legacy role\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Users can read own legacy role\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Users can read own legacy role\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Users can read own legacy role\" ON public.user_roles","CREATE POLICY \"Users can read own legacy role\" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid())"}', 'fix_rbac_read_policy', NULL, NULL, NULL),
	('20251229200000', '{"-- ==========================================================
-- 🛠️ FIX: MISSING APPROVAL CONFIG TABLES
-- ==========================================================
-- Migration: 20251229200000_create_approval_configs.sql
-- Purpose: 
-- Create the missing `payroll_approval_configs` and `payroll_approval_categories`
-- tables which are required by the frontend but were missing from previous migrations.

-- 1. Create payroll_approval_configs table
CREATE TABLE IF NOT EXISTS public.payroll_approval_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL, -- Logical link, no foreign key to users/orgs to avoid strict dependency issues if org table varies
    name TEXT NOT NULL,
    description TEXT,
    workflow_id UUID REFERENCES public.approval_workflows(id),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
)","-- 2. Create payroll_approval_categories table (Junction table for employee categories)
CREATE TABLE IF NOT EXISTS public.payroll_approval_categories (
    config_id UUID REFERENCES public.payroll_approval_configs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL, -- Links to employee_categories.id
    PRIMARY KEY (config_id, category_id)
)","-- 3. Enable RLS
ALTER TABLE public.payroll_approval_configs ENABLE ROW LEVEL SECURITY","ALTER TABLE public.payroll_approval_categories ENABLE ROW LEVEL SECURITY","-- 4. RLS Policies

-- Policy: Read by org members (Configs)
DROP POLICY IF EXISTS \"Configs Readable by Org Members\" ON public.payroll_approval_configs","DROP POLICY IF EXISTS \"Configs Readable by Org Members\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Configs Readable by Org Members\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Configs Readable by Org Members\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Configs Readable by Org Members\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Configs Readable by Org Members\"
ON public.payroll_approval_configs FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
)","-- Policy: Manage by Admins (Configs)
DROP POLICY IF EXISTS \"Configs Managed by Admins\" ON public.payroll_approval_configs","DROP POLICY IF EXISTS \"Configs Managed by Admins\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Configs Managed by Admins\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Configs Managed by Admins\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Configs Managed by Admins\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Configs Managed by Admins\"
ON public.payroll_approval_configs FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
)","-- Policy: Read by org members (Categories) - Cascades from Configs usually, but easier to set direct check
DROP POLICY IF EXISTS \"Categories Readable by Org Members\" ON public.payroll_approval_categories","DROP POLICY IF EXISTS \"Categories Readable by Org Members\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Categories Readable by Org Members\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Categories Readable by Org Members\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Categories Readable by Org Members\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Categories Readable by Org Members\"
ON public.payroll_approval_categories FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.payroll_approval_configs c
        WHERE c.id = config_id
        AND c.organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            UNION
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    )
)","-- Policy: Manage by Admins (Categories)
DROP POLICY IF EXISTS \"Categories Managed by Admins\" ON public.payroll_approval_categories","DROP POLICY IF EXISTS \"Categories Managed by Admins\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Categories Managed by Admins\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Categories Managed by Admins\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Categories Managed by Admins\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Categories Managed by Admins\"
ON public.payroll_approval_categories FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
)","-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_approval_configs_org ON public.payroll_approval_configs(organization_id)","CREATE INDEX IF NOT EXISTS idx_approval_categories_cat ON public.payroll_approval_categories(category_id)"}', 'create_approval_configs', NULL, NULL, NULL),
	('20251229210000', '{"-- Migration: Add ''rejected'' to pay_run_status enum
-- Timestamp: 20251230100000
-- Description: Adds ''rejected'' status to support payrun rejection and resubmission workflows.

ALTER TYPE public.pay_run_status ADD VALUE IF NOT EXISTS ''rejected''"}', 'add_rejected_status', NULL, NULL, NULL),
	('20251230090000', '{"-- Migration: Update Payrun Approval Trigger for Per-Type Logic
-- This updates submit_payrun_for_approval to resolve workflows based on payroll type configurations.

CREATE OR REPLACE FUNCTION public.submit_payrun_for_approval(payrun_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_workflow_id uuid;
    v_step RECORD;
    v_org_id uuid;
    v_next_approver_id uuid;
    v_config_id uuid;
    v_is_enabled boolean;
    v_wf_id uuid;
    v_global_enabled boolean;
BEGIN
    -- 1. Validation
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.id IS NULL THEN
        RAISE EXCEPTION ''Payrun not found'';
    END IF;
    
    -- Check Status (must be draft or rejected to resubmit)
    IF v_payrun.status NOT IN (''draft'', ''rejected'') AND v_payrun.approval_status NOT IN (''draft'', ''rejected'') THEN
         RAISE EXCEPTION ''Payrun must be in draft or rejected status to submit. Current status: %'', v_payrun.status;
    END IF;
    
    -- 2. Find Organization ID
    SELECT organization_id INTO v_org_id 
    FROM public.pay_groups 
    WHERE id = v_payrun.pay_group_id;

    IF v_org_id IS NULL THEN
        -- Fallback to auth user org if pay_group link fails
        SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = auth.uid();
    END IF;

    -- 3. Resolve Approval Configuration
    -- Logic: Find a config matching the payrun''s sub_type or category
    -- pac.workflow_id is the workflow linked to this config
    SELECT pac.id, pac.workflow_id, pac.is_enabled INTO v_config_id, v_wf_id, v_is_enabled
    FROM public.payroll_approval_configs pac
    JOIN public.payroll_approval_categories pbc ON pbc.config_id = pac.id
    JOIN public.employee_categories ec ON ec.id = pbc.category_id
    WHERE pac.organization_id = v_org_id
      AND (
          ec.key = v_payrun.sub_type -- Primary match: specific type (e.g., manpower)
          OR (v_payrun.sub_type IS NULL AND ec.key = v_payrun.category) -- Fallback: main category (e.g., head_office)
      )
      AND pac.is_enabled = true
    LIMIT 1;

    -- 4. Check Global Override
    SELECT payroll_approvals_enabled INTO v_global_enabled 
    FROM public.org_settings 
    WHERE organization_id = v_org_id;

    -- 5. Determine if workflow is required
    IF v_global_enabled = false THEN
        -- Approvals globally disabled
        v_workflow_id := NULL;
    ELSIF v_config_id IS NOT NULL THEN
        -- Specific config found
        IF v_is_enabled = true THEN
            v_workflow_id := v_wf_id;
        ELSE
            -- Specifically disabled for this type
            v_workflow_id := NULL;
        END IF;
    ELSE
        -- No specific config found for this type.
        -- Per plan, we skip approval for types without a config.
        v_workflow_id := NULL;
    END IF;

    -- 6. Instant Approval Case
    IF v_workflow_id IS NULL THEN
        UPDATE public.pay_runs
        SET 
            approval_status = ''approved'',
            status = ''approved'', -- Sync both
            approval_current_level = NULL,
            approval_submitted_at = now(),
            approval_submitted_by = auth.uid(),
            approval_last_action_at = now(),
            approved_at = now(),
            approved_by = auth.uid()
        WHERE id = payrun_id_input;

        RETURN jsonb_build_object(''success'', true, ''status'', ''auto_approved'');
    END IF;
    
    -- 7. Start Approval Workflow
    -- Clear existing steps if any (resubmit logic)
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    -- Clone Steps from the resolved workflow
    FOR v_step IN 
        SELECT * FROM public.approval_workflow_steps 
        WHERE workflow_id = v_workflow_id 
        ORDER BY level ASC 
    LOOP
        INSERT INTO public.payrun_approval_steps (
            payrun_id,
            level,
            approver_user_id,
            approver_role,
            status
        ) VALUES (
            payrun_id_input,
            v_step.level,
            v_step.approver_user_id,
            v_step.approver_role,
            ''pending''
        );
        
        IF v_step.level = 1 THEN
            v_next_approver_id := v_step.approver_user_id;
        END IF;
    END LOOP;
    
    -- 8. Update Payrun Status to Pending
    UPDATE public.pay_runs
    SET 
        approval_status = ''pending_approval'',
        status = ''pending_approval'',
        approval_current_level = 1,
        approval_submitted_at = now(),
        approval_submitted_by = auth.uid(),
        approval_last_action_at = now(),
        -- Clear previous approval info
        approved_at = NULL,
        approved_by = NULL
    WHERE id = payrun_id_input;
    
    -- 9. Notify First Approver
    IF v_next_approver_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id, type, title, message, metadata
        ) VALUES (
            v_next_approver_id,
            ''approval_request'',
            ''Payrun Approval Required'',
            ''A payrun requires your approval (Level 1).'',
            jsonb_build_object(''payrun_id'', payrun_id_input, ''type'', ''payroll_approval'')
        );
    END IF;

    RETURN jsonb_build_object(
        ''success'', true, 
        ''status'', ''submitted'', 
        ''next_approver'', v_next_approver_id, 
        ''workflow_id'', v_workflow_id
    );
END;
$$"}', 'update_submit_payrun_rpc', NULL, NULL, NULL),
	('20260103130000', '{"-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net","-- Enable trigger on notifications table for email delivery
DROP TRIGGER IF EXISTS tr_email_notification ON public.notifications","-- We reuse the existing trigger_email_handler function from 20251215143000_email_triggers.sql
-- This function sends the payload to the Edge Function via pg_net.http_post
CREATE TRIGGER tr_email_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.type IN (''approval_request'', ''security_alert'', ''account_locked''))
EXECUTE FUNCTION public.trigger_email_handler()","-- Comment: Ensure the trigger_approval_email Edge Function is deployed and configured.
-- The Edge Function has been updated in source code to handle ''notifications'' table payloads."}', 'enable_notification_email_trigger', NULL, NULL, NULL),
	('20260103160000', '{"-- Wrapped Trigger Handler for Backward Compatibility
-- This migration updates the trigger function to rewrite ''notifications'' payloads 
-- into ''payrun_approval_steps'' payloads so the existing (outdated) Edge Function
-- will process them as emails without needing a redeployment.

CREATE OR REPLACE FUNCTION public.trigger_email_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url text;
    v_payload jsonb;
BEGIN
    -- This URL points to the Cloud Edge Function
    v_url := ''https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/trigger-approval-email'';
    
    -- Construct Payload
    IF TG_TABLE_NAME = ''notifications'' AND NEW.type = ''approval_request'' THEN
        -- TRANSFORM to mock ''payrun_approval_steps'' payload
        -- Use json_build_object to construct the record as the Edge Function expects it
        v_payload := jsonb_build_object(
            ''type'', ''INSERT'',
            ''table'', ''payrun_approval_steps'',
            ''schema'', TG_TABLE_SCHEMA,
            ''record'', jsonb_build_object(
                ''status'', ''pending'',
                ''approver_user_id'', NEW.user_id,
                ''payrun_id'', (NEW.metadata->>''payrun_id'')::uuid
            ),
            ''old_record'', null
        );
    ELSE
        -- STANDARD generic payload for other tables (pay_runs, payrun_approval_steps)
        v_payload := jsonb_build_object(
            ''type'', TG_OP,
            ''table'', TG_TABLE_NAME,
            ''schema'', TG_TABLE_SCHEMA,
            ''record'', row_to_json(NEW),
            ''old_record'', CASE WHEN TG_OP = ''UPDATE'' THEN row_to_json(OLD) ELSE null END
        );
    END IF;

    -- Call Edge Function via pg_net
    -- We assume pg_net is enabled (checked in previous migration)
    
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            ''Content-Type'', ''application/json'',
            ''Authorization'', ''Bearer '' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''service_role_key'' LIMIT 1) 
        ),
        body := v_payload
    );

    RETURN NEW;
END;
$$"}', 'wrap_email_trigger', NULL, NULL, NULL),
	('20260308125418', '{"-- Add missing columns to user_management_profiles
ALTER TABLE public.user_management_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT;

-- Fix stuck invitation for already-confirmed user (tadong was confirmed but accept never ran)
UPDATE public.user_management_invitations
SET status = ''accepted'', accepted_at = now()
WHERE email = ''tadong@flipafrica.app'' AND status = ''pending'';"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20260308151215', '{"-- ─── Add missing unique constraints ─────────────────────────────────────────
ALTER TABLE public.rbac_permissions
  ADD CONSTRAINT rbac_permissions_key_unique UNIQUE (key);

ALTER TABLE public.rbac_roles
  ADD CONSTRAINT rbac_roles_code_unique UNIQUE (code);

ALTER TABLE public.rbac_role_permissions
  ADD CONSTRAINT rbac_role_permissions_unique UNIQUE (role_code, permission_key, org_id);

-- ─── Seed Predefined Permissions ─────────────────────────────────────────────
INSERT INTO public.rbac_permissions (key, category, description)
VALUES
  (''view_dashboard'',             ''Dashboard'', ''Access the main dashboard''),
  (''manage_users'',               ''Users'',     ''Create, update, and delete users''),
  (''assign_roles'',               ''Users'',     ''Assign roles to users''),
  (''manage_paygroups'',           ''Payroll'',   ''Create and modify pay groups''),
  (''manage_earnings_deductions'', ''Payroll'',   ''Add or modify earnings and deductions''),
  (''generate_payroll'',           ''Payroll'',   ''Process payroll for employees''),
  (''view_reports'',               ''Reports'',   ''Access payroll and account reports''),
  (''view_own_profile'',           ''Profile'',   ''View own profile and payslips''),
  (''update_own_profile'',         ''Profile'',   ''Update personal information'')
ON CONFLICT (key) DO UPDATE
  SET category    = EXCLUDED.category,
      description = EXCLUDED.description;

-- ─── Seed Predefined Roles (org_id = NULL for system-wide roles) ──────────────
-- rbac_roles.org_id is NOT NULL, so use sentinel UUID for global roles
INSERT INTO public.rbac_roles (code, name, description, tier, org_id)
VALUES
  (''ORG_ADMIN'',    ''Admin'',                  ''Full access to the system; can manage users, pay groups, earnings/deductions, and system settings.'',                     ''ORGANIZATION'', ''00000000-0000-0000-0000-000000000001''),
  (''ORG_HR_ADMIN'', ''HR/Payroll Manager'',     ''Can create/manage employee records, pay groups, earnings/deductions, generate payroll, and view reports.'',               ''ORGANIZATION'', ''00000000-0000-0000-0000-000000000001''),
  (''ORG_KAE'',      ''Key Accounts Executive'', ''Can view payroll reports and employee summaries but cannot create or modify users or pay settings.'',                     ''ORGANIZATION'', ''00000000-0000-0000-0000-000000000001''),
  (''ORG_EMPLOYEE'', ''Staff / Employee'',       ''Can view their own payroll information, download payslips, and update personal info.'',                                   ''ORGANIZATION'', ''00000000-0000-0000-0000-000000000001'')
ON CONFLICT (code) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      tier        = EXCLUDED.tier;

-- ─── Seed Role → Permission mappings ─────────────────────────────────────────
DO $$
DECLARE
  s uuid := ''00000000-0000-0000-0000-000000000001'';
BEGIN
  DELETE FROM public.rbac_role_permissions
  WHERE org_id = s
    AND role_code IN (''ORG_ADMIN'',''ORG_HR_ADMIN'',''ORG_KAE'',''ORG_EMPLOYEE'');

  -- Admin → all permissions
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT ''ORG_ADMIN'', key, s FROM public.rbac_permissions;

  -- HR/Payroll Manager
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
    (''ORG_HR_ADMIN'',''view_dashboard'',s),
    (''ORG_HR_ADMIN'',''manage_paygroups'',s),
    (''ORG_HR_ADMIN'',''manage_earnings_deductions'',s),
    (''ORG_HR_ADMIN'',''generate_payroll'',s),
    (''ORG_HR_ADMIN'',''view_reports'',s),
    (''ORG_HR_ADMIN'',''view_own_profile'',s),
    (''ORG_HR_ADMIN'',''update_own_profile'',s);

  -- KAE
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
    (''ORG_KAE'',''view_dashboard'',s),
    (''ORG_KAE'',''view_reports'',s),
    (''ORG_KAE'',''view_own_profile'',s);

  -- Employee
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
    (''ORG_EMPLOYEE'',''view_dashboard'',s),
    (''ORG_EMPLOYEE'',''view_own_profile'',s),
    (''ORG_EMPLOYEE'',''update_own_profile'',s);
END $$;"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20251219000600', '{"Core OBAC Schema Deployed Manually"}', 'core_obac_schema', NULL, NULL, NULL),
	('20251219000700', '{"RBAC RLS Policies Deployed Manually"}', 'enforce_rbac_rls', NULL, NULL, NULL),
	('20251219000601', '{"-- ==========================================================
-- OBAC Compatibility Shims
-- Migration: 20251219000601_obac_compatibility_shims.sql
-- ==========================================================

-- shim: has_permission(uuid, text)
-- Supports legacy calls where the scope was implicit or unneeded.
-- Internally checks if the user has the permission in ANY scope.
CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Check for PLATFORM_SUPER_ADMIN (Bypass)
    IF EXISTS (
        SELECT 1 FROM public.rbac_assignments 
        WHERE user_id = p_user_id AND role_code = ''PLATFORM_SUPER_ADMIN''
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check for Role-based permissions within ANY Scope
    IF EXISTS (
        SELECT 1 FROM public.rbac_assignments a
        JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code
        WHERE a.user_id = p_user_id
          AND rp.permission_key = p_permission_key
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Check for explicit ALLOW grants in ANY Scope
    IF EXISTS (
        SELECT 1 FROM public.rbac_grants g
        JOIN public.rbac_assignments a ON (
            (g.user_id = p_user_id) OR 
            (g.role_code = a.role_code AND a.user_id = p_user_id)
        )
        WHERE g.permission_key = p_permission_key
          AND g.effect = ''ALLOW''
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$"}', 'obac_compatibility_shims', NULL, NULL, NULL),
	('20260308130138', '{"-- Step 1: Delete all invitation records for tadong@flipafrica.app so a fresh invite can be sent
DELETE FROM public.user_management_invitations WHERE email = ''tadong@flipafrica.app'';

-- Step 2: Clean up any profile records linked to the old auth user ID
DELETE FROM public.user_management_profiles WHERE id = ''cb0bcbd1-b41b-41c2-a769-ffea7415b19e'';
DELETE FROM public.user_profiles WHERE id = ''cb0bcbd1-b41b-41c2-a769-ffea7415b19e'';

-- Log the cleanup
INSERT INTO public.cleanup_logs (action, auth_user_id, email, reason, details)
VALUES (
  ''pre_reinvite_cleanup'',
  ''cb0bcbd1-b41b-41c2-a769-ffea7415b19e'',
  ''tadong@flipafrica.app'',
  ''User was auto-confirmed before intentional acceptance. Clearing for fresh reinvite.'',
  ''{\"note\": \"Auth user still exists in auth.users - must be deleted via Supabase dashboard or admin API\"}''
);"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20260308151239', '{"-- ─── Enable RLS on RBAC tables (if not already) ──────────────────────────────
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;

-- ─── rbac_permissions: all authenticated users can read; admins can write ─────
DROP POLICY IF EXISTS \"rbac_permissions_select\" ON public.rbac_permissions;
CREATE POLICY \"rbac_permissions_select\"
  ON public.rbac_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS \"rbac_permissions_insert\" ON public.rbac_permissions;
CREATE POLICY \"rbac_permissions_insert\"
  ON public.rbac_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS \"rbac_permissions_update\" ON public.rbac_permissions;
CREATE POLICY \"rbac_permissions_update\"
  ON public.rbac_permissions FOR UPDATE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS \"rbac_permissions_delete\" ON public.rbac_permissions;
CREATE POLICY \"rbac_permissions_delete\"
  ON public.rbac_permissions FOR DELETE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

-- ─── rbac_roles: all authenticated users can read; admins can write ───────────
DROP POLICY IF EXISTS \"rbac_roles_select\" ON public.rbac_roles;
CREATE POLICY \"rbac_roles_select\"
  ON public.rbac_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS \"rbac_roles_insert\" ON public.rbac_roles;
CREATE POLICY \"rbac_roles_insert\"
  ON public.rbac_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS \"rbac_roles_update\" ON public.rbac_roles;
CREATE POLICY \"rbac_roles_update\"
  ON public.rbac_roles FOR UPDATE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS \"rbac_roles_delete\" ON public.rbac_roles;
CREATE POLICY \"rbac_roles_delete\"
  ON public.rbac_roles FOR DELETE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

-- ─── rbac_role_permissions: read for all authenticated; write for admins ──────
DROP POLICY IF EXISTS \"rbac_role_permissions_select\" ON public.rbac_role_permissions;
CREATE POLICY \"rbac_role_permissions_select\"
  ON public.rbac_role_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS \"rbac_role_permissions_insert\" ON public.rbac_role_permissions;
CREATE POLICY \"rbac_role_permissions_insert\"
  ON public.rbac_role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS \"rbac_role_permissions_update\" ON public.rbac_role_permissions;
CREATE POLICY \"rbac_role_permissions_update\"
  ON public.rbac_role_permissions FOR UPDATE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS \"rbac_role_permissions_delete\" ON public.rbac_role_permissions;
CREATE POLICY \"rbac_role_permissions_delete\"
  ON public.rbac_role_permissions FOR DELETE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20250111120000', '{"-- Migration: Replace contractor type with piece_rate and make tax_country required for all pay group types
-- This migration:
-- 1. Updates type constraints to replace ''contractor'' with ''piece_rate''
-- 2. Adds piece_rate-specific columns to pay_groups table
-- 3. Migrates existing contractor pay groups to piece_rate
-- 4. Ensures tax_country is required for all pay group types
-- 5. Sets default tax_country for existing pay groups that don''t have it

-- ============================================================
-- 1. UPDATE PAY_GROUP_MASTER TYPE CONSTRAINT
-- ============================================================

-- Drop existing constraint
ALTER TABLE public.pay_group_master
DROP CONSTRAINT IF EXISTS pay_group_master_type_check","-- Add new constraint with piece_rate instead of contractor
ALTER TABLE public.pay_group_master
ADD CONSTRAINT pay_group_master_type_check
CHECK (type IN (''regular'', ''expatriate'', ''piece_rate'', ''intern''))","-- Migrate existing contractor records to piece_rate
UPDATE public.pay_group_master
SET type = ''piece_rate''
WHERE type = ''contractor''","-- ============================================================
-- 2. UPDATE PAY_RUNS PAYROLL_TYPE CONSTRAINT
-- ============================================================

-- Drop existing constraint
ALTER TABLE public.pay_runs
DROP CONSTRAINT IF EXISTS pay_runs_payroll_type_check","-- Add new constraint with piece_rate instead of contractor
ALTER TABLE public.pay_runs
ADD CONSTRAINT pay_runs_payroll_type_check
CHECK (payroll_type IN (''regular'', ''expatriate'', ''piece_rate'', ''intern'') OR payroll_type IS NULL)","-- Migrate existing contractor records to piece_rate
UPDATE public.pay_runs
SET payroll_type = ''piece_rate''
WHERE payroll_type = ''contractor''","-- ============================================================
-- 3. ADD PIECE_RATE COLUMNS TO PAY_GROUPS TABLE
-- ============================================================

-- Add piece_type column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS piece_type text","-- Add default_piece_rate column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS default_piece_rate numeric(12,2)","-- Add minimum_pieces column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS minimum_pieces integer","-- Add maximum_pieces column
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS maximum_pieces integer","-- ============================================================
-- 4. ENSURE TAX_COUNTRY EXISTS AND IS REQUIRED FOR ALL TYPES
-- ============================================================

-- Add tax_country column to pay_groups if it doesn''t exist
ALTER TABLE public.pay_groups
ADD COLUMN IF NOT EXISTS tax_country text","-- Set default tax_country for existing pay groups that don''t have it (use country as default, or ''UG'' if country is also NULL)
-- First, handle NULL or empty values
UPDATE public.pay_groups
SET tax_country = COALESCE(
  CASE 
    WHEN country IS NOT NULL AND LENGTH(TRIM(country)) = 2 THEN UPPER(TRIM(country))
    WHEN country IS NOT NULL AND LENGTH(TRIM(country)) > 2 THEN 
      CASE 
        WHEN UPPER(TRIM(country)) LIKE ''UGANDA%'' THEN ''UG''
        WHEN UPPER(TRIM(country)) LIKE ''KENYA%'' THEN ''KE''
        WHEN UPPER(TRIM(country)) LIKE ''TANZANIA%'' THEN ''TZ''
        ELSE ''UG''
      END
    ELSE ''UG''
  END,
  ''UG''
)
WHERE tax_country IS NULL OR tax_country = '''' OR LENGTH(TRIM(tax_country)) != 2","-- Normalize all tax_country values to uppercase and ensure they''re exactly 2 characters
UPDATE public.pay_groups
SET tax_country = UPPER(LEFT(TRIM(tax_country), 2))
WHERE tax_country IS NOT NULL AND LENGTH(TRIM(tax_country)) != 2","-- Make tax_country NOT NULL for pay_groups (only if all rows now have values)
DO $$
BEGIN
  -- Ensure all rows have valid tax_country values
  UPDATE public.pay_groups
  SET tax_country = ''UG''
  WHERE tax_country IS NULL OR tax_country = '''' OR LENGTH(TRIM(tax_country)) != 2;
  
  -- Now set NOT NULL
  ALTER TABLE public.pay_groups
  ALTER COLUMN tax_country SET NOT NULL;
END $$","-- Add check constraint to ensure tax_country is always provided and valid
ALTER TABLE public.pay_groups
DROP CONSTRAINT IF EXISTS check_tax_country_required","ALTER TABLE public.pay_groups
ADD CONSTRAINT check_tax_country_required
CHECK (tax_country IS NOT NULL AND LENGTH(TRIM(tax_country)) = 2)","-- ============================================================
-- 5. MIGRATE EXISTING CONTRACTOR PAY GROUPS TO PIECE_RATE
-- ============================================================

-- Update pay_group_master records that reference contractor pay groups
UPDATE public.pay_group_master pgm
SET type = ''piece_rate''
FROM public.pay_groups pg
WHERE pgm.source_table = ''pay_groups''
  AND pgm.source_id = pg.id
  AND pgm.type = ''contractor''","-- Update pay_groups table type column if it exists (for legacy data)
-- First, try to add piece_rate to any enum types that might exist
DO $$
DECLARE
  enum_type_name text;
BEGIN
  -- Try to find and update pay_group_type enum if it exists
  SELECT t.typname INTO enum_type_name
  FROM pg_type t
  WHERE t.typname = ''pay_group_type'' AND t.typtype = ''e'';
  
  IF enum_type_name IS NOT NULL THEN
    -- Add piece_rate to the enum if it doesn''t exist
    BEGIN
      ALTER TYPE pay_group_type ADD VALUE IF NOT EXISTS ''piece_rate'';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$","-- Update pay_groups table type column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = ''public'' 
    AND table_name = ''pay_groups'' 
    AND column_name = ''type''
  ) THEN
    -- Try to update contractor to piece_rate (will fail silently if enum doesn''t have piece_rate)
    BEGIN
      UPDATE public.pay_groups
      SET type = ''piece_rate''
      WHERE type::text = ''contractor'';
    EXCEPTION
      WHEN OTHERS THEN
        -- If update fails (e.g., enum doesn''t have piece_rate), skip it
        NULL;
    END;
  END IF;
END $$","-- ============================================================
-- 6. UPDATE EXISTING PIECE_RATE PAY GROUPS
-- ============================================================

-- Set default piece_type for existing piece_rate pay groups
UPDATE public.pay_groups
SET piece_type = ''units''
WHERE EXISTS (
  SELECT 1 FROM public.pay_group_master pgm
  WHERE pgm.source_table = ''pay_groups''
    AND pgm.source_id = pay_groups.id
    AND pgm.type = ''piece_rate''
)
AND piece_type IS NULL","-- ============================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pay_groups_piece_type ON public.pay_groups(piece_type) WHERE piece_type IS NOT NULL","CREATE INDEX IF NOT EXISTS idx_pay_groups_tax_country ON public.pay_groups(tax_country)","-- ============================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN public.pay_groups.piece_type IS ''Unit of measurement for piece rate calculations (crates, boxes, units, etc.)''","COMMENT ON COLUMN public.pay_groups.default_piece_rate IS ''Default rate per piece/unit for piece rate pay groups''","COMMENT ON COLUMN public.pay_groups.minimum_pieces IS ''Minimum pieces required per pay period (optional, for validation)''","COMMENT ON COLUMN public.pay_groups.maximum_pieces IS ''Maximum pieces allowed per pay period (optional, for validation)''","COMMENT ON COLUMN public.pay_groups.tax_country IS ''Tax country code (required for all pay group types) - determines which country''''s tax regulations apply''"}', 'replace_contractor_with_piece_rate', NULL, NULL, NULL),
	('20260104000000', '{"-- ==========================================================
-- Migration: 20260104000000_rename_departments_to_sub_departments.sql
-- Purpose: Rename Departments to Sub-Departments for terminological consistency.
-- ==========================================================

-- 1. Rename the main table
ALTER TABLE IF EXISTS public.departments RENAME TO sub_departments","-- 2. Rename references in other tables
-- Employees table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employees'' AND column_name = ''department_id'') THEN
    ALTER TABLE public.employees RENAME COLUMN department_id TO sub_department_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employees'' AND column_name = ''department'') THEN
    ALTER TABLE public.employees RENAME COLUMN department TO sub_department;
  END IF;
END $$","-- Users table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''users'' AND column_name = ''department_id'') THEN
    ALTER TABLE public.users RENAME COLUMN department_id TO sub_department_id;
  END IF;
END $$","-- Pay Runs table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''pay_runs'' AND column_name = ''department'') THEN
    ALTER TABLE public.pay_runs RENAME COLUMN department TO sub_department;
  END IF;
END $$","-- Intern Pay Run Items table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''intern_pay_run_items'' AND column_name = ''department'') THEN
    ALTER TABLE public.intern_pay_run_items RENAME COLUMN department TO sub_department;
  END IF;
END $$","-- Employee Number Settings table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_number_settings'' AND column_name = ''use_department_prefix'') THEN
    ALTER TABLE public.employee_number_settings RENAME COLUMN use_department_prefix TO use_sub_department_prefix;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = ''employee_number_settings'' AND column_name = ''department_rules'') THEN
    ALTER TABLE public.employee_number_settings RENAME COLUMN department_rules TO sub_department_rules;
  END IF;
END $$","-- 3. Update Indexes
ALTER INDEX IF EXISTS idx_employees_department RENAME TO idx_employees_sub_department","ALTER INDEX IF EXISTS idx_users_department RENAME TO idx_users_sub_department","-- 4. Update row level security policies on sub_departments (renamed table)
DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON public.sub_departments","DROP POLICY IF EXISTS \"Enable insert access for authenticated users\" ON public.sub_departments","DROP POLICY IF EXISTS \"Enable update access for authenticated users\" ON public.sub_departments","DROP POLICY IF EXISTS \"Enable delete access for authenticated users\" ON public.sub_departments","DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON public.sub_departments","CREATE POLICY \"Enable read access for authenticated users\" ON public.sub_departments
    FOR SELECT TO authenticated USING (true)","DROP POLICY IF EXISTS \"Enable insert access for authenticated users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Enable insert access for authenticated users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Enable insert access for authenticated users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Enable insert access for authenticated users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Enable insert access for authenticated users\" ON public.sub_departments","CREATE POLICY \"Enable insert access for authenticated users\" ON public.sub_departments
    FOR INSERT TO authenticated WITH CHECK (true)","DROP POLICY IF EXISTS \"Enable update access for authenticated users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Enable update access for authenticated users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Enable update access for authenticated users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Enable update access for authenticated users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Enable update access for authenticated users\" ON public.sub_departments","CREATE POLICY \"Enable update access for authenticated users\" ON public.sub_departments
    FOR UPDATE TO authenticated USING (true)","DROP POLICY IF EXISTS \"Enable delete access for authenticated users\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Enable delete access for authenticated users\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Enable delete access for authenticated users\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Enable delete access for authenticated users\" ON public.head_office_pay_groups_expatriates","DROP POLICY IF EXISTS \"Enable delete access for authenticated users\" ON public.sub_departments","CREATE POLICY \"Enable delete access for authenticated users\" ON public.sub_departments
    FOR DELETE TO authenticated USING (true)","-- 5. Update Functions to use new terminology

-- Resolve dependencies: drop the old policy that uses get_user_department_id
DROP POLICY IF EXISTS \"Department managers can view department users\" ON public.users","-- Update get_user_sub_department_id (renamed from get_user_department_id)
DROP FUNCTION IF EXISTS public.get_user_department_id(uuid)","CREATE OR REPLACE FUNCTION public.get_user_sub_department_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT sub_department_id FROM public.users WHERE id = user_id);
END;
$$","-- 6. Update row level security policies on users table
DROP POLICY IF EXISTS \"Sub-Department managers can view sub-department users\" ON public.users","CREATE POLICY \"Sub-Department managers can view sub-department users\" ON public.users
    FOR SELECT TO authenticated
    USING (
        (public.check_is_org_admin(auth.uid()) AND sub_department_id = public.get_user_sub_department_id(auth.uid()))
    )","-- 7. Update Triggers
ALTER TRIGGER set_updated_at ON public.sub_departments RENAME TO set_sub_departments_updated_at","-- Update generate_employee_number
DROP FUNCTION IF EXISTS public.generate_employee_number(text, text, text, uuid, text)","CREATE OR REPLACE FUNCTION public.generate_employee_number(
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
  dept_key text := coalesce(in_sub_department, '''');
  country_key text := coalesce(in_country, '''');
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
    INSERT INTO public.employee_number_settings (default_prefix) VALUES (''EMP'') RETURNING id INTO settings_id;
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
    prefix := regexp_replace(upper(trim(in_prefix_override)), ''[^A-Z0-9\\\\-]+'', ''-'', ''g'');
  ELSE
    prefix_parts := ARRAY[]::text[];
    IF s.include_country_code AND country_key <> '''' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(country_key), ''[^A-Z0-9]+'', ''-'', ''g'');
    END IF;
    IF s.use_employment_type AND coalesce(in_employee_type, '''') <> '''' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), ''[^A-Z0-9]+'', ''-'', ''g'');
    END IF;
    IF s.use_sub_department_prefix AND dept_key <> '''' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(dept_key), ''[^A-Z0-9]+'', ''-'', ''g'');
    ELSE
      prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), ''[^A-Z0-9]+'', ''-'', ''g'');
    END IF;
    prefix := array_to_string(prefix_parts, ''-'');
  END IF;

  -- Determine sequence: support per-sub-department start via sub_department_rules
  IF s.sub_department_rules ? dept_key THEN
    seq := (s.sub_department_rules -> dept_key ->> ''next_sequence'')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-sub-department sequence atomically
    UPDATE public.employee_number_settings
    SET sub_department_rules = jsonb_set(s.sub_department_rules,
                                      ARRAY[dept_key, ''next_sequence''],
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

  IF format = ''SEQUENCE'' THEN
    candidate := lpad(seq::text, digits, ''0'');
  ELSE
    candidate := prefix || ''-'' || lpad(seq::text, digits, ''0'');
  END IF;

  -- Ensure uniqueness; loop if collision
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    IF format = ''SEQUENCE'' THEN
      candidate := lpad(seq::text, digits, ''0'');
    ELSE
      candidate := prefix || ''-'' || lpad(seq::text, digits, ''0'');
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$","-- Update trigger function to use renamed columns
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
$$","-- 8. Update Comments
COMMENT ON TABLE public.sub_departments IS ''Sub-Departments within a company unit''","COMMENT ON COLUMN public.employees.sub_department_id IS ''Reference to the sub-department the employee belongs to''","COMMENT ON COLUMN public.employees.sub_department IS ''Legacy/Text field for sub-department (if applicable)''","COMMENT ON COLUMN public.users.sub_department_id IS ''Reference to the sub-department the user belongs to''","COMMENT ON COLUMN public.employee_number_settings.use_sub_department_prefix IS ''Whether to use sub-department name as employee number prefix''","COMMENT ON COLUMN public.employee_number_settings.sub_department_rules IS ''Per-sub-department employee numbering rules''","COMMENT ON COLUMN public.intern_pay_run_items.sub_department IS ''Department/Sub-department for intern payroll item''"}', 'rename_departments_to_sub_departments', NULL, NULL, NULL),
	('20260104203000', '{"-- ==========================================================
-- NOTIFICATION TEMPLATES MIGRATION
-- ==========================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID, -- Nullable for system defaults, otherwise links to organization
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL, -- e.g., ''PAYRUN_SUBMITTED'', ''PAYRUN_APPROVED'', ''PAYRUN_REJECTED''
    subject TEXT NOT NULL,
    body_content TEXT NOT NULL, -- HTML or Markdown
    is_active BOOLEAN DEFAULT true,
    module TEXT NOT NULL DEFAULT ''payroll_approvals'',
    available_variables JSONB DEFAULT ''[]'', -- Metadata about what variables can be used
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure uniqueness for event per or (if org is null, it''s global default)
    UNIQUE NULLS NOT DISTINCT (org_id, trigger_event)
)","-- 2. Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY","-- 3. RLS Policies

-- READ: Authenticated users can read templates for their org OR global templates
DROP POLICY IF EXISTS \"Templates readable by Org Members\" ON public.notification_templates","DROP POLICY IF EXISTS \"Templates readable by Org Members\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Templates readable by Org Members\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Templates readable by Org Members\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Templates readable by Org Members\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Templates readable by Org Members\"
ON public.notification_templates FOR SELECT TO authenticated
USING (
    org_id IS NULL OR
    org_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
)","-- WRITE: Admins can manage their org''s templates
DROP POLICY IF EXISTS \"Templates managed by Org Admins\" ON public.notification_templates","DROP POLICY IF EXISTS \"Templates managed by Org Admins\" ON public.head_office_pay_group_members","DROP POLICY IF EXISTS \"Templates managed by Org Admins\" ON public.head_office_pay_groups_regular","DROP POLICY IF EXISTS \"Templates managed by Org Admins\" ON public.head_office_pay_groups_interns","DROP POLICY IF EXISTS \"Templates managed by Org Admins\" ON public.head_office_pay_groups_expatriates","CREATE POLICY \"Templates managed by Org Admins\"
ON public.notification_templates FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR 
    public.check_is_org_admin(auth.uid()) OR
    public.check_is_org_super_admin(auth.uid())
)","-- 4. Initial Seed Data (Global Defaults)
-- We insert these with org_id NULL so they act as system defaults
INSERT INTO public.notification_templates (name, trigger_event, subject, body_content, module, available_variables)
VALUES 
(
    ''Approval Request'', 
    ''PAYRUN_SUBMITTED'', 
    ''Action Required: Pay Run Review - {{payrun_period}}'',
    ''<p>Dear {{approver_name}},</p><p>A new pay run has been submitted and awaits your approval.</p><ul><li><strong>Pay Run ID:</strong> {{payrun_id}}</li><li><strong>Period:</strong> {{payrun_period}}</li><li><strong>Organization:</strong> {{organization_name}}</li><li><strong>Submitted By:</strong> {{submitted_by}}</li></ul><p>Please click the link below to review and approve:</p><p><a href=\"{{action_url}}\">Review Pay Run</a></p><p>Thank you.</p>'',
    ''payroll_approvals'',
    ''[\"approver_name\", \"payrun_id\", \"payrun_period\", \"organization_name\", \"submitted_by\", \"action_url\"]''
),
(
    ''Rejection Notice'', 
    ''PAYRUN_REJECTED'', 
    ''Action Required: Pay Run Rejected - {{payrun_period}}'',
    ''<p>Dear {{created_by_name}},</p><p>Your pay run submission has been rejected.</p><ul><li><strong>Pay Run ID:</strong> {{payrun_id}}</li><li><strong>Period:</strong> {{payrun_period}}</li><li><strong>Rejected By:</strong> {{rejected_by}}</li><li><strong>Reason:</strong> {{reason}}</li></ul><p>Please review the comments and resubmit if necessary.</p><p><a href=\"{{action_url}}\">View Pay Run</a></p>'',
    ''payroll_approvals'',
    ''[\"created_by_name\", \"payrun_id\", \"payrun_period\", \"rejected_by\", \"reason\", \"action_url\"]''
),
(
    ''Final Approval Notice'', 
    ''PAYRUN_APPROVED'', 
    ''Approved: Pay Run - {{payrun_period}} is now Locked'',
    ''<p>The pay run for period <strong>{{payrun_period}}</strong> has been fully approved and is now locked for processing.</p><ul><li><strong>Pay Run ID:</strong> {{payrun_id}}</li><li><strong>Approved By:</strong> {{approved_by}}</li></ul><p><a href=\"{{action_url}}\">View Pay Run</a></p>'',
    ''payroll_approvals'',
    ''[\"payrun_period\", \"payrun_id\", \"approved_by\", \"action_url\"]''
)
ON CONFLICT (org_id, trigger_event) DO NOTHING"}', 'create_notification_templates', NULL, NULL, NULL),
	('20260105000000', '{"-- ==========================================================
-- 🛠️ ENHANCEMENT: ADVANCED RBAC GRANTS & EXPIRATION
-- ==========================================================
-- Migration: 20260105000000_enhance_rbac_grants.sql
-- Purpose:
-- 1. Add valid_until to rbac_grants for temporary permissions.
-- 2. Restore grant-aware has_permission logic with DENY priority and expiry checks.

-- 1. Add valid_until column
ALTER TABLE public.rbac_grants ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ","-- 2. Restore and Enhance has_permission
-- Handles Platform Admin bypass, explicit DENY (with expiry), 
-- Role-based permissions, and explicit ALLOW (with expiry).
CREATE OR REPLACE FUNCTION public.has_permission(
  _permission_key TEXT,
  _scope_type TEXT DEFAULT NULL,
  _scope_id UUID DEFAULT NULL,
  _user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  -- 1. PLATFORM BYPASS: Platform Admins have full access
  IF public.is_platform_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit DENY grants (User-specific or Role-based)
  -- Deny always wins. Includes expiration check.
  IF EXISTS (
    SELECT 1 FROM public.rbac_grants g
    LEFT JOIN public.rbac_assignments a ON (
        -- Role-based grant: User must have the role assigned
        (g.role_code = a.role_code AND a.user_id = _user_id)
    )
    WHERE g.permission_key = _permission_key
      AND g.effect = ''DENY''
      AND (g.user_id = _user_id OR a.user_id = _user_id)
      -- Expiration check: Only consider if NOT expired
      AND (g.valid_until IS NULL OR g.valid_until > now())
      -- Scope resolution
      AND (
        _scope_type IS NULL
        OR g.scope_type = _scope_type AND (_scope_id IS NULL OR g.scope_id = _scope_id)
      )
  ) THEN
    RETURN FALSE;
  END IF;

  -- 3. Check for Role-based permissions within Scope
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_assignments ra
    JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code AND ra.org_id = rrp.org_id
    WHERE ra.user_id = _user_id
      AND rrp.permission_key = _permission_key
      AND (
        -- Scope Resolution Logic
        _scope_type IS NULL
        OR ra.scope_type = ''GLOBAL''
        OR (ra.scope_type = _scope_type AND (_scope_id IS NULL OR ra.scope_id = _scope_id))
        OR (ra.scope_type = ''ORGANIZATION'' AND _scope_type IN (''COMPANY'', ''PROJECT''))
        OR (ra.scope_type = ''COMPANY'' AND _scope_type = ''PROJECT'')
      )
  ) INTO v_has_perm;

  IF v_has_perm THEN
    RETURN TRUE;
  END IF;

  -- 4. Check for explicit ALLOW grants
  -- Includes expiration check.
  IF EXISTS (
    SELECT 1 FROM public.rbac_grants g
    LEFT JOIN public.rbac_assignments a ON (
        -- Role-based grant: User must have the role assigned
        (g.role_code = a.role_code AND a.user_id = _user_id)
    )
    WHERE g.permission_key = _permission_key
      AND g.effect = ''ALLOW''
      AND (g.user_id = _user_id OR a.user_id = _user_id)
      -- Expiration check
      AND (g.valid_until IS NULL OR g.valid_until > now())
      -- Scope resolution
      AND (
        _scope_type IS NULL
        OR g.scope_type = _scope_type AND (_scope_id IS NULL OR g.scope_id = _scope_id)
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$","COMMENT ON FUNCTION public.has_permission(text, text, uuid, uuid) IS ''Evaluates effective permission by checking Platform Admin status, explicit DENY grants, Role-based permissions, and explicit ALLOW grants with support for temporary expiration.''","-- 3. Update Audit Trigger for Grants to handle valid_until
CREATE OR REPLACE FUNCTION public.audit_rbac_grants()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    NEW.scope_id, -- Using scope_id as org_id if scope is ORGANIZATION, might need adjustment for deeper scopes
    ''GRANT_'' || TG_OP, 
    ''rbac_grants'', 
    NEW.id::text,
    ''Custom permission grant '' || LOWER(TG_OP) || ''ed: '' || NEW.permission_key || '' ('' || NEW.effect || '')'',
    jsonb_build_object(
        ''user_id'', NEW.user_id,
        ''role_code'', NEW.role_code,
        ''permission_key'', NEW.permission_key,
        ''effect'', NEW.effect,
        ''scope_type'', NEW.scope_type,
        ''scope_id'', NEW.scope_id,
        ''valid_until'', NEW.valid_until,
        ''reason'', NEW.reason
    )
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql","DROP TRIGGER IF EXISTS trg_audit_rbac_grants ON public.rbac_grants","CREATE TRIGGER trg_audit_rbac_grants
AFTER INSERT OR UPDATE ON public.rbac_grants
FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_grants()"}', 'enhance_rbac_grants', NULL, NULL, NULL),
	('20260308122934', '{"
-- Create user_management_invitations table
CREATE TABLE IF NOT EXISTS public.user_management_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT ''employee'',
  department TEXT,
  phone TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT ''pending'',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_management_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_umi_token ON public.user_management_invitations(token);
CREATE INDEX IF NOT EXISTS idx_umi_email ON public.user_management_invitations(email);
CREATE INDEX IF NOT EXISTS idx_umi_status ON public.user_management_invitations(status);

-- RLS policy: admins/hr can view (uses user_profiles which has the role column)
CREATE POLICY \"Admins and HR can view invitations\"
  ON public.user_management_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN (''admin'', ''hr'', ''super_admin'', ''org_admin'', ''organization_admin'')
    )
  );
"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20251216000000', '{"-- Create user_invites table for Enterprise Onboarding
CREATE TYPE invite_status AS ENUM (''pending'', ''accepted'', ''expired'', ''revoked'')","CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    inviter_id UUID REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.organizations(id), -- Optional: If invite is scoped to a specific tenant
    role_data JSONB NOT NULL DEFAULT ''{}''::jsonb, -- Store intended roles/orgs: { orgs: [], platformRoles: [] }
    status invite_status NOT NULL DEFAULT ''pending'',
    token_hash TEXT, -- Optional: Store hash of the invite token for verification if needed
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
)","-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email)","CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status)","CREATE INDEX IF NOT EXISTS idx_user_invites_inviter ON public.user_invites(inviter_id)","-- RLS Policies
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY","-- Allow platform admins to view all invites (or strict RLS if needed)
-- For now, let''s allow authenticated users to view invites they sent OR invites for their email.

CREATE POLICY \"Admins can view all invites\"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins 
            WHERE auth_user_id = auth.uid() AND allowed = true
        )
    )","CREATE POLICY \"Users can view invites sent by themselves\"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (inviter_id = auth.uid())","CREATE POLICY \"Users can view invites addressed to them\"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (email = (select email from auth.users where id = auth.uid()))","-- Only Service Role (Edge Functions) should insert/update universally.
-- Admins can update status (revoke) via Edge Functions or direct if policy allows.
-- Let''s restrict modification to Service Role for now to force usage of our controlled Edge Functions.
-- But wait, Platform Admins might need to Revoke directly from UI if we don''t build an API for it?
-- Better to use functions. But for now, let''s allow Platform Admins to update ''status'' to ''revoked''.

CREATE POLICY \"Admins can update invites (revoke)\"
    ON public.user_invites
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins 
            WHERE auth_user_id = auth.uid() AND allowed = true
        )
    )
    WITH CHECK (
        EXISTS (
             SELECT 1 FROM public.platform_admins 
             WHERE auth_user_id = auth.uid() AND allowed = true
        )
    )","-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO service_role","GRANT SELECT ON public.user_invites TO authenticated"}', 'create_user_invites', NULL, NULL, NULL),
	('20251216140000', '{"-- Create user_invites table if it doesn''t exist
CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    inviter_id UUID REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.organizations(id),
    role_data JSONB,
    status TEXT DEFAULT ''pending'',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY","-- Policies
CREATE POLICY \"Admins can view all invites\"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (true)","-- Simplified for now, refine later

CREATE POLICY \"Admins can insert invites\"
    ON public.user_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (true)","CREATE POLICY \"Admins can delete invites\"
    ON public.user_invites
    FOR DELETE
    TO authenticated
    USING (true)"}', 'create_user_invites', NULL, NULL, NULL),
	('20260308131715', '{"
-- Delete the ghost/conflicting auth user for tadong@flipafrica.app
DELETE FROM auth.users WHERE id = ''cb0bcbd1-b41b-41c2-a769-ffea7415b19e'';

-- Clean up any leftover public table records
DELETE FROM public.user_management_invitations WHERE email = ''tadong@flipafrica.app'';
DELETE FROM public.user_management_profiles WHERE email = ''tadong@flipafrica.app'';
DELETE FROM public.user_profiles WHERE id = ''cb0bcbd1-b41b-41c2-a769-ffea7415b19e'';

-- Log the cleanup
INSERT INTO public.cleanup_logs (action, auth_user_id, email, reason, details)
VALUES (
  ''hard_delete_ghost_auth_user'',
  ''cb0bcbd1-b41b-41c2-a769-ffea7415b19e'',
  ''tadong@flipafrica.app'',
  ''Deleted to allow fresh Supabase-native invitation email.'',
  ''{\"note\": \"Deleted via migration. Fresh invite will use Supabase inviteUserByEmail which sends email natively.\"}''
);
"}', '', 'nalungukevin@gmail.com', NULL, NULL),
	('20251216145000', '{"-- Trigger to activate invited users on first login
CREATE OR REPLACE FUNCTION public.activate_invited_user()
RETURNS TRIGGER AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
BEGIN
    -- Only proceed if this is the user''s first login (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        
        -- Get org_users record for this user (should exist with status=''invited'')
        SELECT * INTO org_user_rec
        FROM public.org_users
        WHERE user_id = NEW.id AND status = ''invited''
        LIMIT 1;

        IF FOUND THEN
            -- Update status to ''active''
            UPDATE public.org_users
            SET status = ''active''
            WHERE id = org_user_rec.id;

            -- Get invite data to know which roles to assign
            SELECT * INTO invite_rec
            FROM public.user_invites
            WHERE email = NEW.email 
              AND status = ''pending''
              AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                -- Mark invite as accepted
                UPDATE public.user_invites
                SET status = ''accepted''
                WHERE id = invite_rec.id;

                -- Assign org roles from invite data
                -- role_data structure: {orgs: [{orgId, roles: [roleKeys], companyIds}]}
                DECLARE
                    org_assignment JSONB;
                    role_key TEXT;
                BEGIN
                    FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->''orgs'')::jsonb)
                    LOOP
                        -- For each role key in the roles array
                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->''roles'')::jsonb)
                        LOOP
                            -- Find the role_id from org_roles
                            SELECT id INTO role_rec
                            FROM public.org_roles
                            WHERE org_id = (org_assignment->>''orgId'')::UUID
                              AND key = role_key
                            LIMIT 1;

                            IF FOUND THEN
                                -- Insert into org_user_roles
                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                VALUES (org_user_rec.id, role_rec.id)
                                ON CONFLICT DO NOTHING;
                            END IF;
                        END LOOP;

                        -- Assign company memberships
                        DECLARE
                            company_id_val TEXT;
                        BEGIN
                            FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->''companyIds'')::jsonb)
                            LOOP
                                INSERT INTO public.user_company_memberships (user_id, company_id)
                                VALUES (NEW.id, company_id_val::UUID)
                                ON CONFLICT DO NOTHING;
                            END LOOP;
                        END;
                    END LOOP;
                END;
            END IF;

            -- Ensure user has a basic role in user_roles table (for legacy compatibility)
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, ''employee'')
            ON CONFLICT DO NOTHING;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER","-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_user_confirm_activate ON auth.users","CREATE TRIGGER on_user_confirm_activate
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at)
    EXECUTE FUNCTION public.activate_invited_user()"}', 'activate_invited_users', NULL, NULL, NULL),
	('20251217180000', '{"-- Allow Org Admins to view profiles of users in their organization
-- This is necessary for seeing invited users in the User Management list

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY","-- Drop existing overlapping policies if any (safeguard)
-- We don''t want to drop \"Users can modify own profile\" etc. so we use a specific name.

DROP POLICY IF EXISTS \"Org Admins can view profiles in their organization\" ON public.user_profiles","CREATE POLICY \"Org Admins can view profiles in their organization\"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- User can see their own profile
    id = auth.uid() 
    OR
    -- Org Admins can see profiles that belong to their org
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
)"}', 'fix_user_profiles_rls', NULL, NULL, NULL),
	('20251217183000', '{"-- Allow Org Admins to revoke invites for their own org

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY","DROP POLICY IF EXISTS \"Admins can update invites (revoke)\" ON public.user_invites","CREATE POLICY \"Admins and Inviter can update invites (revoke)\"
ON public.user_invites
FOR UPDATE
TO authenticated
USING (
    -- Platform Admin
    (EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = auth.uid() AND allowed = true))
    OR
    -- Org Admin for the invite''s tenant
    (tenant_id IS NOT NULL AND public.is_org_admin(tenant_id))
    OR
    -- The inviter themselves
    (inviter_id = auth.uid())
)
WITH CHECK (
    -- Same condition
    (EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = auth.uid() AND allowed = true))
    OR
    (tenant_id IS NOT NULL AND public.is_org_admin(tenant_id))
    OR
    (inviter_id = auth.uid())
)"}', 'allow_org_admin_revoke_invites', NULL, NULL, NULL),
	('20251217194500', '{"-- ==========================================================
-- Invite Cleanup: audit logging + safe inventory helpers
-- ==========================================================

-- 1) Cleanup audit table
create table if not exists public.cleanup_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reason text not null default ''invite_cleanup'',
  action text not null, -- planned | deleted | skipped | error
  email text,
  auth_user_id uuid,
  invite_id uuid,
  details jsonb not null default ''{}''::jsonb
)","create index if not exists idx_cleanup_logs_created_at on public.cleanup_logs(created_at)","create index if not exists idx_cleanup_logs_email on public.cleanup_logs(email)","create index if not exists idx_cleanup_logs_auth_user_id on public.cleanup_logs(auth_user_id)","create index if not exists idx_cleanup_logs_invite_id on public.cleanup_logs(invite_id)","alter table public.cleanup_logs enable row level security","drop policy if exists cleanup_logs_service_role_all on public.cleanup_logs","create policy cleanup_logs_service_role_all
on public.cleanup_logs
for all
to service_role
using (true)
with check (true)","drop policy if exists cleanup_logs_platform_admin_select on public.cleanup_logs","create policy cleanup_logs_platform_admin_select
on public.cleanup_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.allowed = true
      and (pa.auth_user_id = auth.uid() or lower(pa.email) = lower(coalesce(auth.jwt()->>''email'', '''')))
  )
)","grant select, insert, update, delete on public.cleanup_logs to service_role","-- 2) Helper: find any \"protected\" FK reference to auth.users
-- We only consider FK references outside the allowlist of tables that are safe to purge
-- as part of an invite cleanup (org mappings, profiles, etc).
create or replace function public.invite_cleanup_find_protected_fk_ref(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ref record;
  hit boolean;
  allow_tables text[] := array[
    ''public.user_invites'',
    ''public.user_profiles'',
    ''public.profiles'',
    ''public.org_users'',
    ''public.org_user_roles'',
    ''public.user_roles'',
    ''public.user_company_memberships'',
    ''public.org_license_assignments'',
    ''public.access_grants'',
    ''public.notifications'',
    ''public.auth_events'',
    ''public.cleanup_logs''
  ];
begin
  if p_user_id is null then
    return null;
  end if;

  for ref in
    select
      kcu.table_schema,
      kcu.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = ''FOREIGN KEY''
      and ccu.table_schema = ''auth''
      and ccu.table_name = ''users''
  loop
    if (ref.table_schema || ''.'' || ref.table_name) = any(allow_tables) then
      continue;
    end if;

    execute format(
      ''select exists(select 1 from %I.%I where %I = $1 limit 1)'',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into hit using p_user_id;

    if hit then
      return jsonb_build_object(
        ''schema'', ref.table_schema,
        ''table'', ref.table_name,
        ''column'', ref.column_name
      );
    end if;
  end loop;

  return null;
end;
$$","revoke all on function public.invite_cleanup_find_protected_fk_ref(uuid) from public","grant execute on function public.invite_cleanup_find_protected_fk_ref(uuid) to service_role","-- 3) Helper: inventory pending invites with auth state and protection checks
create or replace function public.invite_cleanup_candidates(
  p_limit integer default 200,
  p_older_than_days integer default 30,
  p_tenant_id uuid default null,
  p_require_expired boolean default true,
  p_include_auth_only boolean default false
)
returns table (
  source text,
  invite_id uuid,
  email text,
  invite_status text,
  invite_created_at timestamptz,
  invite_expires_at timestamptz,
  auth_user_id uuid,
  auth_created_at timestamptz,
  invited_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  has_password boolean,
  protected_ref jsonb,
  eligible boolean
)
language sql
security definer
set search_path = public, auth
as $$
  with pending_invites as (
    select
      ui.id as invite_id,
      ui.email,
      ui.status::text as invite_status,
      ui.created_at as invite_created_at,
      ui.expires_at as invite_expires_at
    from public.user_invites ui
    where ui.status = ''pending''
      and (p_tenant_id is null or ui.tenant_id = p_tenant_id)
      and (p_older_than_days is null or ui.created_at < now() - make_interval(days => p_older_than_days))
      and (not p_require_expired or ui.expires_at < now())
    order by ui.created_at asc
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
  ),
  auth_only as (
    select
      null::uuid as invite_id,
      au.email,
      ''pending''::text as invite_status,
      au.created_at as invite_created_at,
      null::timestamptz as invite_expires_at
    from auth.users au
    where p_include_auth_only = true
      and au.invited_at is not null
      and au.confirmed_at is null
      and au.last_sign_in_at is null
      and coalesce(nullif(au.encrypted_password, ''''), '''') = ''''
      and (p_older_than_days is null or au.created_at < now() - make_interval(days => p_older_than_days))
      and (p_tenant_id is null or lower(au.raw_user_meta_data->>''organization_id'') = lower(p_tenant_id::text))
      and not exists (
        select 1
        from public.user_invites ui
        where lower(ui.email) = lower(au.email)
          and ui.status in (''pending'',''accepted'',''expired'',''revoked'')
      )
    order by au.created_at asc
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
  ),
  combined as (
    select ''user_invites''::text as source, * from pending_invites
    union all
    select ''auth_only''::text as source, * from auth_only
  ),
  joined as (
    select
      c.source,
      c.invite_id,
      c.email,
      c.invite_status,
      c.invite_created_at,
      c.invite_expires_at,
      au.id as auth_user_id,
      au.created_at as auth_created_at,
      au.invited_at,
      au.confirmed_at,
      au.last_sign_in_at,
      (coalesce(nullif(au.encrypted_password, ''''), '''') <> '''') as has_password
    from combined c
    left join auth.users au
      on lower(au.email) = lower(c.email)
  )
  select
    j.source,
    j.invite_id,
    j.email,
    j.invite_status,
    j.invite_created_at,
    j.invite_expires_at,
    j.auth_user_id,
    j.auth_created_at,
    j.invited_at,
    j.confirmed_at,
    j.last_sign_in_at,
    j.has_password,
    ref.protected_ref,
    (
      j.invite_status = ''pending''
      and (
        (j.source = ''user_invites'')
        or (j.source = ''auth_only'' and p_include_auth_only = true)
      )
      and (j.auth_user_id is null or (
        j.invited_at is not null
        and j.confirmed_at is null
        and j.last_sign_in_at is null
        and j.has_password = false
      ))
      and ref.protected_ref is null
    ) as eligible
  from joined j
  left join lateral (
    select public.invite_cleanup_find_protected_fk_ref(j.auth_user_id) as protected_ref
  ) ref on true;
$$","revoke all on function public.invite_cleanup_candidates(integer, integer, uuid, boolean, boolean) from public","grant execute on function public.invite_cleanup_candidates(integer, integer, uuid, boolean, boolean) to service_role"}', 'invite_cleanup_logs_and_helpers', NULL, NULL, NULL),
	('20251219000000', '{"-- Consolidate user identity and security into user_profiles
-- Migration: 20251219000000_consolidate_user_profiles.sql

-- 1) Add lockout fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lockout_reason TEXT","-- 2) Add indexes for lockout queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_locked_at ON public.user_profiles(locked_at) WHERE locked_at IS NOT NULL","CREATE INDEX IF NOT EXISTS idx_user_profiles_failed_attempts ON public.user_profiles(failed_login_attempts) WHERE failed_login_attempts > 0","-- 3) Add check constraint
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS check_failed_attempts_non_negative","ALTER TABLE public.user_profiles
ADD CONSTRAINT check_failed_attempts_non_negative 
CHECK (failed_login_attempts >= 0)","-- 4) Redefine lockout functions to use user_profiles
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    failed_login_attempts = 0,
    locked_at = NULL,
    updated_at = NOW()
  WHERE id = _user_id;
END;
$$","CREATE OR REPLACE FUNCTION public.increment_failed_login_attempts(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.user_profiles
  SET 
    failed_login_attempts = failed_login_attempts + 1,
    updated_at = NOW()
  WHERE id = _user_id
  RETURNING failed_login_attempts INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$","CREATE OR REPLACE FUNCTION public.is_account_locked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT locked_at IS NOT NULL
  FROM public.user_profiles
  WHERE id = _user_id
$$","-- 5) Backfill data from profiles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = ''profiles'') THEN
    UPDATE public.user_profiles up
    SET 
      failed_login_attempts = p.failed_login_attempts,
      locked_at = p.locked_at,
      locked_by = p.locked_by,
      unlocked_at = p.unlocked_at,
      unlocked_by = p.unlocked_by,
      lockout_reason = p.lockout_reason
    FROM public.profiles p
    WHERE up.id = p.id;
  END IF;
END $$","-- 6) Comments
COMMENT ON COLUMN public.user_profiles.failed_login_attempts IS ''Number of consecutive failed login attempts. Reset on successful login.''","COMMENT ON COLUMN public.user_profiles.locked_at IS ''Timestamp when account was locked due to failed attempts or admin action.''","COMMENT ON COLUMN public.user_profiles.locked_by IS ''User ID of admin who locked the account (NULL if auto-locked).''","COMMENT ON COLUMN public.user_profiles.unlocked_at IS ''Timestamp when account was unlocked.''","COMMENT ON COLUMN public.user_profiles.unlocked_by IS ''User ID of admin who unlocked the account.''","COMMENT ON COLUMN public.user_profiles.lockout_reason IS ''Reason for account lockout (e.g., \"Failed login attempts exceeded threshold\").''"}', 'consolidate_user_profiles', NULL, NULL, NULL),
	('20251219000100', '{"-- 1) Create or repair organization_security_settings table
-- Ensure it exists and has the correct foreign key
CREATE TABLE IF NOT EXISTS public.organization_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE,
    lockout_threshold INTEGER NOT NULL DEFAULT 5 CHECK (lockout_threshold >= 3 AND lockout_threshold <= 10),
    email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)","-- Fix organization_security_settings foreign key
-- It might have been created referencing pay_groups(id) by mistake.
DO $$
BEGIN
    -- Drop the incorrect constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = ''organization_security_settings_org_id_fkey'' 
        AND table_name = ''organization_security_settings''
    ) THEN
        ALTER TABLE public.organization_security_settings
        DROP CONSTRAINT organization_security_settings_org_id_fkey;
    END IF;

    -- Add the correct constraint
    ALTER TABLE public.organization_security_settings
    ADD CONSTRAINT organization_security_settings_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE ''Could not repair organization_security_settings_org_id_fkey: %'', SQLERRM;
END $$ LANGUAGE plpgsql","-- 2) Add activated_at to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE","-- 3) Enhance activate_invited_user trigger with logging and user_profiles update
CREATE OR REPLACE FUNCTION public.activate_invited_user()
RETURNS TRIGGER AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
    v_org_id UUID;
BEGIN
    -- Only proceed if this is the user''s first login (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        RAISE NOTICE ''Activating invited user: % (ID: %)'', NEW.email, NEW.id;
        
        -- Get org_users record for this user (should exist with status=''invited'')
        SELECT * INTO org_user_rec
        FROM public.org_users
        WHERE user_id = NEW.id AND status = ''invited''
        LIMIT 1;

        IF FOUND THEN
            RAISE NOTICE ''Found invited org_user record: %'', org_user_rec.id;
            
            -- Update status to ''active''
            UPDATE public.org_users
            SET status = ''active''
            WHERE id = org_user_rec.id;

            -- Update user_profiles
            UPDATE public.user_profiles
            SET 
              organization_id = org_user_rec.org_id,
              activated_at = NOW(),
              updated_at = NOW()
            WHERE id = NEW.id;

            -- Get invite data to know which roles to assign
            SELECT * INTO invite_rec
            FROM public.user_invites
            WHERE email = NEW.email 
              AND status = ''pending''
              AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                RAISE NOTICE ''Found pending invite: %. Processing role_data.'', invite_rec.id;
                
                -- Mark invite as accepted
                UPDATE public.user_invites
                SET status = ''accepted''
                WHERE id = invite_rec.id;

                -- Assign org roles from invite data
                DECLARE
                    org_assignment JSONB;
                    role_key TEXT;
                BEGIN
                    FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->''orgs'')::jsonb)
                    LOOP
                        v_org_id := (org_assignment->>''orgId'')::UUID;
                        RAISE NOTICE ''Processing org assignment for org: %'', v_org_id;

                        -- For each role key in the roles array
                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->''roles'')::jsonb)
                        LOOP
                            -- Find the role_id from org_roles
                            SELECT id INTO role_rec
                            FROM public.org_roles
                            WHERE org_id = v_org_id
                              AND key = role_key
                            LIMIT 1;

                            IF FOUND THEN
                                RAISE NOTICE ''Assigning role: % (ID: %) to org_user: %'', role_key, role_rec.id, org_user_rec.id;
                                -- Insert into org_user_roles
                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                VALUES (org_user_rec.id, role_rec.id)
                                ON CONFLICT DO NOTHING;
                            ELSE
                                RAISE WARNING ''Role not found: % for org: %'', role_key, v_org_id;
                            END IF;
                        END LOOP;

                        -- Assign company memberships
                        DECLARE
                            company_id_val TEXT;
                        BEGIN
                            FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->''companyIds'')::jsonb)
                            LOOP
                                RAISE NOTICE ''Assigning company membership: % to user: %'', company_id_val, NEW.id;
                                INSERT INTO public.user_company_memberships (user_id, company_id)
                                VALUES (NEW.id, company_id_val::UUID)
                                ON CONFLICT DO NOTHING;
                            END LOOP;
                        END;
                    END LOOP;
                END;
            ELSE
                RAISE NOTICE ''No pending invite found or no role_data for user: %'', NEW.email;
            END IF;

            -- Ensure user has a basic role in user_roles table (for legacy compatibility)
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, ''employee'')
            ON CONFLICT DO NOTHING;

        ELSE
            RAISE NOTICE ''No invited org_user record found for user: %'', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql"}', 'enhance_provisioning', NULL, NULL, NULL),
	('20251219000200', '{"-- ==========================================================
-- 🔥 PHASE 5: UNIFIED OBAC & SECURITY TIGHTENING
-- ==========================================================
-- Migration: 20251219000200_tighten_obac.sql
-- Purpose: 
-- 1. Fix broken foreign keys and legacy table references.
-- 2. Unify security helper functions.
-- 3. Standardize RLS policies on modern OBAC system.
-- 4. Ensure multi-tenant isolation for all audit logs.

-- ----------------------------
-- 0) Ensure Role Enums are Up-to-Date
-- ----------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = ''app_role'') THEN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''platform_admin'';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''org_super_admin'';
    END IF;
END $$","-- ----------------------------
-- 1) Standardize Helper Functions
-- ----------------------------

-- Ensure platform_admins table exists for global bypass
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT ''admin'',
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
)","-- Re-enable RLS on platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY","DROP POLICY IF EXISTS \"Platform admins readable by platform admins\" ON public.platform_admins","CREATE POLICY \"Platform admins readable by platform admins\" 
ON public.platform_admins FOR SELECT TO authenticated 
USING (
    auth_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = auth.uid() AND allowed = true)
)","-- REFINED Helper: is_platform_admin
-- Checks BOTH the dedicated table and legacy app_role
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins 
        WHERE auth_user_id = auth.uid() AND allowed = true
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = ''platform_admin''
    ) OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = ''super_admin''
    );
END;
$$","-- REFINED Helper: current_org_id
-- Prioritizes org_users then user_profiles
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ou.org_id
      FROM public.org_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = ''active''
      ORDER BY ou.created_at DESC
      LIMIT 1
    ),
    (
      SELECT up.organization_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
      LIMIT 1
    )
  );
$$","-- ----------------------------
-- 2) Repair auth_events Schema (Defensive check)
-- ----------------------------

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = ''auth_events'') THEN
        -- Fix org_id foreign key (previously pointed to pay_groups)
        ALTER TABLE public.auth_events 
        DROP CONSTRAINT IF EXISTS auth_events_org_id_fkey;

        ALTER TABLE public.auth_events
        ADD CONSTRAINT auth_events_org_id_fkey 
        FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
END $$","-- ----------------------------
-- 3) Update RLS Policies
-- ----------------------------

-- Organizations
DROP POLICY IF EXISTS \"org_select_policy\" ON public.organizations","DROP POLICY IF EXISTS \"org_select_same_org_or_super_admin\" ON public.organizations","CREATE POLICY \"org_select_policy\" ON public.organizations 
FOR SELECT TO authenticated 
USING (
    public.is_platform_admin() OR 
    id = public.current_org_id()
)","-- Activity Logs (Multi-tenant check)
DROP POLICY IF EXISTS \"activity_logs_select_policy\" ON public.activity_logs","DROP POLICY IF EXISTS \"activity_logs_select_same_org_or_super_admin\" ON public.activity_logs","CREATE POLICY \"activity_logs_select_policy\" ON public.activity_logs 
FOR SELECT TO authenticated 
USING (
    public.is_platform_admin() OR 
    organization_id = public.current_org_id()
)","-- Auth Events (Multi-tenant check)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = ''auth_events'') THEN
        DROP POLICY IF EXISTS \"Platform admins can view all auth events\" ON public.auth_events;
        DROP POLICY IF EXISTS \"Org super admins can view org auth events\" ON public.auth_events;
        DROP POLICY IF EXISTS \"Users can view own auth events\" ON public.auth_events;

        CREATE POLICY \"auth_events_select_policy\" ON public.auth_events 
        FOR SELECT TO authenticated 
        USING (
            public.is_platform_admin() OR 
            (org_id = public.current_org_id() AND (
                user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE id = auth.uid() AND role IN (''super_admin'', ''org_admin'')
                )
            ))
        );
    END IF;
END $$","-- User Profiles
DROP POLICY IF EXISTS \"user_profiles_select_policy\" ON public.user_profiles","DROP POLICY IF EXISTS \"user_profiles_select_own_or_super_admin\" ON public.user_profiles","CREATE POLICY \"user_profiles_select_policy\" ON public.user_profiles
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR 
    id = auth.uid() OR 
    organization_id = public.current_org_id()
)","-- User Invites (Modernize for performance)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = ''user_invites'') THEN
        DROP POLICY IF EXISTS \"Users can view invites addressed to them\" ON public.user_invites;
        CREATE POLICY \"user_invites_self_select_policy\" ON public.user_invites
        FOR SELECT TO authenticated
        USING (
            email = auth.jwt()->>''email'' OR
            inviter_id = auth.uid() OR
            public.is_platform_admin()
        );
    END IF;
END $$","-- ----------------------------
-- 4) Clean up Legacy References
-- ----------------------------

-- Update any functions still using public.profiles
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.user_profiles 
  WHERE id = _user_id
  LIMIT 1
$$","-- Add triggers to sync platform_admins if needed (optional, keeping manual for now)

-- ----------------------------
-- 5) Final Audit Log Entry
-- ----------------------------
COMMENT ON TABLE public.platform_admins IS ''Global platform administrators with cross-tenant access.''"}', 'tighten_obac', NULL, NULL, NULL),
	('20251219000300', '{"-- Fail-safe activate_invited_user trigger
-- Migration: 20251219000300_fail_safe_activation.sql
-- Description: Wraps the activation logic in an EXCEPTION block to ensure ''Error confirming user'' doesn''t block account creation.

CREATE OR REPLACE FUNCTION public.activate_invited_user()
RETURNS TRIGGER AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
    v_org_id UUID;
BEGIN
    -- Only proceed if this is the user''s first login (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- Wrap EVERYTHING in a sub-block to catch and swallow errors
        BEGIN
            RAISE NOTICE ''[activate_invited_user] Activating user: % (ID: %)'', NEW.email, NEW.id;
            
            -- 1. Get org_users record
            SELECT * INTO org_user_rec
            FROM public.org_users
            WHERE user_id = NEW.id AND status = ''invited''
            LIMIT 1;

            IF FOUND THEN
                RAISE NOTICE ''[activate_invited_user] Found invited record: %'', org_user_rec.id;
                
                -- Update status to ''active''
                UPDATE public.org_users
                SET status = ''active''
                WHERE id = org_user_rec.id;

                -- Update user_profiles if it exists
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = ''user_profiles'') THEN
                    UPDATE public.user_profiles
                    SET 
                        organization_id = COALESCE(organization_id, org_user_rec.org_id),
                        activated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = NEW.id;
                END IF;

                -- 2. Process invite metadata
                SELECT * INTO invite_rec
                FROM public.user_invites
                WHERE email = NEW.email 
                  AND status = ''pending''
                  -- Loosen expiry check slightly to handle clock drift or late activation
                  AND (expires_at > (now() - INTERVAL ''1 day''))
                ORDER BY created_at DESC
                LIMIT 1;

                IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                    -- Mark invite as accepted
                    UPDATE public.user_invites SET status = ''accepted'' WHERE id = invite_rec.id;

                    -- Process role sets
                    DECLARE
                        org_assignment JSONB;
                        role_key TEXT;
                        company_id_val TEXT;
                    BEGIN
                        -- Safety check: ensure role_data->''orgs'' is an array
                        IF jsonb_typeof(invite_rec.role_data->''orgs'') = ''array'' THEN
                            FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->''orgs'')::jsonb)
                            LOOP
                                -- Safely extract orgId
                                BEGIN
                                    v_org_id := (org_assignment->>''orgId'')::UUID;
                                    
                                    -- Assign roles
                                    IF jsonb_typeof(org_assignment->''roles'') = ''array'' THEN
                                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->''roles'')::jsonb)
                                        LOOP
                                            SELECT id INTO role_rec FROM public.org_roles 
                                            WHERE org_id = v_org_id AND key = role_key LIMIT 1;

                                            IF FOUND THEN
                                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                                VALUES (org_user_rec.id, role_rec.id)
                                                ON CONFLICT DO NOTHING;
                                            END IF;
                                        END LOOP;
                                    END IF;

                                    -- Assign companies
                                    IF jsonb_typeof(org_assignment->''companyIds'') = ''array'' THEN
                                        FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->''companyIds'')::jsonb)
                                        LOOP
                                            INSERT INTO public.user_company_memberships (user_id, company_id)
                                            VALUES (NEW.id, company_id_val::UUID)
                                            ON CONFLICT DO NOTHING;
                                        END LOOP;
                                    END IF;

                                EXCEPTION WHEN OTHERS THEN
                                    RAISE NOTICE ''[activate_invited_user] Failed processing an org assignment: %'', SQLERRM;
                                END;
                            END LOOP;
                        END IF;
                    END;
                END IF;

                -- 3. Legacy compatibility
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = ''user_roles'') THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, ''employee'')
                    ON CONFLICT DO NOTHING;
                END IF;

            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- CRITICAL: Catch ALL errors and log them as a notice.
            -- This prevents the outer transaction (auth.users update) from failing.
            RAISE NOTICE ''[activate_invited_user] FATAL ERROR during provisioning: %'', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER"}', 'fail_safe_activation', NULL, NULL, NULL),
	('20251219000400', '{"-- Establish missing audit and auth event tables
-- Migration: 20251219000400_establish_audit_tables.sql
-- Description: Creates auth_events and activity_logs tables if they are missing or improperly configured.

-- 1. Create auth_events table (used by AuthLogger service)
CREATE TABLE IF NOT EXISTS public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    geo_location JSONB,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT ''{}''::jsonb
)","-- Enable RLS
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY","-- 2. Create activity_logs table (standardized audit log)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT ''{}''::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)","-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY","-- 3. Basic RLS Policies (Modern OBAC compatible)
-- Note: is_platform_admin() and current_org_id() are defined in 20251219000200_tighten_obac.sql

-- Auth Events Select
DROP POLICY IF EXISTS \"auth_events_select_policy\" ON public.auth_events","CREATE POLICY \"auth_events_select_policy\" ON public.auth_events
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR 
    (org_id = public.current_org_id() AND (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN (''super_admin'', ''org_admin'')
        )
    ))
)","-- Auth Events Insert (Allow anyone to log their own events)
DROP POLICY IF EXISTS \"auth_events_insert_policy\" ON public.auth_events","CREATE POLICY \"auth_events_insert_policy\" ON public.auth_events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid())","-- Activity Logs Select
DROP POLICY IF EXISTS \"activity_logs_select_policy\" ON public.activity_logs","CREATE POLICY \"activity_logs_select_policy\" ON public.activity_logs
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR 
    organization_id = public.current_org_id()
)","-- Activity Logs Insert
DROP POLICY IF EXISTS \"activity_logs_insert_policy\" ON public.activity_logs","CREATE POLICY \"activity_logs_insert_policy\" ON public.activity_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid())","-- 4. Repopulate indexes
CREATE INDEX IF NOT EXISTS idx_auth_events_org_user ON public.auth_events(org_id, user_id)","CREATE INDEX IF NOT EXISTS idx_auth_events_timestamp ON public.auth_events(timestamp_utc)","CREATE INDEX IF NOT EXISTS idx_activity_logs_org_user ON public.activity_logs(organization_id, user_id)","CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at)"}', 'establish_audit_tables', NULL, NULL, NULL),
	('20251219000500', '{"-- Diagnostic helper for user state
-- Migration: 20251219000500_diagnostic_helpers.sql

CREATE OR REPLACE FUNCTION public.get_user_diagnostic_data(_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    result JSONB;
    v_user_id UUID;
    auth_user RECORD;
    profile_record RECORD;
    org_user_record RECORD;
    invite_record RECORD;
BEGIN
    -- 1. Find the user ID from auth.users (case-insensitive)
    SELECT id, email, confirmed_at, last_sign_in_at, created_at, raw_user_meta_data 
    INTO auth_user
    FROM auth.users 
    WHERE email = LOWER(_email)
    LIMIT 1;

    IF NOT FOUND THEN
        -- Try exact match if lower failed (just in case)
        SELECT id, email, confirmed_at, last_sign_in_at, created_at, raw_user_meta_data 
        INTO auth_user
        FROM auth.users 
        WHERE email = _email
        LIMIT 1;
    END IF;

    IF auth_user.id IS NULL THEN
        RETURN jsonb_build_object(''error'', ''User not found in auth.users'', ''searched_email'', _email);
    END IF;

    v_user_id := auth_user.id;

    -- 2. Get User Profile
    SELECT * INTO profile_record FROM public.user_profiles WHERE id = v_user_id;

    -- 3. Get Org User status
    SELECT * INTO org_user_record FROM public.org_users WHERE user_id = v_user_id;

    -- 4. Get Invitations
    SELECT * INTO invite_record FROM public.user_invites WHERE email ILIKE _email ORDER BY created_at DESC LIMIT 1;

    -- Build the result blob
    result := jsonb_build_object(
        ''auth_user'', jsonb_build_object(
            ''id'', auth_user.id,
            ''email'', auth_user.email,
            ''confirmed_at'', auth_user.confirmed_at,
            ''last_sign_in_at'', auth_user.last_sign_in_at,
            ''created_at'', auth_user.created_at,
            ''meta_org_id'', auth_user.raw_user_meta_data->>''organization_id''
        ),
        ''profile'', CASE WHEN profile_record.id IS NOT NULL THEN 
            jsonb_build_object(
                ''id'', profile_record.id,
                ''email'', profile_record.email,
                ''organization_id'', profile_record.organization_id,
                ''role'', profile_record.role,
                ''locked_at'', profile_record.locked_at,
                ''failed_attempts'', profile_record.failed_login_attempts
            )
        ELSE NULL END,
        ''org_user'', CASE WHEN org_user_record.id IS NOT NULL THEN
            jsonb_build_object(
                ''status'', org_user_record.status,
                ''org_id'', org_user_record.org_id
            )
        ELSE NULL END,
        ''invitation'', CASE WHEN invite_record.id IS NOT NULL THEN
            jsonb_build_object(
                ''status'', invite_record.status,
                ''expires_at'', invite_record.expires_at,
                ''tenant_id'', invite_record.tenant_id
            )
        ELSE NULL END
    );

    RETURN result;
END;
$$"}', 'diagnostic_helpers', NULL, NULL, NULL);


--
-- Data for Name: seed_files; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

-- \unrestrict urRsvuKfYVRaWO3xsQXd0UBXHIiCaWR2g1rHFdlDNAlyf6TCRJQsaKWfnP3xgZR

RESET ALL;
