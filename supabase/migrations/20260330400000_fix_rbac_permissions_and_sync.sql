-- ============================================================================
-- Fix RBAC permission keys & sync function
-- ============================================================================
-- Problems:
-- 1. rbac_role_permissions for ADMIN/HR/etc use old keys (employees.view)
--    but the sidebar checks new keys (people.view). Need to add the new
--    keys to all roles that have the old equivalents.
-- 2. sync_rbac_to_jwt doesn't include user-level rbac_grants.
-- 3. sync_rbac_to_jwt doesn't set organization_id in app_metadata.
-- 4. No trigger on rbac_grants to re-sync JWT when grants change.
-- ============================================================================

-- ── 1. Add missing permission key mappings to all roles ─────────────────────
-- Map old keys -> new keys that the sidebar/frontend expects
-- We INSERT the new keys for any role that has the old equivalent
-- NOTE: rbac_role_permissions has NOT NULL org_id, so we copy it from the source row.

-- employees.view -> people.view
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT rp.role_code, 'people.view', rp.org_id
FROM public.rbac_role_permissions rp
WHERE rp.permission_key = 'employees.view'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = rp.role_code AND x.permission_key = 'people.view' AND x.org_id = rp.org_id
  );

-- employees.create -> people.create
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT rp.role_code, 'people.create', rp.org_id
FROM public.rbac_role_permissions rp
WHERE rp.permission_key = 'employees.create'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = rp.role_code AND x.permission_key = 'people.create' AND x.org_id = rp.org_id
  );

-- employees.update -> people.edit
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT rp.role_code, 'people.edit', rp.org_id
FROM public.rbac_role_permissions rp
WHERE rp.permission_key = 'employees.update'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = rp.role_code AND x.permission_key = 'people.edit' AND x.org_id = rp.org_id
  );

-- employees.delete -> people.delete
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT rp.role_code, 'people.delete', rp.org_id
FROM public.rbac_role_permissions rp
WHERE rp.permission_key = 'employees.delete'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = rp.role_code AND x.permission_key = 'people.delete' AND x.org_id = rp.org_id
  );

-- people.assign_project for roles that have paygroups.assign
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT rp.role_code, 'people.assign_project', rp.org_id
FROM public.rbac_role_permissions rp
WHERE rp.permission_key = 'paygroups.assign'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = rp.role_code AND x.permission_key = 'people.assign_project' AND x.org_id = rp.org_id
  );

-- Add projects.view to ADMIN, HR, GM, FINANCE if missing (per org)
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, 'projects.view', r.org_id
FROM public.rbac_roles r
WHERE r.code IN ('ADMIN', 'HR', 'GM', 'FINANCE')
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = 'projects.view' AND x.org_id = r.org_id
  );

-- Add projects.manage to ADMIN, GM if missing
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, 'projects.manage', r.org_id
FROM public.rbac_roles r
WHERE r.code IN ('ADMIN', 'GM')
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = 'projects.manage' AND x.org_id = r.org_id
  );

-- Add ehs.view_dashboard to ADMIN, HR, GM if missing
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, 'ehs.view_dashboard', r.org_id
FROM public.rbac_roles r
WHERE r.code IN ('ADMIN', 'HR', 'GM')
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = 'ehs.view_dashboard' AND x.org_id = r.org_id
  );

-- Add assets.view to ADMIN, HR, GM, FINANCE if missing
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, 'assets.view', r.org_id
FROM public.rbac_roles r
WHERE r.code IN ('ADMIN', 'HR', 'GM', 'FINANCE')
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = 'assets.view' AND x.org_id = r.org_id
  );

-- Add payroll.prepare and payroll.submit to ADMIN if missing
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, pkey, r.org_id
FROM public.rbac_roles r,
     unnest(ARRAY['payroll.prepare', 'payroll.submit']) AS pkey
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = pkey AND x.org_id = r.org_id
  );

-- Add attendance.manage, attendance.approve, attendance.view to ADMIN, HR if missing
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, pkey, r.org_id
FROM public.rbac_roles r,
     unnest(ARRAY['attendance.manage', 'attendance.approve', 'attendance.view']) AS pkey
WHERE r.code IN ('ADMIN', 'HR')
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = pkey AND x.org_id = r.org_id
  );

-- Add users.invite, users.edit to ADMIN if missing
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT DISTINCT r.code, pkey, r.org_id
FROM public.rbac_roles r,
     unnest(ARRAY['users.invite', 'users.edit']) AS pkey
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM public.rbac_role_permissions x
    WHERE x.role_code = r.code AND x.permission_key = pkey AND x.org_id = r.org_id
  );

-- ── 2. Fix sync_rbac_to_jwt to include rbac_grants + org_id ────────────────

CREATE OR REPLACE FUNCTION public.sync_rbac_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id  UUID;
BEGIN
  -- Handle both INSERT/UPDATE (NEW) and DELETE (OLD)
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Get the user's org_id from their first assignment
  SELECT ra.org_id INTO v_org_id
  FROM public.rbac_assignments ra
  WHERE ra.user_id = v_user_id
  LIMIT 1;

  -- Sync rbac_roles
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_roles}',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'role', ra.role_code,
            'scope_type', ra.scope_type,
            'scope_id', ra.scope_id,
            'org_id', ra.org_id
          )
        )
        FROM public.rbac_assignments ra
        WHERE ra.user_id = v_user_id
      ),
      '[]'::jsonb
    )
  )
  WHERE id = v_user_id;

  -- Sync rbac_permissions: UNION of role-level + user-level grants
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_permissions}',
    COALESCE(
      (
        SELECT jsonb_agg(DISTINCT perm)
        FROM (
          -- Role-level permissions from rbac_role_permissions
          SELECT rrp.permission_key AS perm
          FROM public.rbac_assignments ra
          JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
          WHERE ra.user_id = v_user_id
          UNION
          -- User-level ALLOW grants from rbac_grants
          SELECT rg.permission_key AS perm
          FROM public.rbac_grants rg
          WHERE rg.user_id = v_user_id
            AND rg.effect = 'ALLOW'
        ) combined
      ),
      '[]'::jsonb
    )
  )
  WHERE id = v_user_id;

  -- Sync is_platform_admin flag
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{is_platform_admin}',
    to_jsonb(
      EXISTS (
        SELECT 1
        FROM public.rbac_assignments ra
        JOIN public.rbac_roles rr ON ra.role_code = rr.code AND ra.org_id = rr.org_id
        WHERE ra.user_id = v_user_id
          AND rr.tier = 'PLATFORM'
          AND ra.scope_type = 'GLOBAL'
      )
    )
  )
  WHERE id = v_user_id;

  -- Sync organization_id
  IF v_org_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{organization_id}',
      to_jsonb(v_org_id::text)
    )
    WHERE id = v_user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 3. Add trigger on rbac_grants to re-sync JWT ───────────────────────────

CREATE OR REPLACE FUNCTION public.sync_grants_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Re-sync the full permissions array (role + user grants)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_permissions}',
    COALESCE(
      (
        SELECT jsonb_agg(DISTINCT perm)
        FROM (
          SELECT rrp.permission_key AS perm
          FROM public.rbac_assignments ra
          JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
          WHERE ra.user_id = v_user_id
          UNION
          SELECT rg.permission_key AS perm
          FROM public.rbac_grants rg
          WHERE rg.user_id = v_user_id
            AND rg.effect = 'ALLOW'
        ) combined
      ),
      '[]'::jsonb
    )
  )
  WHERE id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_grants_to_jwt ON public.rbac_grants;
CREATE TRIGGER trg_sync_grants_to_jwt
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_grants_to_jwt();

-- ── 4. Re-sync all existing users' JWT metadata ────────────────────────────
-- Fire the sync for every user that has at least one rbac_assignment

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id FROM public.rbac_assignments
  LOOP
    -- Get org_id
    DECLARE
      v_org_id UUID;
    BEGIN
      SELECT ra.org_id INTO v_org_id
      FROM public.rbac_assignments ra WHERE ra.user_id = rec.user_id LIMIT 1;

      -- Sync roles
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{rbac_roles}',
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'role', ra.role_code, 'scope_type', ra.scope_type,
            'scope_id', ra.scope_id, 'org_id', ra.org_id
          )) FROM public.rbac_assignments ra WHERE ra.user_id = rec.user_id),
          '[]'::jsonb
        )
      )
      WHERE id = rec.user_id;

      -- Sync permissions (role + user grants)
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{rbac_permissions}',
        COALESCE(
          (SELECT jsonb_agg(DISTINCT perm) FROM (
            SELECT rrp.permission_key AS perm
            FROM public.rbac_assignments ra
            JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
            WHERE ra.user_id = rec.user_id
            UNION
            SELECT rg.permission_key AS perm
            FROM public.rbac_grants rg
            WHERE rg.user_id = rec.user_id AND rg.effect = 'ALLOW'
          ) combined),
          '[]'::jsonb
        )
      )
      WHERE id = rec.user_id;

      -- Sync is_platform_admin
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{is_platform_admin}',
        to_jsonb(EXISTS (
          SELECT 1 FROM public.rbac_assignments ra
          JOIN public.rbac_roles rr ON ra.role_code = rr.code AND ra.org_id = rr.org_id
          WHERE ra.user_id = rec.user_id AND rr.tier = 'PLATFORM' AND ra.scope_type = 'GLOBAL'
        ))
      )
      WHERE id = rec.user_id;

      -- Sync organization_id
      IF v_org_id IS NOT NULL THEN
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{organization_id}',
          to_jsonb(v_org_id::text)
        )
        WHERE id = rec.user_id;
      END IF;
    END;
  END LOOP;
END $$;
