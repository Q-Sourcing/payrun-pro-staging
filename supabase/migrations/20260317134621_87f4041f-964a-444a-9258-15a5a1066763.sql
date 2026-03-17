
CREATE TABLE IF NOT EXISTS public.payroll_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payrun_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  benefit_id uuid,
  benefit_name text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  cost_type text NOT NULL DEFAULT 'fixed',
  entry_type text NOT NULL DEFAULT 'benefit',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_benefits_payrun_employee_benefit_unique UNIQUE (payrun_id, employee_id, benefit_id)
);

ALTER TABLE public.payroll_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payroll_benefits for their org pay runs"
  ON public.payroll_benefits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pay_runs pr
      WHERE pr.id = payroll_benefits.payrun_id
        AND (
          public.is_platform_admin()
          OR pr.organization_id = public.current_org_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pay_runs pr
      WHERE pr.id = payroll_benefits.payrun_id
        AND (
          public.is_platform_admin()
          OR pr.organization_id = public.current_org_id()
        )
    )
  );

CREATE TRIGGER set_payroll_benefits_updated_at
  BEFORE UPDATE ON public.payroll_benefits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
