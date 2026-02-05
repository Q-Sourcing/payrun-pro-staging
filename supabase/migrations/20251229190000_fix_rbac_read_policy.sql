-- ==========================================================
-- 🛠️ FIX: RBAC READ PERMISSIONS
-- ==========================================================
-- Migration: 20251229190000_fix_rbac_read_policy.sql
-- Purpose: 
-- Allow users to read their own entries in public.rbac_assignments.
-- Without this, the frontend cannot verify if a user has an admin role,
-- causing valid admins to be treated as standard users.

-- 1. Enable RLS (just in case)
ALTER TABLE public.rbac_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Users can read own assignments
DROP POLICY IF EXISTS "Users can read own rbac assignments" ON public.rbac_assignments;
DROP POLICY IF EXISTS "Users can read own rbac assignments" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can read own rbac assignments" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can read own rbac assignments" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can read own rbac assignments" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Users can read own rbac assignments" ON public.rbac_assignments; CREATE POLICY "Users can read own rbac assignments" ON public.rbac_assignments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 3. Policy: Super Admins can view all assignments
-- We use the safe PL/PGSQL helper we defined earlier.
DROP POLICY IF EXISTS "Super admins can view all rbac assignments" ON public.rbac_assignments;
DROP POLICY IF EXISTS "Super admins can view all rbac assignments" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Super admins can view all rbac assignments" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Super admins can view all rbac assignments" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Super admins can view all rbac assignments" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Super admins can view all rbac assignments" ON public.rbac_assignments; CREATE POLICY "Super admins can view all rbac assignments" ON public.rbac_assignments
    FOR ALL TO authenticated
    USING (public.check_is_super_admin(auth.uid()));

-- 4. Policy: Org Admins can view assignments in their org?
-- rbac_assignments doesn't have org_id directly, it links to users or just has user_id.
-- For now, letting users read their own is sufficient for the frontend check.

-- 5. Fallback for user_roles (Legacy)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own legacy role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own legacy role" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can read own legacy role" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can read own legacy role" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can read own legacy role" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "Users can read own legacy role" ON public.user_roles; CREATE POLICY "Users can read own legacy role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
