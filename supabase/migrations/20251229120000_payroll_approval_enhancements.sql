-- ==========================================================
-- PAYROLL APPROVAL ENHANCEMENTS MIGRATION
-- Extends existing approval workflow infrastructure with:
-- - Global approval toggle
-- - Approval scopes (which payroll actions require approval)
-- - Approver type selection (role vs individual vs hybrid)
-- - Workflow versioning for audit safety
-- - Override tracking
-- ==========================================================

-- 1. Extend org_settings table with new approval fields
DO $$
BEGIN
    -- Add payroll_approvals_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'org_settings'
        AND column_name = 'payroll_approvals_enabled'
    ) THEN
        ALTER TABLE public.org_settings
        ADD COLUMN payroll_approvals_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Add approvals_enabled_scopes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'org_settings'
        AND column_name = 'approvals_enabled_scopes'
    ) THEN
        ALTER TABLE public.org_settings
        ADD COLUMN approvals_enabled_scopes JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN public.org_settings.payroll_approvals_enabled IS 'Global toggle to enable/disable payroll approvals for the organization';
COMMENT ON COLUMN public.org_settings.approvals_enabled_scopes IS 'Array of payroll action scopes that require approval: payroll_run_creation, payroll_run_finalization, payroll_reruns, payroll_adjustments, payroll_overrides, backdated_changes';

-- 2. Extend approval_workflows table with scope and versioning
DO $$
BEGIN
    -- Add applies_to_scopes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'approval_workflows'
        AND column_name = 'applies_to_scopes'
    ) THEN
        ALTER TABLE public.approval_workflows
        ADD COLUMN applies_to_scopes JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add version column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'approval_workflows'
        AND column_name = 'version'
    ) THEN
        ALTER TABLE public.approval_workflows
        ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

COMMENT ON COLUMN public.approval_workflows.applies_to_scopes IS 'Array of payroll action scopes this workflow covers';
COMMENT ON COLUMN public.approval_workflows.version IS 'Workflow version number, incremented on each edit';

-- 3. Extend approval_workflow_steps table with approver type fields
DO $$
BEGIN
    -- Add approver_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'approval_workflow_steps'
        AND column_name = 'approver_type'
    ) THEN
        ALTER TABLE public.approval_workflow_steps
        ADD COLUMN approver_type TEXT CHECK (approver_type IN ('role', 'individual', 'hybrid')) DEFAULT 'role';
    END IF;

    -- Add fallback_user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'approval_workflow_steps'
        AND column_name = 'fallback_user_id'
    ) THEN
        ALTER TABLE public.approval_workflow_steps
        ADD COLUMN fallback_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.approval_workflow_steps.approver_type IS 'How approver is selected: role (position-based), individual (specific user), hybrid (role with individual fallback)';
COMMENT ON COLUMN public.approval_workflow_steps.fallback_user_id IS 'Fallback user for hybrid approver type when role has no assignee';

-- 4. Extend payrun_approval_steps table with override and versioning fields
DO $$
BEGIN
    -- Add workflow_version column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'payrun_approval_steps'
        AND column_name = 'workflow_version'
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN workflow_version INTEGER;
    END IF;

    -- Add override tracking columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'payrun_approval_steps'
        AND column_name = 'override_reason'
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN override_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'payrun_approval_steps'
        AND column_name = 'override_by'
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN override_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'payrun_approval_steps'
        AND column_name = 'override_at'
    ) THEN
        ALTER TABLE public.payrun_approval_steps
        ADD COLUMN override_at TIMESTAMPTZ;
    END IF;
END $$;

COMMENT ON COLUMN public.payrun_approval_steps.workflow_version IS 'Snapshot of workflow version used for this approval instance';
COMMENT ON COLUMN public.payrun_approval_steps.override_reason IS 'Mandatory reason if approval was overridden';
COMMENT ON COLUMN public.payrun_approval_steps.override_by IS 'User who performed the override (Super Admin or Tenant Admin)';
COMMENT ON COLUMN public.payrun_approval_steps.override_at IS 'Timestamp when override was performed';

-- 5. Create approval_workflow_versions table for audit trail
CREATE TABLE IF NOT EXISTS public.approval_workflow_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    workflow_snapshot JSONB NOT NULL, -- Complete snapshot of workflow and steps
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(workflow_id, version)
);

COMMENT ON TABLE public.approval_workflow_versions IS 'Historical versions of workflows for audit trail and in-flight approval protection';
COMMENT ON COLUMN public.approval_workflow_versions.workflow_snapshot IS 'Complete JSON snapshot of workflow configuration and all steps at this version';

-- 6. Enable RLS on workflow_versions table
ALTER TABLE public.approval_workflow_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Read by org members
DROP POLICY IF EXISTS "Workflow Versions Readable by Org Members" ON public.approval_workflow_versions;
DROP POLICY IF EXISTS "Workflow Versions Readable by Org Members" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Workflow Versions Readable by Org Members" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Workflow Versions Readable by Org Members" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Workflow Versions Readable by Org Members" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Workflow Versions Readable by Org Members"
ON public.approval_workflow_versions FOR SELECT TO authenticated
USING (
    workflow_id IN (
        SELECT id FROM public.approval_workflows WHERE org_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    )
);


-- RLS Policy: Insert by admins (created via trigger)
DROP POLICY IF EXISTS "Workflow Versions Managed by Admins" ON public.approval_workflow_versions;
DROP POLICY IF EXISTS "Workflow Versions Managed by Admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Workflow Versions Managed by Admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Workflow Versions Managed by Admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Workflow Versions Managed by Admins" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Workflow Versions Managed by Admins"
ON public.approval_workflow_versions FOR INSERT TO authenticated
WITH CHECK (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
);


-- 7. Create trigger function to create workflow version snapshot
CREATE OR REPLACE FUNCTION public.create_workflow_version_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create version snapshot on UPDATE that actually changes workflow
    IF (TG_OP = 'UPDATE' AND OLD.version = NEW.version) THEN
        RETURN NEW;
    END IF;
    
    -- Create snapshot of current workflow with all steps
    INSERT INTO public.approval_workflow_versions (
        workflow_id,
        version,
        workflow_snapshot,
        created_by
    )
    SELECT 
        NEW.id,
        NEW.version,
        jsonb_build_object(
            'workflow', row_to_json(NEW)::jsonb,
            'steps', (
                SELECT jsonb_agg(row_to_json(steps))
                FROM public.approval_workflow_steps steps
                WHERE steps.workflow_id = NEW.id
            )
        ),
        auth.uid()
    ON CONFLICT (workflow_id, version) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- 8. Attach trigger to approval_workflows table
DROP TRIGGER IF EXISTS tr_workflow_version_snapshot ON public.approval_workflows;
CREATE TRIGGER tr_workflow_version_snapshot
AFTER INSERT OR UPDATE ON public.approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.create_workflow_version_snapshot();

-- 9. Update status check constraint to include 'approved_overridden'
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE public.payrun_approval_steps 
    DROP CONSTRAINT IF EXISTS payrun_approval_steps_status_check;
    
    -- Add updated constraint with new status
    ALTER TABLE public.payrun_approval_steps
    ADD CONSTRAINT payrun_approval_steps_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped', 'approved_overridden'));
END $$;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON public.org_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_org_scopes ON public.approval_workflows USING GIN(applies_to_scopes);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_approver_type ON public.approval_workflow_steps(approver_type);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON public.approval_workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_payrun_steps_status ON public.payrun_approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_payrun_steps_override_by ON public.payrun_approval_steps(override_by) WHERE override_by IS NOT NULL;

-- Migration complete
