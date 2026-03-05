-- ============================================================
-- DUAL-TRACK PAYROLL ENGINE: Variable Pay Support
-- ============================================================

-- 1. Items Catalog: pre-defined work items / consumables with costs
CREATE TABLE IF NOT EXISTS public.items_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'unit',
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Variable Pay Cycles
CREATE TABLE IF NOT EXISTS public.variable_pay_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  pay_group_id UUID REFERENCES public.pay_groups(id) ON DELETE SET NULL,
  cycle_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked','processed')),
  total_daily_cost NUMERIC(14,2) DEFAULT 0,
  total_piece_cost NUMERIC(14,2) DEFAULT 0,
  total_allowances NUMERIC(14,2) DEFAULT 0,
  total_net_pay NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Variable Work Logs
CREATE TABLE IF NOT EXISTS public.variable_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.variable_pay_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'present' CHECK (attendance_status IN ('present','absent','leave','half_day')),
  hours_worked NUMERIC(6,2) DEFAULT 8,
  daily_rate NUMERIC(14,2) DEFAULT 0,
  daily_cost NUMERIC(14,2) DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id, work_date)
);

-- 4. Variable Item Logs: piece-rate / consumable logging
CREATE TABLE IF NOT EXISTS public.variable_item_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.variable_pay_cycles(id) ON DELETE CASCADE,
  work_log_id UUID REFERENCES public.variable_work_logs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES public.items_catalog(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_unit TEXT DEFAULT 'unit',
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) DEFAULT 0,
  work_date DATE NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Variable Pay Summaries
CREATE TABLE IF NOT EXISTS public.variable_pay_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.variable_pay_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  days_present INTEGER DEFAULT 0,
  total_daily_pay NUMERIC(14,2) DEFAULT 0,
  total_piece_pay NUMERIC(14,2) DEFAULT 0,
  allowance_house NUMERIC(14,2) DEFAULT 0,
  allowance_travel NUMERIC(14,2) DEFAULT 0,
  allowance_airtime NUMERIC(14,2) DEFAULT 0,
  allowance_medical NUMERIC(14,2) DEFAULT 0,
  allowance_seating NUMERIC(14,2) DEFAULT 0,
  gross_pay NUMERIC(14,2) DEFAULT 0,
  tax_deduction NUMERIC(14,2) DEFAULT 0,
  nssf_employee NUMERIC(14,2) DEFAULT 0,
  other_deductions NUMERIC(14,2) DEFAULT 0,
  net_pay NUMERIC(14,2) DEFAULT 0,
  work_log_validated BOOLEAN DEFAULT false,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);

-- 6. Add contract_type to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'monthly' CHECK (contract_type IN ('monthly','variable'));

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_items_catalog_org ON public.items_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_catalog_project ON public.items_catalog(project_id);
CREATE INDEX IF NOT EXISTS idx_variable_pay_cycles_org ON public.variable_pay_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_variable_pay_cycles_project ON public.variable_pay_cycles(project_id);
CREATE INDEX IF NOT EXISTS idx_variable_work_logs_cycle ON public.variable_work_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_variable_work_logs_employee ON public.variable_work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_variable_item_logs_cycle ON public.variable_item_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_variable_item_logs_employee ON public.variable_item_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_variable_pay_summaries_cycle ON public.variable_pay_summaries(cycle_id);

-- 8. Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_items_catalog_updated_at
  BEFORE UPDATE ON public.items_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER trg_variable_pay_cycles_updated_at
  BEFORE UPDATE ON public.variable_pay_cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER trg_variable_work_logs_updated_at
  BEFORE UPDATE ON public.variable_work_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER trg_variable_item_logs_updated_at
  BEFORE UPDATE ON public.variable_item_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER trg_variable_pay_summaries_updated_at
  BEFORE UPDATE ON public.variable_pay_summaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- 9. RLS
ALTER TABLE public.items_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_pay_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_item_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_pay_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_catalog_select" ON public.items_catalog FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "items_catalog_insert" ON public.items_catalog FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "items_catalog_update" ON public.items_catalog FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "items_catalog_delete" ON public.items_catalog FOR DELETE
  USING (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "variable_pay_cycles_select" ON public.variable_pay_cycles FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "variable_pay_cycles_insert" ON public.variable_pay_cycles FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "variable_pay_cycles_update" ON public.variable_pay_cycles FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "variable_pay_cycles_delete" ON public.variable_pay_cycles FOR DELETE
  USING (organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "variable_work_logs_select" ON public.variable_work_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_work_logs_insert" ON public.variable_work_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_work_logs_update" ON public.variable_work_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_work_logs_delete" ON public.variable_work_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));

CREATE POLICY "variable_item_logs_select" ON public.variable_item_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_item_logs_insert" ON public.variable_item_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_item_logs_update" ON public.variable_item_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_item_logs_delete" ON public.variable_item_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));

CREATE POLICY "variable_pay_summaries_select" ON public.variable_pay_summaries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_pay_summaries_insert" ON public.variable_pay_summaries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));
CREATE POLICY "variable_pay_summaries_update" ON public.variable_pay_summaries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.variable_pay_cycles vpc WHERE vpc.id = cycle_id AND vpc.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)));