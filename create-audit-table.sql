-- Create audit log table for payroll calculations
-- Run this in your Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.pay_calculation_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  pay_run_id UUID REFERENCES public.pay_runs(id),
  input_data JSONB,
  output_data JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pay_calculation_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pay_calculation_audit_log'
      AND policyname = 'Service role can insert audit logs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Service role can insert audit logs"
      ON public.pay_calculation_audit_log
      FOR INSERT
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
    $q$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pay_calculation_audit_log'
      AND policyname = 'Authenticated users can read audit logs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Authenticated users can read audit logs"
      ON public.pay_calculation_audit_log
      FOR SELECT
      USING ((auth.jwt() ->> 'role') = 'authenticated');
    $q$;
  END IF;
END$$;

SELECT 'Audit table created successfully!' as status;
