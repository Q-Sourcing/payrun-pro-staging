
-- =============================================================
-- STEP 1: Clean non-system roles (keep PLATFORM_*)
-- =============================================================
DELETE FROM public.rbac_role_permissions
WHERE role_code NOT IN ('PLATFORM_SUPER_ADMIN', 'PLATFORM_AUDITOR');

DELETE FROM public.rbac_assignments
WHERE role_code NOT IN ('PLATFORM_SUPER_ADMIN', 'PLATFORM_AUDITOR');

DELETE FROM public.rbac_roles
WHERE code NOT IN ('PLATFORM_SUPER_ADMIN', 'PLATFORM_AUDITOR');

-- =============================================================
-- STEP 2: Rebuild permissions catalog (28 permissions)
-- =============================================================
DELETE FROM public.rbac_permissions;

INSERT INTO public.rbac_permissions (key, category, description) VALUES
('users.view',       'User Management',       'View user list and profiles'),
('users.create',     'User Management',       'Invite and create new users'),
('users.update',     'User Management',       'Edit user details and status'),
('users.delete',     'User Management',       'Remove users from the organisation'),
('roles.view',       'Roles & Permissions',   'View roles and permission assignments'),
('roles.manage',     'Roles & Permissions',   'Create, edit and delete roles'),
('roles.assign',     'Roles & Permissions',   'Assign roles to users'),
('employees.view',   'Employees',             'View employee records'),
('employees.create', 'Employees',             'Add new employee records'),
('employees.update', 'Employees',             'Edit employee records'),
('employees.delete', 'Employees',             'Delete employee records'),
('paygroups.view',   'Pay Groups',            'View pay groups and members'),
('paygroups.manage', 'Pay Groups',            'Create and edit pay groups'),
('paygroups.assign', 'Pay Groups',            'Assign employees to pay groups'),
('earnings.view',    'Earnings & Deductions', 'View earnings and deduction components'),
('earnings.manage',  'Earnings & Deductions', 'Create and edit earnings/deduction items'),
('payroll.view',     'Payroll Processing',    'View payroll runs and summaries'),
('payroll.run',      'Payroll Processing',    'Initiate and process payroll runs'),
('payroll.approve',  'Payroll Processing',    'Approve or reject payroll runs'),
('payroll.export',   'Payroll Processing',    'Export bank schedules and payroll data'),
('contracts.view',   'Contracts',             'View contract templates and employee contracts'),
('contracts.manage', 'Contracts',             'Create and manage contract templates'),
('reports.view',     'Reports',               'View system and payroll reports'),
('reports.generate', 'Reports',               'Generate new reports'),
('reports.export',   'Reports',               'Export reports to PDF/Excel'),
('settings.view',    'System Settings',       'View system configuration'),
('settings.manage',  'System Settings',       'Edit system settings and configuration'),
('attendance.view',  'Attendance',            'View attendance records and summaries');

-- =============================================================
-- STEP 3: Insert 7 business roles (org_id = default org)
-- =============================================================
INSERT INTO public.rbac_roles (code, name, description, tier, org_id) VALUES
('ADMIN',   'Admin',                  'Full access to all modules and settings',               'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
('HR',      'HR',                     'Manages employees, contracts, and HR settings',          'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
('KAE',     'Key Accounts Executive', 'Manages client accounts and payroll visibility',         'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
('CRM',     'CRM',                    'Customer relationship and client data access',            'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
('GM',      'General Manager',        'Broad oversight with approval authority',                'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
('FINANCE', 'Finance',                'Full payroll, reports, and financial exports access',    'ORGANIZATION', '00000000-0000-0000-0000-000000000001'),
('STAFF',   'Staff',                  'Basic self-service access to own payslips and profile', 'ORGANIZATION', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- =============================================================
-- STEP 4: Default permission assignments
-- =============================================================

-- ADMIN: all 28 permissions
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
SELECT 'ADMIN', key, '00000000-0000-0000-0000-000000000001' FROM public.rbac_permissions
ON CONFLICT DO NOTHING;

-- HR
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
('HR','users.view','00000000-0000-0000-0000-000000000001'),
('HR','users.create','00000000-0000-0000-0000-000000000001'),
('HR','users.update','00000000-0000-0000-0000-000000000001'),
('HR','employees.view','00000000-0000-0000-0000-000000000001'),
('HR','employees.create','00000000-0000-0000-0000-000000000001'),
('HR','employees.update','00000000-0000-0000-0000-000000000001'),
('HR','employees.delete','00000000-0000-0000-0000-000000000001'),
('HR','paygroups.view','00000000-0000-0000-0000-000000000001'),
('HR','paygroups.assign','00000000-0000-0000-0000-000000000001'),
('HR','earnings.view','00000000-0000-0000-0000-000000000001'),
('HR','contracts.view','00000000-0000-0000-0000-000000000001'),
('HR','contracts.manage','00000000-0000-0000-0000-000000000001'),
('HR','payroll.view','00000000-0000-0000-0000-000000000001'),
('HR','reports.view','00000000-0000-0000-0000-000000000001'),
('HR','attendance.view','00000000-0000-0000-0000-000000000001'),
('HR','settings.view','00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- KAE
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
('KAE','employees.view','00000000-0000-0000-0000-000000000001'),
('KAE','paygroups.view','00000000-0000-0000-0000-000000000001'),
('KAE','payroll.view','00000000-0000-0000-0000-000000000001'),
('KAE','reports.view','00000000-0000-0000-0000-000000000001'),
('KAE','reports.generate','00000000-0000-0000-0000-000000000001'),
('KAE','reports.export','00000000-0000-0000-0000-000000000001'),
('KAE','attendance.view','00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- CRM
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
('CRM','employees.view','00000000-0000-0000-0000-000000000001'),
('CRM','reports.view','00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- GM
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
('GM','users.view','00000000-0000-0000-0000-000000000001'),
('GM','employees.view','00000000-0000-0000-0000-000000000001'),
('GM','paygroups.view','00000000-0000-0000-0000-000000000001'),
('GM','earnings.view','00000000-0000-0000-0000-000000000001'),
('GM','payroll.view','00000000-0000-0000-0000-000000000001'),
('GM','payroll.approve','00000000-0000-0000-0000-000000000001'),
('GM','contracts.view','00000000-0000-0000-0000-000000000001'),
('GM','reports.view','00000000-0000-0000-0000-000000000001'),
('GM','reports.generate','00000000-0000-0000-0000-000000000001'),
('GM','reports.export','00000000-0000-0000-0000-000000000001'),
('GM','attendance.view','00000000-0000-0000-0000-000000000001'),
('GM','settings.view','00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- FINANCE
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
('FINANCE','employees.view','00000000-0000-0000-0000-000000000001'),
('FINANCE','paygroups.view','00000000-0000-0000-0000-000000000001'),
('FINANCE','earnings.view','00000000-0000-0000-0000-000000000001'),
('FINANCE','earnings.manage','00000000-0000-0000-0000-000000000001'),
('FINANCE','payroll.view','00000000-0000-0000-0000-000000000001'),
('FINANCE','payroll.run','00000000-0000-0000-0000-000000000001'),
('FINANCE','payroll.approve','00000000-0000-0000-0000-000000000001'),
('FINANCE','payroll.export','00000000-0000-0000-0000-000000000001'),
('FINANCE','reports.view','00000000-0000-0000-0000-000000000001'),
('FINANCE','reports.generate','00000000-0000-0000-0000-000000000001'),
('FINANCE','reports.export','00000000-0000-0000-0000-000000000001'),
('FINANCE','attendance.view','00000000-0000-0000-0000-000000000001'),
('FINANCE','settings.view','00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- STAFF
INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id) VALUES
('STAFF','payroll.view','00000000-0000-0000-0000-000000000001'),
('STAFF','reports.view','00000000-0000-0000-0000-000000000001'),
('STAFF','attendance.view','00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
