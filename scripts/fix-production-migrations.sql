-- ===============================================================
-- FIX PRODUCTION MIGRATIONS - SAFE MIGRATION SCRIPT
-- ===============================================================
-- Purpose: Apply the 4 missing migrations to production safely
-- Instructions: Run this in Supabase Dashboard > SQL Editor
-- ===============================================================

-- ===============================================================
-- MIGRATION 1: 20250929100000 - Payslip Templates System
-- ===============================================================

-- Create payslip templates table
CREATE TABLE IF NOT EXISTS public.payslip_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payslip generations log table
CREATE TABLE IF NOT EXISTS public.payslip_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.payslip_templates(id) ON DELETE CASCADE,
    pay_run_id UUID REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    export_format TEXT NOT NULL DEFAULT 'pdf',
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.payslip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payslip_templates
CREATE POLICY "Users can view their own payslip templates" 
ON public.payslip_templates FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payslip templates" 
ON public.payslip_templates FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payslip templates" 
ON public.payslip_templates FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payslip templates" 
ON public.payslip_templates FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create RLS policies for payslip_generations
CREATE POLICY "Users can view payslip generations for their templates" 
ON public.payslip_generations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.payslip_templates 
        WHERE id = template_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert payslip generations" 
ON public.payslip_generations FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payslip_templates_user_id ON public.payslip_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_payslip_templates_is_default ON public.payslip_templates(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_payslip_generations_template_id ON public.payslip_generations(template_id);
CREATE INDEX IF NOT EXISTS idx_payslip_generations_pay_run_id ON public.payslip_generations(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_payslip_generations_employee_id ON public.payslip_generations(employee_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payslip_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payslip_templates_updated_at ON public.payslip_templates;
CREATE TRIGGER update_payslip_templates_updated_at
    BEFORE UPDATE ON public.payslip_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_payslip_templates_updated_at();

-- ===============================================================
-- MIGRATION 2: 20250929110000 - Expatriate PayGroups System
-- ===============================================================

-- Create expatriate_pay_groups table with proper schema
CREATE TABLE IF NOT EXISTS expatriate_pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paygroup_id text UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  currency text DEFAULT 'USD',
  exchange_rate_to_local numeric(12,4) NOT NULL DEFAULT 0,
  tax_country text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expatriate_pay_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_groups"
AS permissive FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_groups"
AS permissive FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_groups"
AS permissive FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_groups"
AS permissive FOR DELETE
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_country ON expatriate_pay_groups(country);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_currency ON expatriate_pay_groups(currency);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_groups_tax_country ON expatriate_pay_groups(tax_country);

-- Create expatriate_pay_run_items table
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
);

-- Enable RLS for expatriate_pay_run_items
ALTER TABLE expatriate_pay_run_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expatriate_pay_run_items
CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_run_items"
AS permissive FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_run_items"
AS permissive FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_run_items"
AS permissive FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_run_items"
AS permissive FOR DELETE
TO authenticated
USING (true);

-- Create indexes for expatriate_pay_run_items
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_pay_run_id ON expatriate_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_employee_id ON expatriate_pay_run_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_expatriate_pay_run_items_expatriate_pay_group_id ON expatriate_pay_run_items(expatriate_pay_group_id);

-- ===============================================================
-- MIGRATION 3: 20251014 - Configurable PayGroup Assignment System
-- ===============================================================

-- Create payroll configurations table
CREATE TABLE IF NOT EXISTS payroll_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  use_strict_mode boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Create paygroup_employees link table
CREATE TABLE IF NOT EXISTS paygroup_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_group_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  notes text
);

-- Enable RLS
ALTER TABLE payroll_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paygroup_employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payroll_configurations
CREATE POLICY "Allow authenticated users to view payroll configs"
ON payroll_configurations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage payroll configs"
ON payroll_configurations FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for paygroup_employees
CREATE POLICY "Allow authenticated users to view paygroup employees"
ON paygroup_employees FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage paygroup employees"
ON paygroup_employees FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_pge_group ON paygroup_employees (pay_group_id);
CREATE INDEX IF NOT EXISTS idx_pge_employee ON paygroup_employees (employee_id);
CREATE INDEX IF NOT EXISTS idx_pge_active ON paygroup_employees (active);

-- ===============================================================
-- MIGRATION 4: 20251015 - Simplified PayGroup Assignment System
-- ===============================================================

-- Ensure identification fields exist on employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS national_id text,
ADD COLUMN IF NOT EXISTS tin text,
ADD COLUMN IF NOT EXISTS social_security_number text,
ADD COLUMN IF NOT EXISTS passport_number text;

-- Create indexes for identification fields
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees (national_id);
CREATE INDEX IF NOT EXISTS idx_employees_tin ON employees (tin);
CREATE INDEX IF NOT EXISTS idx_employees_ssn ON employees (social_security_number);

-- Create function for assignment validation
CREATE OR REPLACE FUNCTION enforce_unique_paygroup_assignment()
RETURNS trigger AS $$
DECLARE
  org_mode boolean;
  duplicate_count int;
BEGIN
  -- Get organization mode (default to strict)
  SELECT use_strict_mode INTO org_mode 
  FROM payroll_configurations 
  WHERE organization_id = (SELECT organization_id FROM employees WHERE id = NEW.employee_id)
  LIMIT 1;
  
  IF org_mode IS NULL THEN 
    org_mode := true; -- default strict mode
  END IF;
  
  -- Skip validation for inactive assignments
  IF NEW.active = false THEN 
    RETURN NEW; 
  END IF;

  -- Check for duplicate active assignments based on identification
  SELECT COUNT(*) INTO duplicate_count
  FROM paygroup_employees pe
  JOIN employees e ON e.id = pe.employee_id
  WHERE pe.active = true
    AND pe.employee_id != NEW.employee_id
    AND (
      (e.national_id IS NOT NULL AND e.national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id)) OR
      (e.tin IS NOT NULL AND e.tin = (SELECT tin FROM employees WHERE id = NEW.employee_id)) OR
      (e.social_security_number IS NOT NULL AND e.social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id))
    );

  -- Handle based on mode
  IF duplicate_count > 0 THEN
    IF org_mode = true THEN
      RAISE EXCEPTION 'Strict Mode: Employee with same identification already active in another paygroup.';
    ELSE
      -- Smart mode: deactivate old assignments
      UPDATE paygroup_employees
      SET active = false
      WHERE employee_id IN (
        SELECT id FROM employees WHERE
          (national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id) AND national_id IS NOT NULL) OR
          (tin = (SELECT tin FROM employees WHERE id = NEW.employee_id) AND tin IS NOT NULL) OR
          (social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id) AND social_security_number IS NOT NULL)
      )
      AND id != NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_enforce_unique_paygroup ON paygroup_employees;
CREATE TRIGGER trg_enforce_unique_paygroup
  BEFORE INSERT OR UPDATE ON paygroup_employees
  FOR EACH ROW EXECUTE FUNCTION enforce_unique_paygroup_assignment();

-- ===============================================================
-- VERIFICATION QUERIES
-- ===============================================================

-- Check if all tables were created successfully
SELECT 'Tables Created:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payslip_templates', 'payslip_generations', 'expatriate_pay_groups', 'expatriate_pay_run_items', 'payroll_configurations', 'paygroup_employees')
ORDER BY table_name;

-- Check if identification columns were added
SELECT 'Employee Identification Columns:' as status;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN ('national_id', 'tin', 'social_security_number', 'passport_number')
ORDER BY column_name;

-- Check if indexes were created
SELECT 'Performance Indexes:' as status;
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('paygroup_employees', 'employees')
AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Check if functions were created
SELECT 'Functions Created:' as status;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('update_payslip_templates_updated_at', 'enforce_unique_paygroup_assignment')
ORDER BY routine_name;

SELECT '🎉 PRODUCTION MIGRATION COMPLETE!' as final_status;
