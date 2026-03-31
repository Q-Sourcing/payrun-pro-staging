-- ============================================================================
-- RBAC Improvements
-- ============================================================================
-- 1. Drop global-unique code constraint (blocks multi-tenant role provisioning)
-- 2. Fix attedance typo in rbac_permissions
-- 3. Trigger: sync JWT immediately when role permissions change
-- 4. Auto-provision default roles on new org creation
-- 5. Backfill missing default roles/permissions for existing orgs
-- ============================================================================

-- ── 1. Drop global UNIQUE(code) — PK(code, org_id) already enforces per-org uniqueness ──
ALTER TABLE public.rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_code_unique;

-- ── 2. Clean up typo key ──────────────────────────────────────────────────────
-- 'attedance' is a typo, the correct key 'attendance.*' already exists
DELETE FROM public.rbac_role_permissions WHERE permission_key = 'attedance';
DELETE FROM public.rbac_grants           WHERE permission_key = 'attedance';
DELETE FROM public.rbac_permissions      WHERE key            = 'attedance';

-- ── 3. Add Assets module to rbac_permissions registry (if missing) ────────────
INSERT INTO public.rbac_permissions (key, category, description) VALUES
  ('assets.view',           'Assets', 'View work assets list'),
  ('assets.create',         'Assets', 'Add new work assets'),
  ('assets.edit',           'Assets', 'Edit asset records'),
  ('assets.delete',         'Assets', 'Delete asset records'),
  ('assets.view_financials','Assets', 'View asset financial values and costs')
ON CONFLICT (key) DO NOTHING;

-- ── 4. Trigger: re-sync JWT for all members of a role when its permissions change ──
-- Without this, permission changes only take effect after users re-login.

CREATE OR REPLACE FUNCTION public.sync_role_perms_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_code TEXT;
  rec RECORD;
BEGIN
  v_role_code := COALESCE(NEW.role_code, OLD.role_code);

  -- For every user currently assigned this role, re-sync their full permissions array
  FOR rec IN
    SELECT DISTINCT ra.user_id
    FROM public.rbac_assignments ra
    WHERE ra.role_code = v_role_code
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{rbac_permissions}',
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT perm)
          FROM (
            -- Role-level permissions (all roles this user has)
            SELECT rrp.permission_key AS perm
            FROM public.rbac_assignments ra2
            JOIN public.rbac_role_permissions rrp ON ra2.role_code = rrp.role_code
            WHERE ra2.user_id = rec.user_id
            UNION
            -- User-level ALLOW grants
            SELECT rg.permission_key AS perm
            FROM public.rbac_grants rg
            WHERE rg.user_id = rec.user_id AND rg.effect = 'ALLOW'
          ) combined
        ),
        '[]'::jsonb
      )
    )
    WHERE id = rec.user_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_perms_to_jwt ON public.rbac_role_permissions;
CREATE TRIGGER trg_sync_role_perms_to_jwt
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_perms_to_jwt();

-- ── 5. Function: provision default roles + permissions for an org ─────────────

CREATE OR REPLACE FUNCTION public.provision_default_roles(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create the 6 default roles (skip if already exist for this org)
  INSERT INTO public.rbac_roles (code, name, description, tier, org_id) VALUES
    ('ADMIN',          'Admin',                'Full organization admin access',        'ORGANIZATION', p_org_id),
    ('HR',             'HR',                   'Human Resources management',            'ORGANIZATION', p_org_id),
    ('GM',             'General Manager',      'General manager access',               'ORGANIZATION', p_org_id),
    ('FINANCE',        'Finance',              'Finance and payroll access',            'ORGANIZATION', p_org_id),
    ('STAFF',          'Staff',                'General staff access',                  'ORGANIZATION', p_org_id),
    ('SELF_USER',      'Self-Service User',    'Employee self-service access',          'ORGANIZATION', p_org_id),
    ('SELF_CONTRACTOR','Self-Service Contractor','Contractor self-service access',      'ORGANIZATION', p_org_id)
  ON CONFLICT (code, org_id) DO NOTHING;

  -- ADMIN: everything except self-service only keys
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'ADMIN', p.key, p_org_id
  FROM public.rbac_permissions p
  WHERE p.key NOT IN ('people.view_self', 'payroll.view_self')
  ON CONFLICT DO NOTHING;

  -- HR: people, attendance, contracts, users
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'HR', v.key, p_org_id
  FROM (VALUES
    ('people.view'), ('people.create'), ('people.edit'), ('people.assign_project'),
    ('people.view_sensitive'),
    ('attendance.view'), ('attendance.manage'), ('attendance.approve'),
    ('contracts.view'), ('contracts.manage'),
    ('reports.view'),
    ('users.view'), ('users.invite'), ('users.edit')
  ) v(key)
  WHERE EXISTS (SELECT 1 FROM public.rbac_permissions rp WHERE rp.key = v.key)
  ON CONFLICT DO NOTHING;

  -- FINANCE: payroll, pay groups, earnings, reports
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'FINANCE', v.key, p_org_id
  FROM (VALUES
    ('people.view'),
    ('payroll.view'), ('payroll.prepare'), ('payroll.submit'), ('payroll.approve'),
    ('payroll.export_bank'),
    ('paygroups.view'),
    ('earnings.view'), ('earnings.manage'),
    ('reports.view'), ('finance.view_reports'), ('reports.export')
  ) v(key)
  WHERE EXISTS (SELECT 1 FROM public.rbac_permissions rp WHERE rp.key = v.key)
  ON CONFLICT DO NOTHING;

  -- GM: overview + approvals
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'GM', v.key, p_org_id
  FROM (VALUES
    ('people.view'),
    ('projects.view'), ('projects.manage'),
    ('payroll.view'), ('payroll.approve'),
    ('paygroups.view'),
    ('reports.view'), ('finance.view_reports'),
    ('ehs.view_dashboard'),
    ('assets.view')
  ) v(key)
  WHERE EXISTS (SELECT 1 FROM public.rbac_permissions rp WHERE rp.key = v.key)
  ON CONFLICT DO NOTHING;

  -- STAFF: read-only on basic modules
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'STAFF', v.key, p_org_id
  FROM (VALUES
    ('people.view'), ('projects.view'), ('attendance.view')
  ) v(key)
  WHERE EXISTS (SELECT 1 FROM public.rbac_permissions rp WHERE rp.key = v.key)
  ON CONFLICT DO NOTHING;

  -- SELF_USER: own data only
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'SELF_USER', v.key, p_org_id
  FROM (VALUES
    ('people.view_self'), ('payroll.view_self')
  ) v(key)
  WHERE EXISTS (SELECT 1 FROM public.rbac_permissions rp WHERE rp.key = v.key)
  ON CONFLICT DO NOTHING;

  -- SELF_CONTRACTOR: own data only
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'SELF_CONTRACTOR', v.key, p_org_id
  FROM (VALUES
    ('people.view_self'), ('payroll.view_self')
  ) v(key)
  WHERE EXISTS (SELECT 1 FROM public.rbac_permissions rp WHERE rp.key = v.key)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── 6. Trigger: auto-provision default roles when a new org is created ────────

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip the sentinel platform org (all-zeros UUID)
  IF NEW.id = '00000000-0000-0000-0000-000000000000' THEN
    RETURN NEW;
  END IF;
  PERFORM public.provision_default_roles(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_default_roles ON public.organizations;
CREATE TRIGGER trg_provision_default_roles
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- ── 7. Backfill: provision any missing defaults for existing orgs ─────────────

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.organizations
    WHERE id != '00000000-0000-0000-0000-000000000000'
  LOOP
    PERFORM public.provision_default_roles(rec.id);
  END LOOP;
END $$;
