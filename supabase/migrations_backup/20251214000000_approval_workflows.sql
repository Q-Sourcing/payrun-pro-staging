-- ==========================================================
-- APPROVAL WORKFLOWS & ORG SETTINGS MIGRATION
-- ==========================================================

-- 1. Extend Payrun Status Enum
-- We need to check if the enum exists and add values if they don't exist
-- Helper Functions for RLS (Prefixed to avoid conflicts)
CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_org_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role IN ('super_admin', 'admin') 
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_org_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role IN ('super_admin', 'admin', 'manager') 
  );
$$;

-- 1. Extend Payrun Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payrunstatus') THEN
        CREATE TYPE public.payrunstatus AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'locked', 'processed');
    ELSE
        ALTER TYPE public.payrunstatus ADD VALUE IF NOT EXISTS 'pending_approval';
        ALTER TYPE public.payrunstatus ADD VALUE IF NOT EXISTS 'rejected';
        ALTER TYPE public.payrunstatus ADD VALUE IF NOT EXISTS 'locked';
    END IF;
END $$;

-- 2. Update Payruns Table
ALTER TABLE public.pay_runs 
ADD COLUMN IF NOT EXISTS approval_status text CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'locked')),
ADD COLUMN IF NOT EXISTS approval_current_level int,
ADD COLUMN IF NOT EXISTS approval_submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS approval_submitted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approval_last_action_at timestamptz;

-- 3. Org Settings (Super Admin Only)
CREATE TABLE IF NOT EXISTS public.org_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.pay_groups(id) ON DELETE CASCADE, -- Assuming pay_groups used as org proxy or link to actual org table if exists. 
    -- Note: In this codebase 'organizations' might be represented differently. 
    -- Creating a generic org_id link. If 'organizations' table exists, link there.
    -- Based on prior file listing, didn't see explicit 'organizations' table in migration list, but referenced in user request.
    -- Will use generic uuid for flexibility or link to pay_groups if that's the tenant root.
    -- Re-reading prompt: "org_id (PK, uuid FK organizations)". 
    -- Checking available tables... 'company_settings' exists. 'auth.users' has 'organization_id'.
    -- Let's assume organization_id is the grouping.
    organization_id uuid NOT NULL UNIQUE, 
    
    max_approval_levels int NOT NULL DEFAULT 5 CHECK (max_approval_levels BETWEEN 1 AND 20),
    approvals_sequential boolean NOT NULL DEFAULT true,
    approvals_allow_delegation boolean NOT NULL DEFAULT true,
    approvals_rejection_comment_required boolean NOT NULL DEFAULT true,
    approvals_visibility_non_admin boolean NOT NULL DEFAULT true,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Approval Workflows
CREATE TABLE IF NOT EXISTS public.approval_workflows (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL, -- references organization
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Approval Workflow Steps
CREATE TABLE IF NOT EXISTS public.approval_workflow_steps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id uuid NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    level int NOT NULL CHECK (level >= 1),
    approver_user_id uuid REFERENCES auth.users(id), -- Specific user
    approver_role text, -- Option for Role-based approval (e.g., 'finance_controller')
    
    sequence_number int NOT NULL,
    notify_email boolean DEFAULT true,
    notify_in_app boolean DEFAULT true,
    
    created_at timestamptz DEFAULT now(),
    
    UNIQUE(workflow_id, level)
);

-- 6. Payrun Approval Steps (The Instance)
CREATE TABLE IF NOT EXISTS public.payrun_approval_steps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payrun_id uuid NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    level int NOT NULL,
    
    approver_user_id uuid, -- The actual user who needs to approve
    approver_role text, -- Fallback if needed
    
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    
    -- Actions
    actioned_at timestamptz,
    actioned_by uuid REFERENCES auth.users(id),
    comments text,
    
    -- Delegation
    original_approver_id uuid REFERENCES auth.users(id),
    delegated_by uuid REFERENCES auth.users(id),
    delegated_at timestamptz,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(payrun_id, level)
);

-- 7. RLS Policies

-- Org Settings: Read by everyone in org, Write by Super Admin ONLY
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org Settings Readable by Org Members" 
ON public.org_settings FOR SELECT TO authenticated 
USING (
    organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

CREATE POLICY "Org Settings Start/Update by Super Admin Only" 
ON public.org_settings FOR ALL TO authenticated 
USING (
    public.check_is_super_admin(auth.uid()) 
    OR 
    public.check_is_org_super_admin(auth.uid())
)
WITH CHECK (
    public.check_is_super_admin(auth.uid()) 
    OR 
    public.check_is_org_super_admin(auth.uid())
);


-- Workflows: Read by Payroll Managers/Admins, Write by Super Admin
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workflows Readable by Org Members" 
ON public.approval_workflows FOR SELECT TO authenticated 
USING (
    org_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

CREATE POLICY "Workflows Managed by Super Admins"
ON public.approval_workflows FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
);


-- Workflow Steps
ALTER TABLE public.approval_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workflow Steps Readable by Org Members" 
ON public.approval_workflow_steps FOR SELECT TO authenticated 
USING (
    workflow_id IN (
        SELECT id FROM public.approval_workflows WHERE org_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Workflow Steps Managed by Super Admins"
ON public.approval_workflow_steps FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
);


-- Payrun Approval Steps
ALTER TABLE public.payrun_approval_steps ENABLE ROW LEVEL SECURITY;

-- Read: Admins + The Approver + Payrun Creator
CREATE POLICY "Approval Steps Readable by Relevant Users"
ON public.payrun_approval_steps FOR SELECT TO authenticated
USING (
    -- Is Admin
    public.check_is_org_admin(auth.uid()) 
    OR
    -- Is Assigned Approver
    approver_user_id = auth.uid()
    OR
    -- Is Original Approver (Delegated)
    original_approver_id = auth.uid()
    OR
    -- Created the Payrun
    payrun_id IN (SELECT id FROM public.pay_runs WHERE created_by = auth.uid())
);

-- Update: The Assigned Approver (when pending) OR Admin (delegation/reset)
CREATE POLICY "Approvers Can Act on Their Steps"
ON public.payrun_approval_steps FOR UPDATE TO authenticated
USING (
    approver_user_id = auth.uid() 
    OR 
    public.check_is_org_admin(auth.uid())
)
WITH CHECK (
    approver_user_id = auth.uid() 
    OR 
    public.check_is_org_admin(auth.uid())
);
