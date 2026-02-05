-- ==========================================================
-- 🔥 PHASE 5: UNIFIED OBAC & SECURITY TIGHTENING
-- ==========================================================
-- Migration: 20251219000200_tighten_obac.sql
-- Purpose: 
-- 1. Fix broken foreign keys and legacy table references.
-- 2. Unify security helper functions.
-- 3. Standardize RLS policies on modern OBAC system.
-- 4. Ensure multi-tenant isolation for all audit logs.

-- ----------------------------
-- 0) Ensure Role Enums are Up-to-Date
-- ----------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'org_super_admin';
    END IF;
END $$;

-- ----------------------------
-- 1) Standardize Helper Functions
-- ----------------------------

-- Ensure platform_admins table exists for global bypass
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Re-enable RLS on platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins readable by platform admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform admins readable by platform admins" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Platform admins readable by platform admins" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Platform admins readable by platform admins" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Platform admins readable by platform admins" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Platform admins readable by platform admins" 
ON public.platform_admins FOR SELECT TO authenticated 
USING (
    auth_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = auth.uid() AND allowed = true)
);

-- REFINED Helper: is_platform_admin
-- Checks BOTH the dedicated table and legacy app_role
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins 
        WHERE auth_user_id = auth.uid() AND allowed = true
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = 'platform_admin'
    ) OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$;

-- REFINED Helper: current_org_id
-- Prioritizes org_users then user_profiles
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ou.org_id
      FROM public.org_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
      ORDER BY ou.created_at DESC
      LIMIT 1
    ),
    (
      SELECT up.organization_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
      LIMIT 1
    )
  );
$$;

-- ----------------------------
-- 2) Repair auth_events Schema (Defensive check)
-- ----------------------------

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_events') THEN
        -- Fix org_id foreign key (previously pointed to pay_groups)
        ALTER TABLE public.auth_events 
        DROP CONSTRAINT IF EXISTS auth_events_org_id_fkey;

        ALTER TABLE public.auth_events
        ADD CONSTRAINT auth_events_org_id_fkey 
        FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ----------------------------
-- 3) Update RLS Policies
-- ----------------------------

-- Organizations
DROP POLICY IF EXISTS "org_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_select_same_org_or_super_admin" ON public.organizations;
DROP POLICY IF EXISTS "org_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "org_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "org_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "org_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "org_select_policy" ON public.organizations; CREATE POLICY "org_select_policy" ON public.organizations 
FOR SELECT TO authenticated 
USING (
    public.is_platform_admin() OR 
    id = public.current_org_id()
);

-- Activity Logs (Multi-tenant check)
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_same_org_or_super_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs; CREATE POLICY "activity_logs_select_policy" ON public.activity_logs 
FOR SELECT TO authenticated 
USING (
    public.is_platform_admin() OR 
    organization_id = public.current_org_id()
);

-- Auth Events (Multi-tenant check)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_events') THEN
        DROP POLICY IF EXISTS "Platform admins can view all auth events" ON public.auth_events;
        DROP POLICY IF EXISTS "Org super admins can view org auth events" ON public.auth_events;
        DROP POLICY IF EXISTS "Users can view own auth events" ON public.auth_events;

        DROP POLICY IF EXISTS "auth_events_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "auth_events_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "auth_events_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "auth_events_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "auth_events_select_policy" ON public.auth_events; CREATE POLICY "auth_events_select_policy" ON public.auth_events 
        FOR SELECT TO authenticated 
        USING (
            public.is_platform_admin() OR 
            (org_id = public.current_org_id() AND (
                user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE id = auth.uid() AND role IN ('super_admin', 'org_admin')
                )
            ))
        );
    END IF;
END $$;

-- User Profiles
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own_or_super_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles; CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR 
    id = auth.uid() OR 
    organization_id = public.current_org_id()
);

-- User Invites (Modernize for performance)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_invites') THEN
        DROP POLICY IF EXISTS "Users can view invites addressed to them" ON public.user_invites;
        DROP POLICY IF EXISTS "user_invites_self_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "user_invites_self_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "user_invites_self_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "user_invites_self_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "user_invites_self_select_policy" ON public.user_invites; CREATE POLICY "user_invites_self_select_policy" ON public.user_invites
        FOR SELECT TO authenticated
        USING (
            email = auth.jwt()->>'email' OR
            inviter_id = auth.uid() OR
            public.is_platform_admin()
        );
    END IF;
END $$;

-- ----------------------------
-- 4) Clean up Legacy References
-- ----------------------------

-- Update any functions still using public.profiles
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.user_profiles 
  WHERE id = _user_id
  LIMIT 1
$$;

-- Add triggers to sync platform_admins if needed (optional, keeping manual for now)

-- ----------------------------
-- 5) Final Audit Log Entry
-- ----------------------------
COMMENT ON TABLE public.platform_admins IS 'Global platform administrators with cross-tenant access.';
