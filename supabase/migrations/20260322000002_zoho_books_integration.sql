-- Zoho Books Integration Schema
-- Extends existing integration_tokens with company-level scoping
-- and adds GL account mapping + journal reference tracking

-- 1. Add company_id to integration_tokens for company-scoped tokens (Zoho Books)
ALTER TABLE public.integration_tokens
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Unique index: one Books token per company
CREATE UNIQUE INDEX IF NOT EXISTS integration_tokens_company_name_unique_idx
  ON public.integration_tokens(company_id, integration_name)
  WHERE company_id IS NOT NULL;

-- 2. GL account mappings per company (set up once, used forever)
CREATE TABLE IF NOT EXISTS public.zoho_books_gl_mappings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- The concept being mapped (gross_pay, paye_tax, nssf_employee, nssf_employer, net_pay, custom_deductions, fx_gain_loss)
  mapping_key     varchar(50) NOT NULL,
  -- Zoho Books account ID and human-readable name (cached from Books API)
  zoho_account_id varchar(100) NOT NULL,
  zoho_account_name text NOT NULL,
  -- Optional: which bank this net_pay line maps to (centenary, stanbic, etc.)
  bank_name       text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(company_id, mapping_key, bank_name)
);

COMMENT ON TABLE public.zoho_books_gl_mappings IS 'Maps PayrunPro payroll concepts to Zoho Books GL accounts, scoped per company';

-- 3. Journal reference tracking (idempotency + status)
CREATE TABLE IF NOT EXISTS public.zoho_books_journal_refs (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pay_run_id          uuid NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
  -- Zoho Books journal ID returned after successful push
  zoho_journal_id     varchar(100),
  -- 'pending' | 'pushed' | 'failed'
  status              varchar(20) NOT NULL DEFAULT 'pending',
  error_message       text,
  pushed_at           timestamptz,
  pushed_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  -- One journal ref per pay run per company
  UNIQUE(company_id, pay_run_id)
);

COMMENT ON TABLE public.zoho_books_journal_refs IS 'Tracks which pay runs have been pushed to Zoho Books and their journal IDs';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zoho_books_gl_mappings_company ON public.zoho_books_gl_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_journal_refs_pay_run ON public.zoho_books_journal_refs(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_zoho_books_journal_refs_company ON public.zoho_books_journal_refs(company_id);

-- RLS
ALTER TABLE public.zoho_books_gl_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_books_journal_refs ENABLE ROW LEVEL SECURITY;

-- GL mappings: accessible by members of the company's organization
CREATE POLICY "zoho_books_gl_mappings_org_access"
  ON public.zoho_books_gl_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_profiles up ON up.organization_id = c.organization_id
      WHERE c.id = company_id
        AND up.id = auth.uid()
    )
  );

-- Journal refs: accessible by members of the company's organization
CREATE POLICY "zoho_books_journal_refs_org_access"
  ON public.zoho_books_journal_refs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_profiles up ON up.organization_id = c.organization_id
      WHERE c.id = company_id
        AND up.id = auth.uid()
    )
  );
