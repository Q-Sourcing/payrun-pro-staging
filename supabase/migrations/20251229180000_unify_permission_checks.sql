-- ==========================================================
-- 🛠️ FIX: UNIFY LEGACY AND OBAC PERMISSIONS
-- ==========================================================
-- Migration: 20251229180000_unify_permission_checks.sql
-- Purpose: 
-- Update RLS helper functions to check BOTH legacy public.users roles
-- AND the new public.rbac_assignments to ensure users are correctly authorized.

-- 1. check_is_super_admin
-- Checks for legacy 'super_admin' OR OBAC 'PLATFORM_SUPER_ADMIN'
CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Role
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Role
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id AND role_code = 'PLATFORM_SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


-- 2. check_is_org_super_admin
-- Checks for legacy 'super_admin'/'organization_admin' OR OBAC 'PLATFORM_SUPER_ADMIN'/'ORG_ADMIN'
CREATE OR REPLACE FUNCTION public.check_is_org_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Roles
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role IN ('super_admin', 'organization_admin') 
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id AND role_code IN ('PLATFORM_SUPER_ADMIN', 'ORG_ADMIN')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


-- 3. check_is_org_admin (General Admin + Payroll Manager)
CREATE OR REPLACE FUNCTION public.check_is_org_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Roles
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role IN ('super_admin', 'organization_admin', 'payroll_manager') 
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id 
    AND role_code IN ('PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE_CONTROLLER', 'COMPANY_PAYROLL_ADMIN')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.check_is_super_admin(uuid) IS 'Checks for Global Admin privileges in both legacy (users) and modern (OBAC) systems.';
COMMENT ON FUNCTION public.check_is_org_super_admin(uuid) IS 'Checks for Org Admin privileges in both legacy and modern systems.';
