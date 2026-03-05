BEGIN;

-- -------------------------------------------------------
-- 1) FIX SECURITY DEFINER VIEWS (convert to SECURITY INVOKER)
-- -------------------------------------------------------
ALTER VIEW IF EXISTS public.employee_master SET (security_invoker = true);
ALTER VIEW IF EXISTS public.paygroup_employees_legacy SET (security_invoker = true);
ALTER VIEW IF EXISTS public.paygroup_summary_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.master_payrolls SET (security_invoker = true);
ALTER VIEW IF EXISTS public.super_admin_dashboard SET (security_invoker = true);

-- -------------------------------------------------------
-- 2) ENABLE RLS ON TABLES
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.platform_admin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_security_settings ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 3) SAFE POLICIES (idempotent)
-- -------------------------------------------------------

-- platform_admin_devices:
-- admin_id references platform_admins.id, so scope access by mapping auth.uid()
-- to platform_admins.auth_user_id.
DROP POLICY IF EXISTS "devices_select_own" ON public.platform_admin_devices;
CREATE POLICY "devices_select_own"
ON public.platform_admin_devices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.id = platform_admin_devices.admin_id
      AND pa.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "devices_insert_own" ON public.platform_admin_devices;
CREATE POLICY "devices_insert_own"
ON public.platform_admin_devices
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.id = platform_admin_devices.admin_id
      AND pa.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "devices_update_own" ON public.platform_admin_devices;
CREATE POLICY "devices_update_own"
ON public.platform_admin_devices
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.id = platform_admin_devices.admin_id
      AND pa.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.id = platform_admin_devices.admin_id
      AND pa.auth_user_id = auth.uid()
  )
);

-- organization_security_settings:
-- org_id is the FK column and membership table is org_users.
DROP POLICY IF EXISTS "org_read" ON public.organization_security_settings;
CREATE POLICY "org_read"
ON public.organization_security_settings
FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT ou.org_id
    FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.status = 'active'
  )
);

DROP POLICY IF EXISTS "org_update" ON public.organization_security_settings;
CREATE POLICY "org_update"
ON public.organization_security_settings
FOR UPDATE
TO authenticated
USING (
  org_id IN (
    SELECT ou.org_id
    FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.status = 'active'
  )
)
WITH CHECK (
  org_id IN (
    SELECT ou.org_id
    FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.status = 'active'
  )
);

COMMIT;

