-- ============================================================
-- Expatriate Management Module — Uganda-First
-- ============================================================

-- ── Work Permits ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  permit_class text NOT NULL DEFAULT 'G2'
    CHECK (permit_class IN ('G1','G2','G3','F','EAC_National','Other')),
  permit_number text,
  issue_date date,
  expiry_date date NOT NULL,
  fee_paid_usd numeric,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','renewal_pending','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_permits_employee_id_idx ON public.work_permits(employee_id);
CREATE INDEX IF NOT EXISTS work_permits_expiry_date_idx ON public.work_permits(expiry_date);
CREATE INDEX IF NOT EXISTS work_permits_org_id_idx ON public.work_permits(org_id);

ALTER TABLE public.work_permits ENABLE ROW LEVEL SECURITY;

-- Org members can read and manage their own org's work permits
CREATE POLICY "work_permits_select_own_org" ON public.work_permits
  FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "work_permits_insert_own_org" ON public.work_permits
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "work_permits_update_own_org" ON public.work_permits
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "work_permits_delete_own_org" ON public.work_permits
  FOR DELETE
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER update_work_permits_updated_at
  BEFORE UPDATE ON public.work_permits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── Tax Treaties ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_treaties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_a text NOT NULL,
  country_b text NOT NULL,
  in_force_since date,
  notes text,
  UNIQUE (country_a, country_b)
);

-- Seed Uganda's tax treaties
INSERT INTO public.tax_treaties (country_a, country_b, in_force_since) VALUES
  ('Uganda', 'United Kingdom', '1993-12-01'),
  ('Uganda', 'Denmark', '2001-05-01'),
  ('Uganda', 'Norway', '2001-05-01'),
  ('Uganda', 'Mauritius', '2004-07-01'),
  ('Uganda', 'Netherlands', NULL),
  ('Uganda', 'India', NULL),
  ('Uganda', 'Italy', NULL),
  ('Uganda', 'South Africa', NULL),
  ('Uganda', 'Zambia', NULL)
ON CONFLICT (country_a, country_b) DO NOTHING;

-- ── Employee residency & compliance columns ───────────────
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS tax_residency_status text DEFAULT 'non_resident'
    CHECK (tax_residency_status IN ('resident','non_resident','pending')),
  ADD COLUMN IF NOT EXISTS days_in_country_current_year integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country_of_tax_residence text,
  ADD COLUMN IF NOT EXISTS uganda_entry_date date,
  ADD COLUMN IF NOT EXISTS lst_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.employees.tax_residency_status IS
  'Uganda 183-day rule: resident = 183+ days in 12 months OR avg 122+ days over 3 yrs';
COMMENT ON COLUMN public.employees.lst_exempt IS
  'Override to exempt this employee from LST (e.g. diplomatic mission members)';

-- ── Allowance tax classification ──────────────────────────
ALTER TABLE public.expatriate_pay_run_item_allowances
  ADD COLUMN IF NOT EXISTS allowance_type text NOT NULL DEFAULT 'taxable'
    CHECK (allowance_type IN ('taxable','tax_exempt','social_tax_exempt'));

COMMENT ON COLUMN public.expatriate_pay_run_item_allowances.allowance_type IS
  'taxable: included in PAYE base | tax_exempt: excluded from PAYE | social_tax_exempt: excluded from NSSF social taxes only (e.g. direct school fees)';

-- ── Projects: extra expatriate fields ─────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS default_permit_class text
    CHECK (default_permit_class IS NULL OR default_permit_class IN ('G1','G2','G3','F','EAC_National','Other')),
  ADD COLUMN IF NOT EXISTS contract_period_months integer,
  ADD COLUMN IF NOT EXISTS default_exchange_rate numeric;

COMMENT ON COLUMN public.projects.default_permit_class IS
  'Default work permit class for expatriate employees in this project (G1, G2, G3, F, EAC_National)';
COMMENT ON COLUMN public.projects.default_exchange_rate IS
  'Default currency exchange rate to local currency for expatriate projects';

-- ── Expatriate policies: NSSF-specific fields ─────────────
ALTER TABLE public.expatriate_policies
  ADD COLUMN IF NOT EXISTS nssf_non_resident_employer_rate numeric NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS nssf_residency_threshold_years integer NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.expatriate_policies.nssf_non_resident_employer_rate IS
  'Uganda: 10% employer special contribution for non-resident expatriates (<3 yrs)';
COMMENT ON COLUMN public.expatriate_policies.nssf_residency_threshold_years IS
  'Years of continuous employment before an expatriate becomes NSSF-eligible (default 3)';

-- Update Uganda's expatriate policy with correct values
UPDATE public.expatriate_policies
SET
  flat_tax_rate = 15.00,
  apply_flat_tax = true,
  social_security_treatment = 'exempt',
  exempt_lst = false,
  nssf_non_resident_employer_rate = 10.00,
  nssf_residency_threshold_years = 3
WHERE country = 'Uganda';
