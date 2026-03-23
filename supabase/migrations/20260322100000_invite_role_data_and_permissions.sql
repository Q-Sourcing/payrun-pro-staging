-- ============================================================
-- Migration: Invite role_data column + Seed registry permissions
-- ============================================================

-- 1. Add role_data column to user_management_invitations if missing
ALTER TABLE IF EXISTS public.user_management_invitations
  ADD COLUMN IF NOT EXISTS role_data JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure SELF_USER and SELF_CONTRACTOR roles exist in rbac_roles
INSERT INTO public.rbac_roles (code, name, description, tier, org_id)
VALUES
  ('SELF_USER',       'Self-Service User',       'Employee with access to own payslips and personal info only', 'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
  ('SELF_CONTRACTOR', 'Self-Service Contractor',  'Contractor with limited self-service access', 'ORGANIZATION', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 3. Seed all registry-defined permissions into rbac_permissions
-- These map to SYSTEM_MODULES_REGISTRY in src/lib/constants/permissions-registry.ts
INSERT INTO public.rbac_permissions (key, category, description)
VALUES
  -- Employees
  ('people.view',           'Employees',          'View employee list and profiles'),
  ('people.create',         'Employees',          'Add new employees'),
  ('people.edit',           'Employees',          'Edit employee records'),
  ('people.delete',         'Employees',          'Remove employees from the system'),
  ('people.view_sensitive', 'Employees',          'View sensitive fields (salary, ID numbers)'),
  ('people.assign_project', 'Employees',          'Assign employees to projects'),
  ('people.view_self',      'Employees',          'View own employee profile (self-service)'),

  -- Payroll Processing
  ('payroll.view',          'Payroll Processing', 'View pay run summaries'),
  ('payroll.prepare',       'Payroll Processing', 'Prepare payroll calculations'),
  ('payroll.submit',        'Payroll Processing', 'Submit payroll for approval'),
  ('payroll.approve',       'Payroll Processing', 'Approve payroll runs'),
  ('payroll.rollback',      'Payroll Processing', 'Roll back a payroll run'),
  ('payroll.export_bank',   'Payroll Processing', 'Export bank payment schedule'),
  ('payroll.view_self',     'Payroll Processing', 'View own payslips (self-service)'),

  -- Pay Groups
  ('paygroups.view',        'Pay Groups',         'View pay groups'),
  ('paygroups.manage',      'Pay Groups',         'Create and modify pay groups'),

  -- Projects
  ('projects.view',         'Projects',           'View project list and details'),
  ('projects.manage',       'Projects',           'Create and edit projects'),

  -- Earnings & Deductions
  ('earnings.view',         'Earnings & Deductions', 'View earnings and deductions'),
  ('earnings.manage',       'Earnings & Deductions', 'Create and edit earnings and deductions'),

  -- Contracts
  ('contracts.view',        'Contracts',          'View employee contracts'),
  ('contracts.manage',      'Contracts',          'Create and manage contracts'),

  -- Reports
  ('reports.view',          'Reports',            'View payroll and HR reports'),
  ('finance.view_reports',  'Reports',            'View financial and statutory reports'),
  ('reports.export',        'Reports',            'Export reports to PDF/Excel'),

  -- EHS
  ('ehs.view_dashboard',    'EHS',                'View EHS dashboard'),
  ('ehs.manage_incidents',  'EHS',                'Create and manage incidents'),
  ('ehs.manage_hazards',    'EHS',                'Create and manage hazard assessments'),
  ('ehs.manage_training',   'EHS',                'Manage safety training records'),
  ('ehs.manage_compliance', 'EHS',                'Manage compliance and audits'),

  -- System Settings
  ('admin.manage_users',        'System Settings', 'Manage system users and invites'),
  ('admin.assign_roles',        'System Settings', 'Assign and revoke roles'),
  ('admin.activity_logs.view',  'System Settings', 'View audit and activity logs'),
  ('admin.manage_settings',     'System Settings', 'Manage organization settings'),

  -- User Management
  ('users.view',            'User Management',    'View system users'),
  ('users.invite',          'User Management',    'Send invitations to new users'),
  ('users.edit',            'User Management',    'Edit user profiles and status'),
  ('users.deactivate',      'User Management',    'Deactivate user accounts'),

  -- Attendance
  ('attendance.view',       'Attendance',         'View attendance records'),
  ('attendance.manage',     'Attendance',         'Record and edit attendance'),
  ('attendance.approve',    'Attendance',         'Approve attendance corrections')

ON CONFLICT (key) DO UPDATE SET
  category    = EXCLUDED.category,
  description = EXCLUDED.description;

-- 4. Grant SELF_USER minimal self-service permissions
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
VALUES
  ('SELF_USER', 'people.view_self',  '00000000-0000-0000-0000-000000000001'),
  ('SELF_USER', 'payroll.view_self', '00000000-0000-0000-0000-000000000001'),
  ('SELF_USER', 'attendance.view',   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (role_code, permission_key, org_id) DO NOTHING;
