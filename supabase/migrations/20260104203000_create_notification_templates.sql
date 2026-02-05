-- ==========================================================
-- NOTIFICATION TEMPLATES MIGRATION
-- ==========================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID, -- Nullable for system defaults, otherwise links to organization
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL, -- e.g., 'PAYRUN_SUBMITTED', 'PAYRUN_APPROVED', 'PAYRUN_REJECTED'
    subject TEXT NOT NULL,
    body_content TEXT NOT NULL, -- HTML or Markdown
    is_active BOOLEAN DEFAULT true,
    module TEXT NOT NULL DEFAULT 'payroll_approvals',
    available_variables JSONB DEFAULT '[]', -- Metadata about what variables can be used
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure uniqueness for event per or (if org is null, it's global default)
    UNIQUE NULLS NOT DISTINCT (org_id, trigger_event)
);

-- 2. Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- READ: Authenticated users can read templates for their org OR global templates
DROP POLICY IF EXISTS "Templates readable by Org Members" ON public.notification_templates;
DROP POLICY IF EXISTS "Templates readable by Org Members" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Templates readable by Org Members" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Templates readable by Org Members" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Templates readable by Org Members" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Templates readable by Org Members"
ON public.notification_templates FOR SELECT TO authenticated
USING (
    org_id IS NULL OR
    org_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
);

-- WRITE: Admins can manage their org's templates
DROP POLICY IF EXISTS "Templates managed by Org Admins" ON public.notification_templates;
DROP POLICY IF EXISTS "Templates managed by Org Admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Templates managed by Org Admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Templates managed by Org Admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Templates managed by Org Admins" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Templates managed by Org Admins"
ON public.notification_templates FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR 
    public.check_is_org_admin(auth.uid()) OR
    public.check_is_org_super_admin(auth.uid())
);

-- 4. Initial Seed Data (Global Defaults)
-- We insert these with org_id NULL so they act as system defaults
INSERT INTO public.notification_templates (name, trigger_event, subject, body_content, module, available_variables)
VALUES 
(
    'Approval Request', 
    'PAYRUN_SUBMITTED', 
    'Action Required: Pay Run Review - {{payrun_period}}',
    '<p>Dear {{approver_name}},</p><p>A new pay run has been submitted and awaits your approval.</p><ul><li><strong>Pay Run ID:</strong> {{payrun_id}}</li><li><strong>Period:</strong> {{payrun_period}}</li><li><strong>Organization:</strong> {{organization_name}}</li><li><strong>Submitted By:</strong> {{submitted_by}}</li></ul><p>Please click the link below to review and approve:</p><p><a href="{{action_url}}">Review Pay Run</a></p><p>Thank you.</p>',
    'payroll_approvals',
    '["approver_name", "payrun_id", "payrun_period", "organization_name", "submitted_by", "action_url"]'
),
(
    'Rejection Notice', 
    'PAYRUN_REJECTED', 
    'Action Required: Pay Run Rejected - {{payrun_period}}',
    '<p>Dear {{created_by_name}},</p><p>Your pay run submission has been rejected.</p><ul><li><strong>Pay Run ID:</strong> {{payrun_id}}</li><li><strong>Period:</strong> {{payrun_period}}</li><li><strong>Rejected By:</strong> {{rejected_by}}</li><li><strong>Reason:</strong> {{reason}}</li></ul><p>Please review the comments and resubmit if necessary.</p><p><a href="{{action_url}}">View Pay Run</a></p>',
    'payroll_approvals',
    '["created_by_name", "payrun_id", "payrun_period", "rejected_by", "reason", "action_url"]'
),
(
    'Final Approval Notice', 
    'PAYRUN_APPROVED', 
    'Approved: Pay Run - {{payrun_period}} is now Locked',
    '<p>The pay run for period <strong>{{payrun_period}}</strong> has been fully approved and is now locked for processing.</p><ul><li><strong>Pay Run ID:</strong> {{payrun_id}}</li><li><strong>Approved By:</strong> {{approved_by}}</li></ul><p><a href="{{action_url}}">View Pay Run</a></p>',
    'payroll_approvals',
    '["payrun_period", "payrun_id", "approved_by", "action_url"]'
)
ON CONFLICT (org_id, trigger_event) DO NOTHING;
