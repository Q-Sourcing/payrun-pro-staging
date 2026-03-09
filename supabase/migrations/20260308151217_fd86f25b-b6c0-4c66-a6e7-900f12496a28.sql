-- ─── Add missing unique constraints ─────────────────────────────────────────
ALTER TABLE public.rbac_permissions
  ADD CONSTRAINT rbac_permissions_key_unique UNIQUE (key);

ALTER TABLE public.rbac_roles
  ADD CONSTRAINT rbac_roles_code_unique UNIQUE (code);

ALTER TABLE public.rbac_role_permissions
  ADD CONSTRAINT rbac_role_permissions_unique UNIQUE (role_code, permission_key, org_id);

-- ─── Seed Predefined Permissions ─────────────────────────────────────────────
INSERT INTO public.rbac_permissions (key, category, description)
VALUES
  ('view_dashboard',             'Dashboard', 'Access the main dashboard'),
  ('manage_users',               'Users',     'Create, update, and delete users'),
  ('assign_roles',               'Users',     'Assign roles to users'),
  ('manage_paygroups',           'Payroll',   'Create and modify pay groups'),
  ('manage_earnings_deductions', 'Payroll',   'Add or modify earnings and deductions'),
  ('generate_payroll',           'Payroll',   'Process payroll for employees'),
  ('view_reports',               'Reports',   'Access payroll and account reports'),
  ('view_own_profile',           'Profile',   'View own profile and payslips'),
  ('update_own_profile',         'Profile',   'Update personal information')
ON CONFLICT (key) DO UPDATE
  SET category    = EXCLUDED.category,
      description = EXCLUDED.description;

-- ─── Seed Predefined Roles (org_id = NULL for system-wide roles) ──────────────
-- rbac_roles.org_id is NOT NULL, so use sentinel UUID for global roles
INSERT INTO public.rbac_roles (code, name, description, tier, org_id)
VALUES
  ('ORG_ADMIN',    'Admin',                  'Full access to the system; can manage users, pay groups, earnings/deductions, and system settings.',                     'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
  ('ORG_HR_ADMIN', 'HR/Payroll Manager',     'Can create/manage employee records, pay groups, earnings/deductions, generate payroll, and view reports.',               'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
  ('ORG_KAE',      'Key Accounts Executive', 'Can view payroll reports and employee summaries but cannot create or modify users or pay settings.',                     'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
  ('ORG_EMPLOYEE', 'Staff / Employee',       'Can view their own payroll information, download payslips, and update personal info.',                                   'ORGANIZATION', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      tier        = EXCLUDED.tier;

-- ─── Seed Role → Permission mappings ─────────────────────────────────────────
DO $$
DECLARE
  s uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  DELETE FROM public.rbac_role_permissions
  WHERE org_id = s
    AND role_code IN ('ORG_ADMIN','ORG_HR_ADMIN','ORG_KAE','ORG_EMPLOYEE');

  -- Admin → all permissions
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
  SELECT 'ORG_ADMIN', key, s FROM public.rbac_permissions;

  -- HR/Payroll Manager
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
    ('ORG_HR_ADMIN','view_dashboard',s),
    ('ORG_HR_ADMIN','manage_paygroups',s),
    ('ORG_HR_ADMIN','manage_earnings_deductions',s),
    ('ORG_HR_ADMIN','generate_payroll',s),
    ('ORG_HR_ADMIN','view_reports',s),
    ('ORG_HR_ADMIN','view_own_profile',s),
    ('ORG_HR_ADMIN','update_own_profile',s);

  -- KAE
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
    ('ORG_KAE','view_dashboard',s),
    ('ORG_KAE','view_reports',s),
    ('ORG_KAE','view_own_profile',s);

  -- Employee
  INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
    ('ORG_EMPLOYEE','view_dashboard',s),
    ('ORG_EMPLOYEE','view_own_profile',s),
    ('ORG_EMPLOYEE','update_own_profile',s);
END $$;