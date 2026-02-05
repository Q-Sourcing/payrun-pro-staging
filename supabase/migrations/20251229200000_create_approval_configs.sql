-- ==========================================================
-- 🛠️ FIX: MISSING APPROVAL CONFIG TABLES
-- ==========================================================
-- Migration: 20251229200000_create_approval_configs.sql
-- Purpose: 
-- Create the missing `payroll_approval_configs` and `payroll_approval_categories`
-- tables which are required by the frontend but were missing from previous migrations.

-- 1. Create payroll_approval_configs table
CREATE TABLE IF NOT EXISTS public.payroll_approval_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL, -- Logical link, no foreign key to users/orgs to avoid strict dependency issues if org table varies
    name TEXT NOT NULL,
    description TEXT,
    workflow_id UUID REFERENCES public.approval_workflows(id),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create payroll_approval_categories table (Junction table for employee categories)
CREATE TABLE IF NOT EXISTS public.payroll_approval_categories (
    config_id UUID REFERENCES public.payroll_approval_configs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL, -- Links to employee_categories.id
    PRIMARY KEY (config_id, category_id)
);

-- 3. Enable RLS
ALTER TABLE public.payroll_approval_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_approval_categories ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Policy: Read by org members (Configs)
DROP POLICY IF EXISTS "Configs Readable by Org Members" ON public.payroll_approval_configs;
DROP POLICY IF EXISTS "Configs Readable by Org Members" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Configs Readable by Org Members" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Configs Readable by Org Members" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Configs Readable by Org Members" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Configs Readable by Org Members"
ON public.payroll_approval_configs FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

-- Policy: Manage by Admins (Configs)
DROP POLICY IF EXISTS "Configs Managed by Admins" ON public.payroll_approval_configs;
DROP POLICY IF EXISTS "Configs Managed by Admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Configs Managed by Admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Configs Managed by Admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Configs Managed by Admins" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Configs Managed by Admins"
ON public.payroll_approval_configs FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
);

-- Policy: Read by org members (Categories) - Cascades from Configs usually, but easier to set direct check
DROP POLICY IF EXISTS "Categories Readable by Org Members" ON public.payroll_approval_categories;
DROP POLICY IF EXISTS "Categories Readable by Org Members" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Categories Readable by Org Members" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Categories Readable by Org Members" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Categories Readable by Org Members" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Categories Readable by Org Members"
ON public.payroll_approval_categories FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.payroll_approval_configs c
        WHERE c.id = config_id
        AND c.organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            UNION
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    )
);

-- Policy: Manage by Admins (Categories)
DROP POLICY IF EXISTS "Categories Managed by Admins" ON public.payroll_approval_categories;
DROP POLICY IF EXISTS "Categories Managed by Admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Categories Managed by Admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Categories Managed by Admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Categories Managed by Admins" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Categories Managed by Admins"
ON public.payroll_approval_categories FOR ALL TO authenticated
USING (
    public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_approval_configs_org ON public.payroll_approval_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_categories_cat ON public.payroll_approval_categories(category_id);
