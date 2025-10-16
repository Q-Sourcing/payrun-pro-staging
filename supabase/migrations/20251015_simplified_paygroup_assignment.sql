-- Simplified migration to avoid conflicts with existing policies

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
