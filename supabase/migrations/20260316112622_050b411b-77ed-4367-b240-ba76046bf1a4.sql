
-- Stub for has_company_membership (defined here since it is not in any prior migration)
CREATE OR REPLACE FUNCTION public.has_company_membership(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.companies c ON c.organization_id = up.organization_id
    WHERE up.id = auth.uid()
      AND c.id = p_company_id
  );
$$;

-- ============================================================
-- PAYRUN APPROVAL WORKFLOW TABLES
-- Migration: create_payrun_approval_workflow_tables
-- Creates: payrun_workflow_approvers, payrun_approvals
-- Alters:  pay_runs (adds approval_status if missing)
-- Note: 'approval_workflows' already exists in this schema
--       with a different template-based structure. The new
--       sequential per-company approver chain is named
--       'payrun_workflow_approvers' to avoid conflict.
-- ============================================================

-- 1. Per-company sequential approver chain
CREATE TABLE IF NOT EXISTS public.payrun_workflow_approvers (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    approver_id    uuid        REFERENCES public.users(id),
    approver_email text        NOT NULL,
    approver_name  text        NOT NULL,
    step_order     int         NOT NULL,
    created_at     timestamptz DEFAULT now()
);

-- 2. Per-payrun approval instance rows
CREATE TABLE IF NOT EXISTS public.payrun_approvals (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    payrun_id      uuid        NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    approver_email text        NOT NULL,
    approver_name  text        NOT NULL,
    step_order     int         NOT NULL,
    status         text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),
    token          uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_at     timestamptz DEFAULT now(),
    actioned_at    timestamptz
);

-- 3. Add approval_status to pay_runs if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'pay_runs'
          AND column_name  = 'approval_status'
    ) THEN
        ALTER TABLE public.pay_runs
            ADD COLUMN approval_status text NOT NULL DEFAULT 'pending'
                CHECK (approval_status IN ('pending','in_review','approved','rejected'));
    END IF;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.payrun_workflow_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrun_approvals          ENABLE ROW LEVEL SECURITY;

-- ---- payrun_workflow_approvers policies ----

DROP POLICY IF EXISTS "payrun_workflow_approvers_select" ON public.payrun_workflow_approvers;
CREATE POLICY "payrun_workflow_approvers_select"
ON public.payrun_workflow_approvers FOR SELECT
TO authenticated
USING ( public.has_company_membership(company_id) );

DROP POLICY IF EXISTS "payrun_workflow_approvers_insert" ON public.payrun_workflow_approvers;
CREATE POLICY "payrun_workflow_approvers_insert"
ON public.payrun_workflow_approvers FOR INSERT
TO authenticated
WITH CHECK ( public.has_company_membership(company_id) );

DROP POLICY IF EXISTS "payrun_workflow_approvers_update" ON public.payrun_workflow_approvers;
CREATE POLICY "payrun_workflow_approvers_update"
ON public.payrun_workflow_approvers FOR UPDATE
TO authenticated
USING      ( public.has_company_membership(company_id) )
WITH CHECK ( public.has_company_membership(company_id) );

DROP POLICY IF EXISTS "payrun_workflow_approvers_delete" ON public.payrun_workflow_approvers;
CREATE POLICY "payrun_workflow_approvers_delete"
ON public.payrun_workflow_approvers FOR DELETE
TO authenticated
USING ( public.has_company_membership(company_id) );

-- ---- payrun_approvals policies (scoped via pay_runs -> pay_groups -> companies) ----

DROP POLICY IF EXISTS "payrun_approvals_select" ON public.payrun_approvals;
CREATE POLICY "payrun_approvals_select"
ON public.payrun_approvals FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pay_runs pr
        JOIN   public.pay_groups  pg ON pg.id = pr.pay_group_id
        JOIN   public.companies   c  ON c.organization_id = pg.organization_id
        WHERE  pr.id = payrun_approvals.payrun_id
          AND  public.has_company_membership(c.id)
    )
);

DROP POLICY IF EXISTS "payrun_approvals_insert" ON public.payrun_approvals;
CREATE POLICY "payrun_approvals_insert"
ON public.payrun_approvals FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pay_runs pr
        JOIN   public.pay_groups  pg ON pg.id = pr.pay_group_id
        JOIN   public.companies   c  ON c.organization_id = pg.organization_id
        WHERE  pr.id = payrun_approvals.payrun_id
          AND  public.has_company_membership(c.id)
    )
);

DROP POLICY IF EXISTS "payrun_approvals_update" ON public.payrun_approvals;
CREATE POLICY "payrun_approvals_update"
ON public.payrun_approvals FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pay_runs pr
        JOIN   public.pay_groups  pg ON pg.id = pr.pay_group_id
        JOIN   public.companies   c  ON c.organization_id = pg.organization_id
        WHERE  pr.id = payrun_approvals.payrun_id
          AND  public.has_company_membership(c.id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pay_runs pr
        JOIN   public.pay_groups  pg ON pg.id = pr.pay_group_id
        JOIN   public.companies   c  ON c.organization_id = pg.organization_id
        WHERE  pr.id = payrun_approvals.payrun_id
          AND  public.has_company_membership(c.id)
    )
);

DROP POLICY IF EXISTS "payrun_approvals_delete" ON public.payrun_approvals;
CREATE POLICY "payrun_approvals_delete"
ON public.payrun_approvals FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pay_runs pr
        JOIN   public.pay_groups  pg ON pg.id = pr.pay_group_id
        JOIN   public.companies   c  ON c.organization_id = pg.organization_id
        WHERE  pr.id = payrun_approvals.payrun_id
          AND  public.has_company_membership(c.id)
    )
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payrun_workflow_approvers_company_step
    ON public.payrun_workflow_approvers(company_id, step_order);

CREATE INDEX IF NOT EXISTS idx_payrun_approvals_payrun_step
    ON public.payrun_approvals(payrun_id, step_order);

CREATE INDEX IF NOT EXISTS idx_payrun_approvals_token
    ON public.payrun_approvals(token);
