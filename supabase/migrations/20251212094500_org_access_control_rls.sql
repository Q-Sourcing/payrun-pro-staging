-- ==========================================================
-- Organisation-Based Access Control (OBAC): RLS policies
-- ==========================================================
-- Enforces:
-- - Org isolation
-- - Company membership (via existing user_company_memberships)
-- - Org roles for admin operations (ORG_OWNER / ORG_ADMIN)
-- - Platform admin bypass (public.is_platform_admin())
-- ==========================================================

-- Helper: org-admin baseline (owner/admin)
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_platform_admin()
    or public.has_org_role(p_org_id, 'ORG_OWNER')
    or public.has_org_role(p_org_id, 'ORG_ADMIN');
$$;

-- ----------------------------
-- org_users
-- ----------------------------
alter table public.org_users enable row level security;

drop policy if exists org_users_select_own on public.org_users;
create policy org_users_select_own
on public.org_users
for select
to authenticated
using (
  public.is_platform_admin()
  or user_id = auth.uid()
  or public.is_org_admin(org_id)
);

drop policy if exists org_users_insert_admin on public.org_users;
create policy org_users_insert_admin
on public.org_users
for insert
to authenticated
with check (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
);

drop policy if exists org_users_update_admin on public.org_users;
create policy org_users_update_admin
on public.org_users
for update
to authenticated
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
)
with check (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
);

drop policy if exists org_users_delete_admin on public.org_users;
create policy org_users_delete_admin
on public.org_users
for delete
to authenticated
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
);

-- ----------------------------
-- org_roles
-- ----------------------------
alter table public.org_roles enable row level security;

drop policy if exists org_roles_select on public.org_roles;
create policy org_roles_select
on public.org_roles
for select
to authenticated
using (
  public.is_platform_admin()
  or public.current_org_id() = org_id
);

drop policy if exists org_roles_manage_admin on public.org_roles;
create policy org_roles_manage_admin
on public.org_roles
for all
to authenticated
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
)
with check (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
);

-- ----------------------------
-- org_user_roles
-- ----------------------------
alter table public.org_user_roles enable row level security;

drop policy if exists org_user_roles_select on public.org_user_roles;
create policy org_user_roles_select
on public.org_user_roles
for select
to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1
    from public.org_users ou
    where ou.id = org_user_roles.org_user_id
      and (ou.user_id = auth.uid() or public.is_org_admin(ou.org_id))
  )
);

drop policy if exists org_user_roles_manage_admin on public.org_user_roles;
create policy org_user_roles_manage_admin
on public.org_user_roles
for insert
to authenticated
with check (
  public.is_platform_admin()
  or exists (
    select 1
    from public.org_users ou
    where ou.id = org_user_roles.org_user_id
      and public.is_org_admin(ou.org_id)
  )
);

drop policy if exists org_user_roles_delete_admin on public.org_user_roles;
create policy org_user_roles_delete_admin
on public.org_user_roles
for delete
to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1
    from public.org_users ou
    where ou.id = org_user_roles.org_user_id
      and public.is_org_admin(ou.org_id)
  )
);

-- ----------------------------
-- org_licenses
-- ----------------------------
alter table public.org_licenses enable row level security;

drop policy if exists org_licenses_select on public.org_licenses;
create policy org_licenses_select
on public.org_licenses
for select
to authenticated
using (
  public.is_platform_admin()
  or public.current_org_id() = org_id
);

drop policy if exists org_licenses_manage_platform_admin on public.org_licenses;
create policy org_licenses_manage_platform_admin
on public.org_licenses
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ----------------------------
-- org_license_assignments
-- ----------------------------
alter table public.org_license_assignments enable row level security;

drop policy if exists org_license_assignments_select on public.org_license_assignments;
create policy org_license_assignments_select
on public.org_license_assignments
for select
to authenticated
using (
  public.is_platform_admin()
  or user_id = auth.uid()
  or public.is_org_admin(org_id)
);

drop policy if exists org_license_assignments_manage_admin on public.org_license_assignments;
create policy org_license_assignments_manage_admin
on public.org_license_assignments
for all
to authenticated
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
)
with check (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
);

-- ----------------------------
-- access_grants
-- ----------------------------
alter table public.access_grants enable row level security;

drop policy if exists access_grants_select on public.access_grants;
create policy access_grants_select
on public.access_grants
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
  or user_id = auth.uid()
  or (role_id is not null and exists (
    select 1
    from public.org_users ou
    join public.org_user_roles our on our.org_user_id = ou.id
    where ou.user_id = auth.uid()
      and ou.org_id = access_grants.org_id
      and our.role_id = access_grants.role_id
  ))
);

drop policy if exists access_grants_manage_admin on public.access_grants;
create policy access_grants_manage_admin
on public.access_grants
for all
to authenticated
using (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
)
with check (
  public.is_platform_admin()
  or public.is_org_admin(org_id)
);


