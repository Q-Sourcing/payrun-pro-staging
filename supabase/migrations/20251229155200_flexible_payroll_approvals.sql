-- ==========================================================
-- FLEXIBLE PER-TYPE PAYROLL APPROVALS MIGRATION
-- ==========================================================

-- 1. Create payroll_approval_configs table
CREATE TABLE IF NOT EXISTS public.payroll_approval_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.payroll_approval_configs IS 'Configuration for specific payroll streams/types (e.g., Head Office, Manpower)';

-- 2. Create payroll_approval_categories (Join Table with Unique Category constraint)
CREATE TABLE IF NOT EXISTS public.payroll_approval_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID NOT NULL REFERENCES public.payroll_approval_configs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL UNIQUE REFERENCES public.employee_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.payroll_approval_categories IS 'Maps employee categories to a specific approval configuration. Category ID is UNIQUE to prevent overlap.';

-- 3. Enable RLS
ALTER TABLE public.payroll_approval_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_approval_categories ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for payroll_approval_configs
DROP POLICY IF EXISTS "Configs are viewable by org members" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Configs are viewable by org members" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Configs are viewable by org members" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Configs are viewable by org members" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Configs are viewable by org members" ON public.payroll_approval_configs; CREATE POLICY "Configs are viewable by org members" ON public.payroll_approval_configs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Configs are manageable by admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Configs are manageable by admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Configs are manageable by admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Configs are manageable by admins" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Configs are manageable by admins" ON public.payroll_approval_configs; CREATE POLICY "Configs are manageable by admins" ON public.payroll_approval_configs
    FOR ALL USING (
        public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
    );

-- 5. RLS Policies for payroll_approval_categories
DROP POLICY IF EXISTS "Categories mapping viewable by org members" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Categories mapping viewable by org members" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Categories mapping viewable by org members" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Categories mapping viewable by org members" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Categories mapping viewable by org members" ON public.payroll_approval_categories; CREATE POLICY "Categories mapping viewable by org members" ON public.payroll_approval_categories
    FOR SELECT USING (
        config_id IN (
            SELECT id FROM public.payroll_approval_configs WHERE organization_id IN (
                SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Categories mapping manageable by admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Categories mapping manageable by admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Categories mapping manageable by admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Categories mapping manageable by admins" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Categories mapping manageable by admins" ON public.payroll_approval_categories; CREATE POLICY "Categories mapping manageable by admins" ON public.payroll_approval_categories
    FOR ALL USING (
        config_id IN (
            SELECT id FROM public.payroll_approval_configs WHERE organization_id IN (
                SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
            )
        ) AND (
            public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())
        )
    );

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_payroll_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_payroll_approval_configs_updated_at
    BEFORE UPDATE ON public.payroll_approval_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_config_updated_at();

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_approval_configs_org ON public.payroll_approval_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approval_categories_config ON public.payroll_approval_categories(config_id);
