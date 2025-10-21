-- Fix the foreign key constraint for paygroup_employees to support both pay_groups and expatriate_pay_groups
-- This will resolve the "violates foreign key constraint" error when assigning employees to expatriate pay groups

-- First, drop the existing foreign key constraint
ALTER TABLE paygroup_employees DROP CONSTRAINT IF EXISTS paygroup_employees_pay_group_id_fkey;

-- Create a function to validate pay_group_id exists in either table
CREATE OR REPLACE FUNCTION validate_pay_group_id(pay_group_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if the ID exists in pay_groups table
  IF EXISTS (SELECT 1 FROM pay_groups WHERE id = pay_group_id) THEN
    RETURN true;
  END IF;
  
  -- Check if the ID exists in expatriate_pay_groups table
  IF EXISTS (SELECT 1 FROM expatriate_pay_groups WHERE id = pay_group_id) THEN
    RETURN true;
  END IF;
  
  -- If not found in either table, return false
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to validate pay_group_id on insert/update
CREATE OR REPLACE FUNCTION validate_paygroup_employees_pay_group_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation if pay_group_id is null (should be handled by NOT NULL constraint)
  IF NEW.pay_group_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate that the pay_group_id exists in either table
  IF NOT validate_pay_group_id(NEW.pay_group_id) THEN
    RAISE EXCEPTION 'Pay group ID % does not exist in pay_groups or expatriate_pay_groups table', NEW.pay_group_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_validate_paygroup_employees_pay_group_id ON paygroup_employees;
CREATE TRIGGER trg_validate_paygroup_employees_pay_group_id
  BEFORE INSERT OR UPDATE ON paygroup_employees
  FOR EACH ROW EXECUTE FUNCTION validate_paygroup_employees_pay_group_id();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_pay_group_id ON paygroup_employees(pay_group_id);
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_employee_id ON paygroup_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_active ON paygroup_employees(active);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_pay_group_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_pay_group_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION validate_paygroup_employees_pay_group_id() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_paygroup_employees_pay_group_id() TO anon;
