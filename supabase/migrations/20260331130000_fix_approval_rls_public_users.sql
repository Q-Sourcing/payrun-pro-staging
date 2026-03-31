-- ============================================================================
-- Fix RLS policies on approval tables that still reference the dropped
-- public.users table (dropped in 20260330000000_cleanup_legacy_auth_tables).
-- Replace references with user_profiles which is the canonical profile table.
-- ============================================================================

-- ── approval_workflow_steps ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Workflow Steps Readable by Org Members" ON public.approval_workflow_steps;

CREATE POLICY "Workflow Steps Readable by Org Members"
ON public.approval_workflow_steps
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM public.approval_workflows
    WHERE org_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  )
);

-- ── approval_workflows ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Workflows Readable by Org Members" ON public.approval_workflows;

CREATE POLICY "Workflows Readable by Org Members"
ON public.approval_workflows
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE id = auth.uid()
  )
);

-- ── audit_logs ────────────────────────────────────────────────────────────────
-- Replace the broken "Admins can view all audit logs" policy that referenced
-- public.users with one that checks user_profiles.role instead.

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = ANY(ARRAY['super_admin', 'organization_admin', 'admin', 'ADMIN', 'ORG_ADMIN'])
  )
  OR EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE platform_admins.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND platform_admins.allowed = true
  )
);
