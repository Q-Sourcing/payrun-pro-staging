-- Add users.reset_password permission and assign to ADMIN role by default

INSERT INTO public.rbac_permissions (key, category, description)
VALUES ('users.reset_password', 'User Management', 'Reset passwords for user accounts')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_code, permission_key, org_id)
VALUES ('ADMIN', 'users.reset_password', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
