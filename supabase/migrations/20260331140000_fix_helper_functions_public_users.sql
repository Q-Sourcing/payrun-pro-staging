-- ============================================================================
-- Fix check_is_super_admin, check_is_org_super_admin, check_is_org_admin
-- These functions still reference public.users which was dropped in
-- 20260330000000_cleanup_legacy_auth_tables. Remove the legacy checks
-- and rely solely on rbac_assignments + user_profiles.
-- ============================================================================

-- 1. check_is_super_admin
CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check OBAC platform-level role
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE rbac_assignments.user_id = $1
      AND role_code = 'PLATFORM_SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check user_profiles role (legacy bridge)
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = $1
      AND role IN ('super_admin', 'PLATFORM_SUPER_ADMIN')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check platform_admins table
  IF EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN auth.users au ON au.email = pa.email
    WHERE au.id = $1
      AND pa.allowed = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. check_is_org_super_admin
CREATE OR REPLACE FUNCTION public.check_is_org_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check OBAC org-level roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE rbac_assignments.user_id = $1
      AND role_code IN ('PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'org_admin', 'organization_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check user_profiles role (legacy bridge)
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = $1
      AND role IN ('super_admin', 'organization_admin', 'org_admin', 'ADMIN', 'admin',
                   'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'HR')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check platform_admins table
  IF EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN auth.users au ON au.email = pa.email
    WHERE au.id = $1
      AND pa.allowed = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 3. check_is_org_admin
CREATE OR REPLACE FUNCTION public.check_is_org_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check OBAC roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE rbac_assignments.user_id = $1
      AND role_code IN (
        'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE_CONTROLLER',
        'COMPANY_PAYROLL_ADMIN', 'ORG_PAYROLL_ADMIN', 'ORG_HEAD_OFFICE_PAYROLL'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check user_profiles role (legacy bridge)
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = $1
      AND role IN (
        'super_admin', 'organization_admin', 'payroll_manager',
        'admin', 'ADMIN', 'HR', 'org_admin', 'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.check_is_super_admin(uuid) IS 'Checks for Global Admin privileges via rbac_assignments and user_profiles (public.users removed).';
COMMENT ON FUNCTION public.check_is_org_super_admin(uuid) IS 'Checks for Org Admin privileges via rbac_assignments and user_profiles (public.users removed).';
COMMENT ON FUNCTION public.check_is_org_admin(uuid) IS 'Checks for Org Admin/Payroll Manager privileges via rbac_assignments and user_profiles (public.users removed).';
