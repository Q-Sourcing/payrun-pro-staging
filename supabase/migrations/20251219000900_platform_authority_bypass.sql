-- Migration: Harden OBAC Multi-Tenancy
-- Phase 2: Platform Authority & Bypass

-- 0. Update JWT Sync Logic to include organization_id
-- This ensures RLS policies can use auth.jwt() -> app_metadata -> organization_id efficiently.
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
    v_org_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN v_user_id := OLD.user_id; ELSE v_user_id := NEW.user_id; END IF;

    -- Collect roles
    SELECT jsonb_agg(jsonb_build_object('role', role_code, 'scope_type', scope_type, 'scope_id', scope_id, 'org_id', org_id)) 
    INTO v_roles FROM public.rbac_assignments WHERE user_id = v_user_id;

    -- Collect permissions
    SELECT jsonb_agg(DISTINCT rp.permission_key) 
    INTO v_permissions FROM public.rbac_assignments a
    JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code AND rp.org_id = a.org_id
    WHERE a.user_id = v_user_id;

    -- Check platform admin
    v_is_platform_admin := public.is_platform_admin(v_user_id);
    
    -- Get primary organization_id
    SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = v_user_id;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'rbac_roles', coalesce(v_roles, '[]'::jsonb),
            'rbac_permissions', coalesce(v_permissions, '[]'::jsonb),
            'is_platform_admin', v_is_platform_admin,
            'organization_id', v_org_id
        )
    WHERE id = v_user_id;
    RETURN NULL;
END;
$$;

-- 1. Explicit Platform Admin Helper
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- If we're checking the current user and have a JWT, check it first for speed
  IF _user_id = auth.uid() AND current_setting('request.jwt.claims', true) IS NOT NULL THEN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean;
    IF v_is_admin IS TRUE THEN RETURN TRUE; END IF;
  END IF;

  -- Reliable DB fallback
  SELECT (raw_app_meta_data ->> 'is_platform_admin')::boolean
  INTO v_is_admin
  FROM auth.users
  WHERE id = _user_id;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update has_permission with Short-Circuit
CREATE OR REPLACE FUNCTION public.has_permission(
  _permission_key TEXT,
  _scope_type TEXT DEFAULT NULL,
  _scope_id UUID DEFAULT NULL,
  _user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  -- PLATFORM BYPASS: Explicitly required short-circuit
  IF public.is_platform_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Standard Permission Check
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_assignments ra
    JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code AND ra.org_id = rrp.org_id
    WHERE ra.user_id = _user_id
      AND rrp.permission_key = _permission_key
      AND (
        -- Scope Resolution Logic
        _scope_type IS NULL
        OR ra.scope_type = 'GLOBAL'
        OR (ra.scope_type = _scope_type AND (_scope_id IS NULL OR ra.scope_id = _scope_id))
        OR (ra.scope_type = 'ORGANIZATION' AND _scope_type IN ('COMPANY', 'PROJECT'))
        OR (ra.scope_type = 'COMPANY' AND _scope_type = 'PROJECT')
      )
  ) INTO v_has_perm;

  RETURN v_has_perm;
END;
$$;

-- 3. Standardize RLS Pattern Across Core Tables
-- We rewrite these to ensure They follow the architectural pattern:
-- (Bypass OR (Tenant Isolation AND Permission Check))

-- Ensure projects has organization_id for strict multi-tenancy
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.projects SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Organizations
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
CREATE POLICY "organizations_select_policy" ON public.organizations
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    public.has_permission('organizations.view', 'ORGANIZATION', id)
);

-- Companies
DROP POLICY IF EXISTS "companies_select_policy" ON public.companies;
CREATE POLICY "companies_select_policy" ON public.companies
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid 
     AND public.has_permission('companies.view', 'COMPANY', id))
);

-- Projects
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
CREATE POLICY "projects_select_policy" ON public.projects
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid 
     AND public.has_permission('projects.view', 'PROJECT', id))
);

-- Employees
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid 
     AND (
       public.has_permission('people.view', 'ORGANIZATION', organization_id) OR
       (company_id IS NOT NULL AND public.has_permission('people.view', 'COMPANY', company_id))
     )
    )
);

-- Pay Runs
DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.pay_runs;
CREATE POLICY "pay_runs_select_policy" ON public.pay_runs
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid 
     AND public.has_permission('payroll.view', 'ORGANIZATION', organization_id))
);

-- RBAC Tables (Self-Management & Platform access)
ALTER TABLE public.rbac_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.rbac_assignments;
DROP POLICY IF EXISTS "rbac_assignments_select_policy" ON public.rbac_assignments;
CREATE POLICY "rbac_assignments_select_policy" ON public.rbac_assignments
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR
    user_id = auth.uid() OR
    public.has_permission('admin.manage_users', 'ORGANIZATION', org_id)
);
