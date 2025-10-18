-- ==========================================================
-- 🔧 Fix Schema and Enhance Employee Management
-- ==========================================================
-- This migration fixes the pay_groups schema cache issue and extends employee management

-- STEP 1: Fix pay_groups schema cache issue by adding 'type' column
ALTER TABLE pay_groups
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'local';

-- Add a check constraint to ensure valid types
ALTER TABLE pay_groups
ADD CONSTRAINT check_pay_groups_type 
CHECK (type IN ('local', 'expatriate', 'contractor', 'intern', 'temporary'));

-- STEP 2: Extend employees table with new columns for comprehensive employee management
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'Local';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_category TEXT CHECK (
  employee_category IN ('Intern','Trainee','Temporary','Permanent','On Contract','Casual')
);

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_status TEXT CHECK (
  employment_status IN ('Active','Terminated','Deceased','Resigned','Probation','Notice Period')
) DEFAULT 'Active';

-- Update pay_type enum to include Daily Rate for expatriates
ALTER TYPE pay_type ADD VALUE IF NOT EXISTS 'daily_rate';

-- Add index for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON employees(employee_type);
CREATE INDEX IF NOT EXISTS idx_employees_employee_category ON employees(employee_category);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_pay_groups_type ON pay_groups(type);

-- STEP 3: Update existing data to have proper defaults
UPDATE employees 
SET employee_type = 'Local', employment_status = 'Active' 
WHERE employee_type IS NULL OR employment_status IS NULL;

UPDATE pay_groups 
SET type = 'local' 
WHERE type IS NULL;

-- STEP 4: Add comments for documentation
COMMENT ON COLUMN pay_groups.type IS 'Pay group type: local, expatriate, contractor, intern, temporary';
COMMENT ON COLUMN employees.employee_type IS 'Employee type: Local or Expatriate';
COMMENT ON COLUMN employees.employee_category IS 'Employee category: Intern, Trainee, Temporary, Permanent, On Contract, Casual';
COMMENT ON COLUMN employees.employment_status IS 'Employment status: Active, Terminated, Deceased, Resigned, Probation, Notice Period';

-- STEP 5: Create analytics views for better reporting

-- View 1: Active pay runs with comprehensive employee and pay group information
CREATE OR REPLACE VIEW vw_active_payruns AS
SELECT
  pr.id AS pay_run_id,
  pr.pay_run_date,
  pr.pay_period_start,
  pr.pay_period_end,
  pg.type AS payroll_type,
  pg.name AS pay_group_name,
  e.employee_type,
  e.employee_category,
  e.employment_status,
  e.pay_type,
  e.country,
  e.currency,
  e.first_name,
  e.last_name,
  e.employee_number,
  pr.net_pay,
  pr.created_at
FROM pay_runs pr
LEFT JOIN pay_groups pg ON pr.pay_group_id = pg.id
LEFT JOIN employees e ON e.id = pr.employee_id
WHERE
  (
    e.employment_status = 'Active'
    OR pr.pay_run_date >= (NOW() - INTERVAL '90 days')
  )
ORDER BY pr.created_at DESC;

-- View 2: Payroll summary by type and category
CREATE OR REPLACE VIEW vw_payroll_summary AS
SELECT
  pg.type AS payroll_type,
  e.employee_category,
  COUNT(DISTINCT pr.id) AS total_payruns,
  COUNT(DISTINCT e.id) AS total_employees,
  SUM(pr.net_pay) AS total_payout,
  AVG(pr.net_pay) AS avg_net_pay,
  MIN(pr.pay_run_date) AS first_payrun_date,
  MAX(pr.pay_run_date) AS last_payrun_date
FROM pay_runs pr
LEFT JOIN pay_groups pg ON pr.pay_group_id = pg.id
LEFT JOIN employees e ON e.id = pr.employee_id
WHERE e.employment_status = 'Active'
GROUP BY pg.type, e.employee_category
ORDER BY pg.type, e.employee_category;

-- View 3: Employee summary by type and category
CREATE OR REPLACE VIEW vw_employee_summary AS
SELECT
  employee_type,
  employee_category,
  employment_status,
  COUNT(*) AS employee_count,
  AVG(pay_rate) AS avg_pay_rate,
  COUNT(CASE WHEN pay_type = 'daily_rate' THEN 1 END) AS daily_rate_employees,
  COUNT(CASE WHEN pay_type = 'salary' THEN 1 END) AS salary_employees,
  COUNT(CASE WHEN pay_type = 'hourly' THEN 1 END) AS hourly_employees,
  COUNT(CASE WHEN pay_type = 'piece_rate' THEN 1 END) AS piece_rate_employees
FROM employees
GROUP BY employee_type, employee_category, employment_status
ORDER BY employee_type, employee_category, employment_status;

-- STEP 6: Create functions for payroll logic

-- Function to determine pay type based on employee type and category
CREATE OR REPLACE FUNCTION get_employee_pay_type(
  emp_type TEXT,
  emp_category TEXT DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
  -- Expatriates always use daily rate
  IF emp_type = 'Expatriate' THEN
    RETURN 'daily_rate';
  END IF;
  
  -- Local employees logic
  IF emp_type = 'Local' THEN
    CASE emp_category
      WHEN 'Intern', 'Trainee' THEN
        RETURN 'salary'; -- Flat monthly stipend
      WHEN 'Casual' THEN
        RETURN 'hourly'; -- Can be changed to piece_rate if needed
      WHEN 'Permanent', 'On Contract', 'Temporary' THEN
        RETURN 'salary'; -- Standard monthly payroll
      ELSE
        RETURN 'salary'; -- Default
    END CASE;
  END IF;
  
  RETURN 'salary'; -- Default fallback
END;
$$ LANGUAGE plpgsql;

-- Function to get filtered pay groups based on employee type and category
CREATE OR REPLACE FUNCTION get_filtered_pay_groups(
  emp_type TEXT,
  emp_category TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  country TEXT,
  pay_frequency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pg.id, pg.name, pg.type, pg.country, pg.pay_frequency
  FROM pay_groups pg
  WHERE 
    CASE 
      WHEN emp_type = 'Expatriate' THEN pg.type = 'expatriate'
      WHEN emp_type = 'Local' THEN pg.type = 'local'
      ELSE true
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON vw_active_payruns TO authenticated;
GRANT SELECT ON vw_payroll_summary TO authenticated;
GRANT SELECT ON vw_employee_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_pay_type TO authenticated;
GRANT EXECUTE ON FUNCTION get_filtered_pay_groups TO authenticated;
