-- ==========================================================
-- 🔧 Create PayRun Employees Relationship Table
-- ==========================================================
-- Run this SQL in your Supabase Dashboard SQL Editor
-- This will fix the "0 employees" issue in pay runs

CREATE TABLE IF NOT EXISTS payrun_employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id UUID NOT NULL REFERENCES pay_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_group_id UUID NOT NULL REFERENCES pay_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pay_run_id, employee_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payrun_employees_pay_run_id ON payrun_employees(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_payrun_employees_employee_id ON payrun_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrun_employees_pay_group_id ON payrun_employees(pay_group_id);

-- Insert the relationships based on pay_group_id
INSERT INTO payrun_employees (pay_run_id, employee_id, pay_group_id, created_at, updated_at)
SELECT 
  pr.id as pay_run_id,
  e.id as employee_id,
  pr.pay_group_id,
  NOW() as created_at,
  NOW() as updated_at
FROM pay_runs pr
JOIN employees e ON e.pay_group_id = pr.pay_group_id
ON CONFLICT (pay_run_id, employee_id) DO NOTHING;

-- Verify the relationships were created
SELECT 
  pr.id as pay_run_id,
  pr.name as pay_run_name,
  COUNT(pe.employee_id) as employee_count
FROM pay_runs pr
LEFT JOIN payrun_employees pe ON pe.pay_run_id = pr.id
GROUP BY pr.id, pr.name
ORDER BY pr.created_at DESC;
