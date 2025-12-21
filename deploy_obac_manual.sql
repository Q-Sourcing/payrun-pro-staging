-- Manual OBAC Schema Deployment
-- This script consolidates the critical OBAC migrations to deploy them manually

-- ==========================================================
-- OBAC (Organisation-Based Access Control) Core Schema
-- Based on: 20251219000600_core_obac_schema.sql
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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_code TEXT REFERENCES public.rbac_roles(code) ON DELETE CASCADE,
    permission_key TEXT NOT NULL REFERENCES public.rbac_permissions(key) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('ORGANIZATION', 'COMPANY', 'PROJECT')),
    scope_id UUID NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK ((user_id IS NOT NULL AND role_code IS NULL) OR (user_id IS NULL AND role_code IS NOT NULL))
);

-- Seed Roles
INSERT INTO public.rbac_roles (code, name, tier, description)
SELECT v.code, v.name, v.tier, v.description
FROM (VALUES
  ('PLATFORM_SUPER_ADMIN', 'Platform Super Admin', 'PLATFORM', 'Full system access'),
  ('PLATFORM_AUDITOR', 'Platform Auditor', 'PLATFORM', 'Read-only platform-wide access'),
  ('ORG_ADMIN', 'Organization Admin', 'ORGANIZATION', 'Full admin within an organization'),
  ('ORG_HR_ADMIN', 'Organization HR Admin', 'ORGANIZATION', 'HR management for an organization'),
  ('ORG_FINANCE_CONTROLLER', 'Organization Finance Controller', 'ORGANIZATION', 'Financial oversight for an organization'),
  ('ORG_AUDITOR', 'Organization Auditor', 'ORGANIZATION', 'Audit and compliance for an organization'),
  ('ORG_VIEWER', 'Organization Viewer', 'ORGANIZATION', 'Read-only access at organization level'),
  ('COMPANY_PAYROLL_ADMIN', 'Company Payroll Admin', 'COMPANY', 'Payroll admin for a company'),
  ('COMPANY_HR', 'Company HR', 'COMPANY', 'HR management for a company'),
  ('COMPANY_VIEWER', 'Company Viewer', 'COMPANY', 'View-only access for a company'),
  ('PROJECT_MANAGER', 'Project Manager', 'PROJECT', 'Manage a project'),
  ('PROJECT_PAYROLL_OFFICER', 'Project Payroll Officer', 'PROJECT', 'Handle payroll for a project'),
  ('PROJECT_VIEWER', 'Project Viewer', 'PROJECT', 'View-only project access'),
  ('SELF_USER', 'Self User', 'SELF', 'Standard user - self data only'),
  ('SELF_CONTRACTOR', 'Self Contractor', 'SELF', 'Contractor - self data only')
) AS v(code, name, tier, description)
WHERE NOT EXISTS (SELECT 1 FROM public.rbac_roles t WHERE t.code = v.code);

-- Seed Permissions
INSERT INTO public.rbac_permissions (key, category, description)
SELECT v.key, v.category, v.description
FROM (VALUES
  ('people.view', 'People', 'View employee data'),
  ('people.create', 'People', 'Create employees'),
  ('people.edit', 'People', 'Edit employee data'),
  ('people.delete', 'People', 'Delete employees'),
  ('people.view_sensitive', 'People', 'View sensitive employee info (e.g., salary, SSN)'),
  ('people.assign_project', 'People', 'Assign employees to projects'),
  ('payroll.view', 'Payroll', 'View payroll data'),
  ('payroll.prepare', 'Payroll', 'Prepare pay runs'),
  ('payroll.submit', 'Payroll', 'Submit pay runs for approval'),
  ('payroll.approve', 'Payroll', 'Approve pay runs'),
  ('payroll.rollback', 'Payroll', 'Rollback approved pay runs'),
  ('payroll.export_bank', 'Payroll', 'Export bank schedules'),
  ('payroll.export_mobile_money', 'Payroll', 'Export mobile money schedules'),
  ('projects.view', 'Projects', 'View projects'),
  ('projects.create', 'Projects', 'Create projects'),
  ('projects.edit', 'Projects', 'Edit projects'),
  ('projects.delete', 'Projects', 'Delete projects'),
  ('paygroups.view', 'Pay Groups', 'View pay groups'),
  ('paygroups.create', 'Pay Groups', 'Create pay groups'),
  ('paygroups.edit', 'Pay Groups', 'Edit pay groups'),
  ('paygroups.delete', 'Pay Groups', 'Delete pay groups'),
  ('reports.view', 'Reports', 'View reports'),
  ('reports.export', 'Reports', 'Export reports'),
  ('analytics.view', 'Analytics', 'View analytics dashboards'),
  ('finance.view_reports', 'Finance', 'View financial reports'),
  ('finance.view_bank_details', 'Finance', 'View bank account details'),
  ('admin.manage_users', 'Admin', 'Manage users'),
  ('admin.assign_roles', 'Admin', 'Assign roles to users'),
  ('admin.impersonate', 'Admin', 'Impersonate other users'),
  ('admin.system_config', 'Admin', 'Configure system settings')
) AS v(key, category, description)
WHERE NOT EXISTS (SELECT 1 FROM public.rbac_permissions t WHERE t.key = v.key);

-- Map Roles to Permissions
INSERT INTO public.rbac_role_permissions (role_code, permission_key)
SELECT v.role_code, v.permission_key
FROM (VALUES
  -- PLATFORM_SUPER_ADMIN: ALL permissions
  ('PLATFORM_SUPER_ADMIN', 'people.view'),
  ('PLATFORM_SUPER_ADMIN', 'people.create'),
  ('PLATFORM_SUPER_ADMIN', 'people.edit'),
  ('PLATFORM_SUPER_ADMIN', 'people.delete'),
  ('PLATFORM_SUPER_ADMIN', 'people.view_sensitive'),
  ('PLATFORM_SUPER_ADMIN', 'people.assign_project'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.view'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.prepare'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.submit'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.approve'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.rollback'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.export_bank'),
  ('PLATFORM_SUPER_ADMIN', 'payroll.export_mobile_money'),
  ('PLATFORM_SUPER_ADMIN', 'projects.view'),
  ('PLATFORM_SUPER_ADMIN', 'projects.create'),
  ('PLATFORM_SUPER_ADMIN', 'projects.edit'),
  ('PLATFORM_SUPER_ADMIN', 'projects.delete'),
  ('PLATFORM_SUPER_ADMIN', 'paygroups.view'),
  ('PLATFORM_SUPER_ADMIN', 'paygroups.create'),
  ('PLATFORM_SUPER_ADMIN', 'paygroups.edit'),
  ('PLATFORM_SUPER_ADMIN', 'paygroups.delete'),
  ('PLATFORM_SUPER_ADMIN', 'reports.view'),
  ('PLATFORM_SUPER_ADMIN', 'reports.export'),
  ('PLATFORM_SUPER_ADMIN', 'analytics.view'),
  ('PLATFORM_SUPER_ADMIN', 'finance.view_reports'),
  ('PLATFORM_SUPER_ADMIN', 'finance.view_bank_details'),
  ('PLATFORM_SUPER_ADMIN', 'admin.manage_users'),
  ('PLATFORM_SUPER_ADMIN', 'admin.assign_roles'),
  ('PLATFORM_SUPER_ADMIN', 'admin.impersonate'),
  ('PLATFORM_SUPER_ADMIN', 'admin.system_config'),
  
  -- ORG_ADMIN: Organization-level admin
  ('ORG_ADMIN', 'people.view'),
  ('ORG_ADMIN', 'people.create'),
  ('ORG_ADMIN', 'people.edit'),
  ('ORG_ADMIN', 'people.delete'),
  ('ORG_ADMIN', 'people.view_sensitive'),
  ('ORG_ADMIN', 'people.assign_project'),
  ('ORG_ADMIN', 'payroll.view'),
  ('ORG_ADMIN', 'payroll.prepare'),
  ('ORG_ADMIN', 'payroll.submit'),
  ('ORG_ADMIN', 'payroll.approve'),
  ('ORG_ADMIN', 'payroll.export_bank'),
  ('ORG_ADMIN', 'payroll.export_mobile_money'),
  ('ORG_ADMIN', 'projects.view'),
  ('ORG_ADMIN', 'projects.create'),
  ('ORG_ADMIN', 'projects.edit'),
  ('ORG_ADMIN', 'projects.delete'),
  ('ORG_ADMIN', 'paygroups.view'),
  ('ORG_ADMIN', 'paygroups.create'),
  ('ORG_ADMIN', 'paygroups.edit'),
  ('ORG_ADMIN', 'paygroups.delete'),
  ('ORG_ADMIN', 'reports.view'),
  ('ORG_ADMIN', 'reports.export'),
  ('ORG_ADMIN', 'analytics.view'),
  ('ORG_ADMIN', 'finance.view_reports'),
  ('ORG_ADMIN', 'finance.view_bank_details'),
  ('ORG_ADMIN', 'admin.manage_users'),
  ('ORG_ADMIN', 'admin.assign_roles'),
  
  -- PROJECT_MANAGER
  ('PROJECT_MANAGER', 'people.view'),
  ('PROJECT_MANAGER', 'people.assign_project'),
  ('PROJECT_MANAGER', 'payroll.view'),
  ('PROJECT_MANAGER', 'payroll.prepare'),
  ('PROJECT_MANAGER', 'payroll.submit'),
  ('PROJECT_MANAGER', 'projects.view'),
  ('PROJECT_MANAGER', 'paygroups.view'),
  ('PROJECT_MANAGER', 'reports.view')
) AS v(role_code, permission_key)
WHERE NOT EXISTS (SELECT 1 FROM public.rbac_role_permissions t WHERE t.role_code = v.role_code AND t.permission_key = v.permission_key);

-- 🔥 REFINED CLEANUP: Only drop legacy/ambiguous overloads that are NOT depended on by RLS
-- We explicitly avoid dropping (TEXT, TEXT, UUID, UUID) because RLS depends on it.
DROP FUNCTION IF EXISTS public.has_permission(UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.has_permission(UUID, VARCHAR(100));
DROP FUNCTION IF EXISTS public.has_permission(UUID, TEXT, TEXT, UUID); -- The redundant one with defaults
DROP FUNCTION IF EXISTS public.has_permission(UUID, TEXT); -- Dropping to redefine cleanly

-- 1. Helper Function: Master Permission Check (Standard OBAC 4-arg version)
-- Redefining in-place to avoid dependency errors.
-- This version is used by RLS and covers 1-4 argument calls via defaults.
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
  v_is_platform_admin BOOLEAN;
BEGIN
  -- A. platform_admins table bypass
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE auth_user_id = _user_id AND allowed = true
  ) INTO v_is_platform_admin;
  
  IF v_is_platform_admin THEN RETURN TRUE; END IF;

  -- B. PLATFORM_SUPER_ADMIN role bypass
  SELECT EXISTS (
    SELECT 1 FROM public.rbac_assignments WHERE user_id = _user_id AND role_code = 'PLATFORM_SUPER_ADMIN'
  ) INTO v_is_platform_admin;

  IF v_is_platform_admin THEN RETURN TRUE; END IF;

  -- C. Standard Role/Permission Check
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_assignments ra
    JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
    WHERE ra.user_id = _user_id
      AND rrp.permission_key = _permission_key
      AND (
        ra.scope_type = 'GLOBAL'
        OR (ra.scope_type = _scope_type AND (_scope_id IS NULL OR ra.scope_id = _scope_id))
        OR (ra.scope_type = 'ORGANIZATION' AND _scope_type IN ('COMPANY', 'PROJECT'))
        OR (ra.scope_type = 'COMPANY' AND _scope_type = 'PROJECT')
      )
  ) INTO v_has_perm;

  RETURN v_has_perm;
END;
$$;

-- 2. Legacy Shim (2-arg version, NO DEFAULTS)
-- Specifically to resolve ambiguity for ippms calls: has_permission(UUID, TEXT)
-- Since the master version starts with TEXT, this UUID-first signature is non-ambiguous.
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_permission_key TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Calls the master version, re-ordering arguments
  SELECT public.has_permission($2, NULL, NULL, $1);
$$;

-- JWT Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_rbac_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update auth.users app_metadata with role assignments and permissions
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_roles}',
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role', ra.role_code,
          'scope_type', ra.scope_type,
          'scope_id', ra.scope_id
        )
      )
      FROM public.rbac_assignments ra
      WHERE ra.user_id = NEW.user_id
    )
  )
  WHERE id = NEW.user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_permissions}',
    (
      SELECT jsonb_agg(DISTINCT rrp.permission_key)
      FROM public.rbac_assignments ra
      JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
      WHERE ra.user_id = NEW.user_id
    )
  )
  WHERE id = NEW.user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{is_platform_admin}',
    to_jsonb(
      EXISTS (
        SELECT 1
        FROM public.rbac_assignments ra
        JOIN public.rbac_roles rr ON ra.role_code = rr.code
        WHERE ra.user_id = NEW.user_id
          AND rr.tier = 'PLATFORM'
          AND ra.scope_type = 'GLOBAL'
      )
    )
  )
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rbac_assignments_sync_jwt ON public.rbac_assignments;
CREATE TRIGGER rbac_assignments_sync_jwt
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_rbac_to_jwt();

-- Enable RLS on RBAC tables
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_grants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rbac_assignments (users can view their own roles)
CREATE POLICY "Users can view their own role assignments"
  ON public.rbac_assignments
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'admin.manage_users'));

CREATE POLICY "Admins can manage role assignments"
  ON public.rbac_assignments
  FOR ALL
  USING (public.has_permission(auth.uid(), 'admin.assign_roles'));

-- Mark migrations as applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN
        INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
        SELECT v.version, v.name, v.statements
        FROM (VALUES
          ('20251219000600', 'core_obac_schema', ARRAY['Core OBAC Schema Deployed Manually']::text[]),
          ('20251219000700', 'enforce_rbac_rls', ARRAY['RBAC RLS Policies Deployed Manually']::text[])
        ) AS v(version, name, statements)
        WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations t WHERE t.version = v.version);
    END IF;
END $$;
