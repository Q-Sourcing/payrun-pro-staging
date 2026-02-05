-- Ensure each employee can only belong to one active pay group at a time
-- This prevents payroll conflicts and ensures data integrity

-- First, clean up any existing duplicate active assignments
-- Keep only the most recent assignment for each employee
WITH duplicates AS (
  SELECT 
    employee_id,
    MIN(assigned_at) as first_assigned,
    MAX(assigned_at) as last_assigned,
    COUNT(*) as duplicate_count
  FROM paygroup_employees
  WHERE active = true
  GROUP BY employee_id
  HAVING COUNT(*) > 1
),
to_deactivate AS (
  SELECT pe.id
  FROM paygroup_employees pe
  JOIN duplicates d ON pe.employee_id = d.employee_id
  WHERE pe.active = true AND pe.assigned_at != d.last_assigned
)
UPDATE paygroup_employees 
SET active = false, removed_at = NOW()
WHERE id IN (SELECT id FROM to_deactivate);

-- Add a partial unique index to ensure only one active assignment per employee
-- This constraint only applies to active assignments (active = true)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_employee_paygroup 
ON paygroup_employees (employee_id) 
WHERE active = true;

-- Add comment to document the constraint
COMMENT ON INDEX unique_active_employee_paygroup 
IS 'Ensures each employee can only be in one active pay group at a time';

-- Create a function to validate single pay group assignment
CREATE OR REPLACE FUNCTION validate_single_paygroup_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for active assignments
  IF NEW.active = true THEN
    -- Check if employee is already in another active pay group
    IF EXISTS (
      SELECT 1 FROM paygroup_employees 
      WHERE employee_id = NEW.employee_id 
        AND active = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Employee is already assigned to another active pay group. Only one pay group per employee is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single pay group constraint
DROP TRIGGER IF EXISTS trg_validate_single_paygroup ON paygroup_employees;
CREATE TRIGGER trg_validate_single_paygroup
  BEFORE INSERT OR UPDATE ON paygroup_employees
  FOR EACH ROW EXECUTE FUNCTION validate_single_paygroup_assignment();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_single_paygroup_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_single_paygroup_assignment() TO anon;
