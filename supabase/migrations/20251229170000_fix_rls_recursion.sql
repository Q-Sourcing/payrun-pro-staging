-- ==========================================================
-- 🛠️ FIX: RLS INFINITE RECURSION
-- ==========================================================
-- Migration: 20251229170000_fix_rls_recursion.sql
-- Purpose: 
-- 1. Redefine security helpers as LANGUAGE plpgsql to prevent inlining.
-- 2. Replace recursive subqueries in policies with safe helper calls.

-- 1. Redefine security helpers as LANGUAGE plpgsql (PREVENTS INLINING)
-- These must be SECURITY DEFINER to bypass RLS when checking roles.
-- We set search_path to public for security.

CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_org_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role IN ('super_admin', 'organization_admin') 
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_org_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role IN ('super_admin', 'organization_admin', 'payroll_manager') 
  );
END;
$$;

-- 2. Update recursive policies on public.users
-- We drop and recreate them to use the safe helpers.

DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Super admins can view all users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Super admins can view all users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Super admins can view all users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Super admins can view all users" ON public.users; CREATE POLICY "Super admins can view all users" ON public.users
    FOR ALL TO authenticated
    USING (public.check_is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.users;
DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.users; CREATE POLICY "Organization admins can view organization users" ON public.users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users u1
            WHERE u1.id = auth.uid() 
            AND u1.role = 'organization_admin'
            AND u1.organization_id = public.users.organization_id
        )
    );
-- Wait, the second one above is still recursive if it queries public.users!
-- Let's use a helper for org_id too.

CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.users WHERE id = user_id);
END;
$$;

DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.users;
DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Organization admins can view organization users" ON public.users; CREATE POLICY "Organization admins can view organization users" ON public.users
    FOR SELECT TO authenticated
    USING (
        (public.check_is_org_super_admin(auth.uid()) AND organization_id = public.get_user_organization_id(auth.uid()))
    );

DROP POLICY IF EXISTS "Department managers can view department users" ON public.users;
DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Department managers can view department users" ON public.users; CREATE POLICY "Department managers can view department users" ON public.users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users u1
            WHERE u1.id = auth.uid() 
            AND u1.role = 'payroll_manager'
            AND u1.department_id = public.users.department_id
        )
    );
-- Still potentially recursive. Let's make it fully safe.

CREATE OR REPLACE FUNCTION public.get_user_department_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT department_id FROM public.users WHERE id = user_id);
END;
$$;

DROP POLICY IF EXISTS "Department managers can view department users" ON public.users;
DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Department managers can view department users" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Department managers can view department users" ON public.users; CREATE POLICY "Department managers can view department users" ON public.users
    FOR SELECT TO authenticated
    USING (
        (public.check_is_org_admin(auth.uid()) AND department_id = public.get_user_department_id(auth.uid()))
    );

-- 3. Verify other tables that might have inherited the legacy LANGUAGE sql helpers
-- The helpers are CREATE OR REPLACE, so they are already updated globally.

-- 4. Final Audit
COMMENT ON FUNCTION public.check_is_super_admin(uuid) IS 'Safe RLS helper (plpgsql) to check super_admin role without recursion.';
COMMENT ON FUNCTION public.get_user_organization_id(uuid) IS 'Safe RLS helper to get user organization without recursion.';
