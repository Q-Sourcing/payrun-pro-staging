-- ==========================================================
-- OBAC (Organisation-Based Access Control) Core Schema
-- Migration: 20251219000600_core_obac_schema.sql
-- ==========================================================

-- 1) Role Registry
CREATE TABLE IF NOT EXISTS public.rbac_roles (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('PLATFORM', 'ORGANIZATION', 'COMPANY', 'PROJECT', 'SELF')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Permission Registry
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
    key TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Role-Permission Mapping
CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
    role_code TEXT REFERENCES public.rbac_roles(code) ON DELETE CASCADE,
    permission_key TEXT REFERENCES public.rbac_permissions(key) ON DELETE CASCADE,
    PRIMARY KEY (role_code, permission_key)
);

-- 4) Role Assignments (The "Who, What, Where")
CREATE TABLE IF NOT EXISTS public.rbac_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL REFERENCES public.rbac_roles(code) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL', 'ORGANIZATION', 'COMPANY', 'PROJECT', 'SELF')),
    scope_id UUID, -- NULL for GLOBAL or SELF if applicable
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role_code, scope_type, scope_id)
);

-- 5) Access Grants (Overrides)
CREATE TABLE IF NOT EXISTS public.rbac_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL if role-based grant
    role_code TEXT REFERENCES public.rbac_roles(code) ON DELETE CASCADE, -- NULL if user-based grant
    permission_key TEXT NOT NULL REFERENCES public.rbac_permissions(key) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('ORGANIZATION', 'COMPANY', 'PROJECT')),
    scope_id UUID NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Ensure either user_id or role_code is provided
    CONSTRAINT rbac_grants_target_check CHECK (
        (user_id IS NOT NULL AND role_code IS NULL) OR
        (user_id IS NULL AND role_code IS NOT NULL)
    )
);

-- 6) Seed Roles
INSERT INTO public.rbac_roles (code, name, description, tier) VALUES
('PLATFORM_SUPER_ADMIN', 'Platform Super Admin', 'Full system access across all tenants.', 'PLATFORM'),
('PLATFORM_AUDITOR', 'Platform Auditor', 'Read-only access to all system activity for auditing.', 'PLATFORM'),
('ORG_ADMIN', 'Organization Admin', 'Full control over organization settings and users.', 'ORGANIZATION'),
('ORG_HR_ADMIN', 'Organization HR Admin', 'Manage people and assignments at organization level.', 'ORGANIZATION'),
('ORG_FINANCE_CONTROLLER', 'Organization Finance Controller', 'Final approval of payroll and financial oversight.', 'ORGANIZATION'),
('ORG_AUDITOR', 'Organization Auditor', 'Read-only access to organization activity.', 'ORGANIZATION'),
('ORG_VIEWER', 'Organization Viewer', 'General read-only access to organization modules.', 'ORGANIZATION'),
('COMPANY_PAYROLL_ADMIN', 'Company Payroll Admin', 'Prepare and manage payroll for a specific company.', 'COMPANY'),
('COMPANY_HR', 'Company HR', 'Manage employees for a specific company.', 'COMPANY'),
('COMPANY_VIEWER', 'Company Viewer', 'Read-only access to company data.', 'COMPANY'),
('PROJECT_MANAGER', 'Project Manager', 'Oversee specific projects and assign people.', 'PROJECT'),
('PROJECT_PAYROLL_OFFICER', 'Project Payroll Officer', 'Prepare payroll for specific projects (no approval).', 'PROJECT'),
('PROJECT_VIEWER', 'Project Viewer', 'Read-only access to project data.', 'PROJECT'),
('SELF_USER', 'Standard User', 'Personal access to own records.', 'SELF'),
('SELF_CONTRACTOR', 'Contractor', 'Limited access to own project/payment records.', 'SELF')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, tier = EXCLUDED.tier;

-- 7) Seed Permissions
INSERT INTO public.rbac_permissions (key, category, description) VALUES
-- People
('people.view', 'People', 'View employee profiles.'),
('people.create', 'People', 'Create new employee records.'),
('people.edit', 'People', 'Edit existing employee records.'),
('people.view_sensitive', 'People', 'View sensitive employee data (salary, bank details).'),
('people.assign_project', 'People', 'Assign employees to projects.'),
-- Payroll
('payroll.prepare', 'Payroll', 'Prepare and calculate payroll runs.'),
('payroll.submit', 'Payroll', 'Submit payroll for approval.'),
('payroll.approve', 'Payroll', 'Approve submitted payroll runs (Fin Controller only).'),
('payroll.rollback', 'Payroll', 'Rollback or reject payroll submissions.'),
('payroll.export_bank', 'Payroll', 'Export bank payment files.'),
('payroll.export_mobile_money', 'Payroll', 'Export mobile money payment files.'),
-- Finance
('finance.view_reports', 'Finance', 'View financial and payroll reports.'),
('finance.view_bank_details', 'Finance', 'View company and employee banking information.'),
-- Admin
('admin.manage_users', 'Admin', 'Create and manage users within scope.'),
('admin.assign_roles', 'Admin', 'Assign roles and scopes to users.'),
('admin.impersonate', 'Admin', 'Impersonate users for support (Super Admin only).')
ON CONFLICT (key) DO UPDATE SET category = EXCLUDED.category, description = EXCLUDED.description;

-- 8) Map Permissions to Roles (Standard Matrix)

-- PLATFORM_SUPER_ADMIN (Everything)
INSERT INTO public.rbac_role_permissions (role_code, permission_key)
SELECT 'PLATFORM_SUPER_ADMIN', key FROM public.rbac_permissions;

-- ORG_ADMIN
INSERT INTO public.rbac_role_permissions (role_code, permission_key)
VALUES 
('ORG_ADMIN', 'people.view'), ('ORG_ADMIN', 'people.create'), ('ORG_ADMIN', 'people.edit'), ('ORG_ADMIN', 'people.assign_project'),
('ORG_ADMIN', 'payroll.prepare'), ('ORG_ADMIN', 'payroll.submit'), ('ORG_ADMIN', 'payroll.rollback'),
('ORG_ADMIN', 'finance.view_reports'),
('ORG_ADMIN', 'admin.manage_users'), ('ORG_ADMIN', 'admin.assign_roles');

-- ORG_FINANCE_CONTROLLER
INSERT INTO public.rbac_role_permissions (role_code, permission_key)
VALUES 
('ORG_FINANCE_CONTROLLER', 'people.view'), ('ORG_FINANCE_CONTROLLER', 'people.view_sensitive'),
('ORG_FINANCE_CONTROLLER', 'payroll.approve'), ('ORG_FINANCE_CONTROLLER', 'payroll.export_bank'), ('ORG_FINANCE_CONTROLLER', 'payroll.export_mobile_money'),
('ORG_FINANCE_CONTROLLER', 'finance.view_reports'), ('ORG_FINANCE_CONTROLLER', 'finance.view_bank_details');

-- PROJECT_MANAGER
INSERT INTO public.rbac_role_permissions (role_code, permission_key)
VALUES 
('PROJECT_MANAGER', 'people.view'), ('PROJECT_MANAGER', 'people.assign_project'),
('PROJECT_MANAGER', 'payroll.prepare'), ('PROJECT_MANAGER', 'payroll.submit'),
('PROJECT_MANAGER', 'finance.view_reports');

-- 9) Security Helpers

-- Helper: has_permission
-- Checks effective permission by consolidating roles + assignments + grants
CREATE OR REPLACE FUNCTION public.has_permission(
    p_permission_key TEXT,
    p_scope_type TEXT,
    p_scope_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Check for PLATFORM_SUPER_ADMIN (Bypass)
    IF EXISTS (
        SELECT 1 FROM public.rbac_assignments 
        WHERE user_id = v_user_id AND role_code = 'PLATFORM_SUPER_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check for explicit DENY grants (User-specific or Role-based)
    -- Deny always wins.
    IF EXISTS (
        SELECT 1 FROM public.rbac_grants g
        JOIN public.rbac_assignments a ON (
            (g.user_id = v_user_id) OR 
            (g.role_code = a.role_code AND a.user_id = v_user_id)
        )
        WHERE g.permission_key = p_permission_key
          AND g.effect = 'DENY'
          AND g.scope_type = p_scope_type
          AND (g.scope_id = p_scope_id OR p_scope_id IS NULL)
    ) THEN
        RETURN FALSE;
    END IF;

    -- 3. Check for Role-based permissions within Scope
    -- A user has permission if ANY of their roles in the given scope (or a broader parent scope) has the permission
    IF EXISTS (
        SELECT 1 FROM public.rbac_assignments a
        JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code
        WHERE a.user_id = v_user_id
          AND rp.permission_key = p_permission_key
          AND (
            -- GLOBAL scope assignment covers everything
            (a.scope_type = 'GLOBAL') OR
            -- Exact scope match
            (a.scope_type = p_scope_type AND a.scope_id = p_scope_id) OR
            -- Broader scope covers narrower one (ORG -> COMPANY -> PROJECT)
            (a.scope_type = 'ORGANIZATION' AND p_scope_type IN ('COMPANY', 'PROJECT')) OR
            (a.scope_type = 'COMPANY' AND p_scope_type = 'PROJECT')
          )
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Check for explicit ALLOW grants
    IF EXISTS (
        SELECT 1 FROM public.rbac_grants g
        JOIN public.rbac_assignments a ON (
            (g.user_id = v_user_id) OR 
            (g.role_code = a.role_code AND a.user_id = v_user_id)
        )
        WHERE g.permission_key = p_permission_key
          AND g.effect = 'ALLOW'
          AND g.scope_type = p_scope_type
          AND (g.scope_id = p_scope_id OR p_scope_id IS NULL)
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 10) Enable RLS on new tables
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_grants ENABLE ROW LEVEL SECURITY;

-- Basic policies for RBAC tables
DROP POLICY IF EXISTS "rbac_roles_select" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "rbac_roles_select" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "rbac_roles_select" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "rbac_roles_select" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "rbac_roles_select" ON public.rbac_roles; CREATE POLICY "rbac_roles_select" ON public.rbac_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rbac_permissions_select" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "rbac_permissions_select" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "rbac_permissions_select" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "rbac_permissions_select" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "rbac_permissions_select" ON public.rbac_permissions; CREATE POLICY "rbac_permissions_select" ON public.rbac_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.rbac_role_permissions; CREATE POLICY "rbac_role_permissions_select" ON public.rbac_role_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rbac_assignments_select" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "rbac_assignments_select" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "rbac_assignments_select" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "rbac_assignments_select" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "rbac_assignments_select" ON public.rbac_assignments; CREATE POLICY "rbac_assignments_select" ON public.rbac_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_permission('admin.manage_users', 'ORGANIZATION', scope_id));
DROP POLICY IF EXISTS "rbac_grants_select" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "rbac_grants_select" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "rbac_grants_select" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "rbac_grants_select" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "rbac_grants_select" ON public.rbac_grants; CREATE POLICY "rbac_grants_select" ON public.rbac_grants FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_permission('admin.manage_users', 'ORGANIZATION', scope_id));

-- 11) Sync RBAC to Auth Metadata (for JWT inclusion)
CREATE OR REPLACE FUNCTION public.sync_rbac_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_roles JSONB;
    v_permissions JSONB;
    v_is_platform_admin BOOLEAN;
BEGIN
    -- Determine user_id from NEW or OLD
    IF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    -- Collect all active role assignments
    SELECT jsonb_agg(jsonb_build_object(
        'role', role_code,
        'scope_type', scope_type,
        'scope_id', scope_id
    )) INTO v_roles
    FROM public.rbac_assignments
    WHERE user_id = v_user_id;

    -- Collect all distinct effective permissions across all assigned scopes
    SELECT jsonb_agg(DISTINCT rp.permission_key) INTO v_permissions
    FROM public.rbac_assignments a
    JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code
    WHERE a.user_id = v_user_id;

    -- Check for platform admin status
    SELECT EXISTS (
        SELECT 1 FROM public.rbac_assignments 
        WHERE user_id = v_user_id AND role_code = 'PLATFORM_SUPER_ADMIN'
    ) INTO v_is_platform_admin;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_app_meta_data = 
        coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'rbac_roles', coalesce(v_roles, '[]'::jsonb),
            'rbac_permissions', coalesce(v_permissions, '[]'::jsonb),
            'is_platform_admin', v_is_platform_admin
        )
    WHERE id = v_user_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER sync_rbac_assignments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_rbac_to_auth_metadata();

-- Helper to sync by ID (reusing logic)
CREATE OR REPLACE FUNCTION public.sync_rbac_to_auth_metadata_by_id(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_roles JSONB;
    v_permissions JSONB;
    v_is_platform_admin BOOLEAN;
BEGIN
    SELECT jsonb_agg(jsonb_build_object(
        'role', role_code,
        'scope_type', scope_type,
        'scope_id', scope_id
    )) INTO v_roles
    FROM public.rbac_assignments
    WHERE user_id = p_user_id;

    SELECT jsonb_agg(DISTINCT rp.permission_key) INTO v_permissions
    FROM public.rbac_assignments a
    JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code
    WHERE a.user_id = p_user_id;

    SELECT EXISTS (
        SELECT 1 FROM public.rbac_assignments 
        WHERE user_id = p_user_id AND role_code = 'PLATFORM_SUPER_ADMIN'
    ) INTO v_is_platform_admin;

    UPDATE auth.users
    SET raw_app_meta_data = 
        coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'rbac_roles', coalesce(v_roles, '[]'::jsonb),
            'rbac_permissions', coalesce(v_permissions, '[]'::jsonb),
            'is_platform_admin', v_is_platform_admin
        )
    WHERE id = p_user_id;
END;
$$;

-- Also sync on grant changes
CREATE OR REPLACE FUNCTION public.sync_rbac_grants_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If user-specific grant, sync that user
    IF (TG_OP <> 'DELETE' AND NEW.user_id IS NOT NULL) THEN
        PERFORM public.sync_rbac_to_auth_metadata_by_id(NEW.user_id);
    ELSIF (TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL) THEN
        PERFORM public.sync_rbac_to_auth_metadata_by_id(OLD.user_id);
    -- If role-based grant, sync all users with that role
    ELSIF (TG_OP <> 'DELETE' AND NEW.role_code IS NOT NULL) THEN
        DECLARE
            v_user_id UUID;
        BEGIN
            FOR v_user_id IN (SELECT user_id FROM public.rbac_assignments WHERE role_code = NEW.role_code) LOOP
                PERFORM public.sync_rbac_to_auth_metadata_by_id(v_user_id);
            END LOOP;
        END;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER sync_rbac_grants_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_grants
FOR EACH ROW EXECUTE FUNCTION public.sync_rbac_grants_to_auth_metadata();

