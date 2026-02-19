
-- ============================================================
-- Phase 2: Contract Generation Tables
-- ============================================================

-- 1. Contract Templates
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  country_code TEXT,
  employment_type TEXT, -- permanent, contract, intern, expatriate, casual, etc.
  body_html TEXT NOT NULL DEFAULT '',
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{key, label, default_value}]
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates"
  ON public.contract_templates FOR SELECT
  USING (organization_id = public.current_org_id());

CREATE POLICY "Org admins can manage templates"
  ON public.contract_templates FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Employee Contracts
CREATE TABLE public.employee_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','active','expired','terminated')),
  start_date DATE,
  end_date DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  salary_snapshot JSONB, -- {pay_rate, pay_type, currency, benefits[], allowances[]}
  terms_snapshot JSONB, -- {probation_months, notice_period_days, other terms}
  body_html TEXT, -- rendered contract body at time of creation
  signed_by_employee_at TIMESTAMPTZ,
  signed_by_employer_at TIMESTAMPTZ,
  signed_by_employer_name TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view contracts"
  ON public.employee_contracts FOR SELECT
  USING (organization_id = public.current_org_id());

CREATE POLICY "Org admins can manage contracts"
  ON public.employee_contracts FOR ALL
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE TRIGGER update_employee_contracts_updated_at
  BEFORE UPDATE ON public.employee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_contract_templates_org ON public.contract_templates(organization_id);
CREATE INDEX idx_employee_contracts_org ON public.employee_contracts(organization_id);
CREATE INDEX idx_employee_contracts_employee ON public.employee_contracts(employee_id);
CREATE INDEX idx_employee_contracts_status ON public.employee_contracts(status);
