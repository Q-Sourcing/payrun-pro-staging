-- ==========================================================
-- 🔧 Populate Pay Items from PayRun Employees Relationships
-- ==========================================================
-- This script populates the pay_items table based on the payrun_employees relationships
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Clear existing pay_items to start fresh
DELETE FROM pay_items;

-- Insert pay_items based on payrun_employees relationships
INSERT INTO pay_items (
  pay_run_id,
  employee_id,
  hours_worked,
  pieces_completed,
  gross_pay,
  tax_deduction,
  benefit_deductions,
  total_deductions,
  net_pay,
  notes,
  created_at,
  updated_at
)
SELECT 
  pe.pay_run_id,
  pe.employee_id,
  CASE 
    WHEN e.pay_type = 'hourly' THEN 40.0  -- Default 40 hours for hourly employees
    ELSE NULL
  END as hours_worked,
  CASE 
    WHEN e.pay_type = 'piece_rate' THEN 100  -- Default 100 pieces for piece rate employees
    ELSE NULL
  END as pieces_completed,
  e.pay_rate as gross_pay,
  e.pay_rate * 0.1 as tax_deduction,  -- 10% tax
  e.pay_rate * 0.05 as benefit_deductions,  -- 5% benefits
  e.pay_rate * 0.15 as total_deductions,  -- Total deductions (10% + 5%)
  e.pay_rate * 0.85 as net_pay,  -- Net pay (85% of gross)
  'Auto-generated from payrun_employees relationship' as notes,
  NOW() as created_at,
  NOW() as updated_at
FROM payrun_employees pe
JOIN employees e ON e.id = pe.employee_id
WHERE e.status = 'active'
ON CONFLICT (pay_run_id, employee_id) DO UPDATE SET
  gross_pay = EXCLUDED.gross_pay,
  tax_deduction = EXCLUDED.tax_deduction,
  benefit_deductions = EXCLUDED.benefit_deductions,
  total_deductions = EXCLUDED.total_deductions,
  net_pay = EXCLUDED.net_pay,
  updated_at = NOW();

-- Verify the results
SELECT 
  pr.id as pay_run_id,
  pr.pay_run_date,
  pg.name as pay_group_name,
  COUNT(pi.id) as employee_count,
  SUM(pi.gross_pay) as total_gross,
  SUM(pi.net_pay) as total_net
FROM pay_runs pr
LEFT JOIN pay_items pi ON pi.pay_run_id = pr.id
LEFT JOIN pay_groups pg ON pg.id = pr.pay_group_id
GROUP BY pr.id, pr.pay_run_date, pg.name
ORDER BY pr.pay_run_date DESC;
