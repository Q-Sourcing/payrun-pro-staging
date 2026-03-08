-- ─── Enable RLS on RBAC tables (if not already) ──────────────────────────────
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;

-- ─── rbac_permissions: all authenticated users can read; admins can write ─────
DROP POLICY IF EXISTS "rbac_permissions_select" ON public.rbac_permissions;
CREATE POLICY "rbac_permissions_select"
  ON public.rbac_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "rbac_permissions_insert" ON public.rbac_permissions;
CREATE POLICY "rbac_permissions_insert"
  ON public.rbac_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS "rbac_permissions_update" ON public.rbac_permissions;
CREATE POLICY "rbac_permissions_update"
  ON public.rbac_permissions FOR UPDATE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS "rbac_permissions_delete" ON public.rbac_permissions;
CREATE POLICY "rbac_permissions_delete"
  ON public.rbac_permissions FOR DELETE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

-- ─── rbac_roles: all authenticated users can read; admins can write ───────────
DROP POLICY IF EXISTS "rbac_roles_select" ON public.rbac_roles;
CREATE POLICY "rbac_roles_select"
  ON public.rbac_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "rbac_roles_insert" ON public.rbac_roles;
CREATE POLICY "rbac_roles_insert"
  ON public.rbac_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS "rbac_roles_update" ON public.rbac_roles;
CREATE POLICY "rbac_roles_update"
  ON public.rbac_roles FOR UPDATE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS "rbac_roles_delete" ON public.rbac_roles;
CREATE POLICY "rbac_roles_delete"
  ON public.rbac_roles FOR DELETE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

-- ─── rbac_role_permissions: read for all authenticated; write for admins ──────
DROP POLICY IF EXISTS "rbac_role_permissions_select" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_select"
  ON public.rbac_role_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "rbac_role_permissions_insert" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_insert"
  ON public.rbac_role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS "rbac_role_permissions_update" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_update"
  ON public.rbac_role_permissions FOR UPDATE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));

DROP POLICY IF EXISTS "rbac_role_permissions_delete" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_delete"
  ON public.rbac_role_permissions FOR DELETE
  TO authenticated
  USING (public.check_is_org_super_admin(auth.uid()));