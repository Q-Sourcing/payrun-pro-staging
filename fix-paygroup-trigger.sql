-- Fix the paygroup assignment trigger that references non-existent organization_id column
-- This will resolve the "column e.organization_id does not exist" error

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trg_enforce_unique_paygroup ON paygroup_employees;
DROP FUNCTION IF EXISTS enforce_unique_or_smart_paygroup_assignment();

-- Create a simplified function that doesn't reference organization_id
CREATE OR REPLACE FUNCTION enforce_unique_paygroup_assignment()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count int;
BEGIN
  -- Skip check if assignment is being deactivated
  IF (NEW.active = false) THEN 
    RETURN NEW; 
  END IF;

  -- Check for duplicate assignments based on employee identification
  SELECT COUNT(*) INTO duplicate_count
  FROM paygroup_employees pe
  JOIN employees e ON e.id = pe.employee_id
  WHERE pe.active = true
    AND (
      (e.national_id IS NOT NULL AND e.national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id)) OR
      (e.tin IS NOT NULL AND e.tin = (SELECT tin FROM employees WHERE id = NEW.employee_id)) OR
      (e.social_security_number IS NOT NULL AND e.social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id))
    )
    AND pe.employee_id != NEW.employee_id;

  -- If duplicates found, deactivate old assignments (smart mode)
  IF duplicate_count > 0 THEN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trg_enforce_unique_paygroup
  BEFORE INSERT OR UPDATE ON paygroup_employees
  FOR EACH ROW EXECUTE FUNCTION enforce_unique_paygroup_assignment();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION enforce_unique_paygroup_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_unique_paygroup_assignment() TO anon;
