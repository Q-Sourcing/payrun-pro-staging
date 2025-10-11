-- Create audit log table for payroll calculations
CREATE TABLE IF NOT EXISTS public.pay_calculation_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  pay_run_id UUID REFERENCES pay_runs(id),
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  calculation_type TEXT DEFAULT 'payroll_calculation',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pay_calculation_audit_employee_id ON pay_calculation_audit_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_pay_calculation_audit_pay_run_id ON pay_calculation_audit_log(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_pay_calculation_audit_calculated_at ON pay_calculation_audit_log(calculated_at);

-- Enable RLS
ALTER TABLE public.pay_calculation_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Authenticated users can view audit logs" ON public.pay_calculation_audit_log 
FOR SELECT TO authenticated USING (true);

-- Create RLS policy for service role to insert audit logs
CREATE POLICY "Service role can insert audit logs" ON public.pay_calculation_audit_log 
FOR INSERT TO service_role USING (true);

-- Add comment
COMMENT ON TABLE public.pay_calculation_audit_log IS 'Audit log for payroll calculations performed by Edge Functions';
