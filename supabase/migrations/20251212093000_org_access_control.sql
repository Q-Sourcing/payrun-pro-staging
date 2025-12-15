-- ==========================================================
-- Organisation-Based Access Control (OBAC) + Licensing
-- ==========================================================
-- Purpose:
-- - Implement org-based RBAC with multi-role users
-- - Support multi-company membership within an org
-- - Add scoped allow/deny grants for sensitive actions/modules/projects
-- - Provide helper functions for RLS enforcement
--
-- Notes:
-- - This migration EXTENDS the existing schema (organizations/companies/user_company_memberships).
-- - It does NOT rename or drop existing tables (to avoid breaking tenant app logic).
-- - Platform admins bypass checks via public.platform_admins (created separately).
-- ==========================================================

-- ----------------------------
-- 1) Core access-control tables
-- ----------------------------

create table if not exists public.org_users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (org_id, user_id)
);

create index if not exists idx_org_users_org on public.org_users(org_id);
create index if not exists idx_org_users_user on public.org_users(user_id);

create table if not exists public.org_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  system_defined boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, key)
);

create index if not exists idx_org_roles_org on public.org_roles(org_id);

create table if not exists public.org_user_roles (
  id uuid primary key default gen_random_uuid(),
  org_user_id uuid not null references public.org_users(id) on delete cascade,
  role_id uuid not null references public.org_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (org_user_id, role_id)
);

create index if not exists idx_org_user_roles_org_user on public.org_user_roles(org_user_id);
create index if not exists idx_org_user_roles_role on public.org_user_roles(role_id);

-- ----------------------------
-- 2) Licensing
-- ----------------------------

create table if not exists public.org_licenses (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  seat_limit integer not null default 0 check (seat_limit >= 0),
  features jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_license_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat_type text not null default 'default',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (org_id, user_id)
);

create index if not exists idx_org_license_assignments_org on public.org_license_assignments(org_id);
create index if not exists idx_org_license_assignments_user on public.org_license_assignments(user_id);

-- ----------------------------
-- 3) Scoped grants (ALLOW/DENY)
-- ----------------------------
-- Hybrid RBAC + grants:
-- - RBAC defines baseline access via org roles
-- - access_grants override: deny > allow
-- - grants can be scoped to org/company/module/project_type/action

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role_id uuid references public.org_roles(id) on delete cascade,
  scope_type text not null check (scope_type in ('org', 'company', 'module', 'project_type', 'action')),
  scope_key text not null,
  effect text not null check (effect in ('allow', 'deny')),
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_access_grants_org on public.access_grants(org_id);
create index if not exists idx_access_grants_user on public.access_grants(org_id, user_id);
create index if not exists idx_access_grants_company on public.access_grants(org_id, company_id);
create index if not exists idx_access_grants_scope on public.access_grants(scope_type, scope_key);

-- ----------------------------
-- 4) Seed system-defined roles per org
-- ----------------------------
-- System-defined org role keys (as requested):
-- ORG_OWNER
-- ORG_ADMIN
-- ORG_HR
-- ORG_PAYROLL_ADMIN
-- ORG_FINANCE_APPROVER
-- ORG_PROJECT_MANAGER
-- ORG_HEAD_OFFICE_PAYROLL
-- ORG_VIEWER

insert into public.org_roles (org_id, key, name, description, system_defined)
select
  o.id as org_id,
  r.key,
  r.name,
  r.description,
  true
from public.organizations o
cross join (values
  ('ORG_OWNER', 'Organisation Owner', 'Full control of organisation settings and access.'),
  ('ORG_ADMIN', 'Organisation Admin', 'Administer users, roles, companies and licenses within the organisation.'),
  ('ORG_HR', 'HR', 'Access to HR modules, with optional restrictions via access_grants.'),
  ('ORG_PAYROLL_ADMIN', 'Payroll Admin', 'Manage payroll operations; sensitive actions still require explicit grants.'),
  ('ORG_FINANCE_APPROVER', 'Finance Approver', 'Approve financial/payroll outputs; sensitive actions require explicit grants.'),
  ('ORG_PROJECT_MANAGER', 'Project Manager', 'Manage Manpower, Expatriate, IPPMS projects within scoped access.'),
  ('ORG_HEAD_OFFICE_PAYROLL', 'Head Office Payroll', 'Secure payroll operations for head office only (grant-gated).'),
  ('ORG_VIEWER', 'Viewer', 'Read-only access to allowed modules.')
) as r(key, name, description)
on conflict (org_id, key) do nothing;

-- Ensure org_users exist for existing tenant members (best-effort)
-- - If public.user_profiles exists and has organization_id, backfill org_users
do $$
begin
  if to_regclass('public.user_profiles') is not null then
    insert into public.org_users (org_id, user_id, status, created_at)
    select distinct up.organization_id, up.id, 'active', now()
    from public.user_profiles up
    where up.organization_id is not null
    on conflict (org_id, user_id) do nothing;
  end if;
end
$$;

-- ----------------------------
-- 5) Helper functions used by RLS
-- ----------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.allowed = true
      and (
        pa.auth_user_id = auth.uid()
        or lower(pa.email) = lower(coalesce(auth.jwt()->>'email', ''))
      )
  );
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    (
      select ou.org_id
      from public.org_users ou
      where ou.user_id = auth.uid()
        and ou.status = 'active'
      order by ou.created_at desc
      limit 1
    ),
    (
      select up.organization_id
      from public.user_profiles up
      where up.id = auth.uid()
      limit 1
    )
  );
$$;

create or replace function public.has_org_role(p_org_id uuid, p_role_key text)
returns boolean
language sql
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.org_users ou
      join public.org_user_roles our on our.org_user_id = ou.id
      join public.org_roles r on r.id = our.role_id
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.status = 'active'
        and r.key = p_role_key
    );
$$;

create or replace function public.has_company_membership(p_company_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_company_memberships ucm
      where ucm.user_id = auth.uid()
        and ucm.company_id = p_company_id
    );
$$;

-- deny overrides allow
create or replace function public.has_grant(
  p_org_id uuid,
  p_scope_type text,
  p_scope_key text,
  p_company_id uuid default null
)
returns boolean
language sql
stable
as $$
  select
    public.is_platform_admin()
    or (
      not exists (
        select 1
        from public.access_grants g
        where g.org_id = p_org_id
          and g.effect = 'deny'
          and g.scope_type = p_scope_type
          and g.scope_key = p_scope_key
          and (g.company_id is null or g.company_id = p_company_id)
          and (
            g.user_id = auth.uid()
            or (
              g.role_id is not null and exists (
                select 1
                from public.org_users ou
                join public.org_user_roles our on our.org_user_id = ou.id
                where ou.org_id = p_org_id
                  and ou.user_id = auth.uid()
                  and ou.status = 'active'
                  and our.role_id = g.role_id
              )
            )
          )
      )
      and exists (
        select 1
        from public.access_grants g
        where g.org_id = p_org_id
          and g.effect = 'allow'
          and g.scope_type = p_scope_type
          and g.scope_key = p_scope_key
          and (g.company_id is null or g.company_id = p_company_id)
          and (
            g.user_id = auth.uid()
            or (
              g.role_id is not null and exists (
                select 1
                from public.org_users ou
                join public.org_user_roles our on our.org_user_id = ou.id
                where ou.org_id = p_org_id
                  and ou.user_id = auth.uid()
                  and ou.status = 'active'
                  and our.role_id = g.role_id
              )
            )
          )
      )
    );
$$;

-- ----------------------------
-- 6) Enable RLS on new tables (policies added in a follow-up section/migration)
-- ----------------------------

alter table public.org_users enable row level security;
alter table public.org_roles enable row level security;
alter table public.org_user_roles enable row level security;
alter table public.org_licenses enable row level security;
alter table public.org_license_assignments enable row level security;
alter table public.access_grants enable row level security;

-- ==========================================================
-- End of schema additions. RLS policies and audit triggers
-- are added in subsequent steps (next todos).
-- ==========================================================


