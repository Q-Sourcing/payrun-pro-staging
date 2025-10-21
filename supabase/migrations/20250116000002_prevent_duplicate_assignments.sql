-- Prevent duplicate employee assignments to pay groups
-- This ensures data integrity at the database level

-- First, clean up existing duplicates by keeping only the most recent assignment
WITH duplicates AS (
  SELECT 
    employee_id, 
    pay_group_id,
    MIN(assigned_at) as first_assigned,
    MAX(assigned_at) as last_assigned,
    COUNT(*) as duplicate_count
  FROM paygroup_employees 
  WHERE active = true
  GROUP BY employee_id, pay_group_id
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT pe.id
  FROM paygroup_employees pe
  JOIN duplicates d ON pe.employee_id = d.employee_id AND pe.pay_group_id = d.pay_group_id
  WHERE pe.assigned_at != d.last_assigned
)
DELETE FROM paygroup_employees 
WHERE id IN (SELECT id FROM to_delete);

-- Add unique constraint to prevent the same employee from being assigned to the same pay group multiple times
ALTER TABLE paygroup_employees 
ADD CONSTRAINT unique_employee_in_paygroup 
UNIQUE (employee_id, pay_group_id);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT unique_employee_in_paygroup ON paygroup_employees 
IS 'Ensures each employee can only be assigned to a pay group once';
