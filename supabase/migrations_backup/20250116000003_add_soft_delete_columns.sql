-- Add missing columns for soft delete functionality to paygroup_employees table
-- This fixes the "Could not find 'removed_at' column" error

-- Add the missing columns
ALTER TABLE paygroup_employees
ADD COLUMN IF NOT EXISTS removed_at timestamptz,
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Create index for better performance on active status queries
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_active ON paygroup_employees(active);
CREATE INDEX IF NOT EXISTS idx_paygroup_employees_removed_at ON paygroup_employees(removed_at);

-- Update existing records to have active = true (in case some were created before this migration)
UPDATE paygroup_employees 
SET active = true 
WHERE active IS NULL;

-- Add comment to document the soft delete functionality
COMMENT ON COLUMN paygroup_employees.active IS 'Indicates if the assignment is active (true) or soft-deleted (false)';
COMMENT ON COLUMN paygroup_employees.removed_at IS 'Timestamp when the assignment was soft-deleted, null for active assignments';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON paygroup_employees TO authenticated;
GRANT SELECT, INSERT, UPDATE ON paygroup_employees TO anon;
