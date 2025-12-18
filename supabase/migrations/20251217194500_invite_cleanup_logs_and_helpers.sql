-- ==========================================================
-- Invite Cleanup: audit logging + safe inventory helpers
-- ==========================================================

-- 1) Cleanup audit table
create table if not exists public.cleanup_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reason text not null default 'invite_cleanup',
  action text not null, -- planned | deleted | skipped | error
  email text,
  auth_user_id uuid,
  invite_id uuid,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_cleanup_logs_created_at on public.cleanup_logs(created_at);
create index if not exists idx_cleanup_logs_email on public.cleanup_logs(email);
create index if not exists idx_cleanup_logs_auth_user_id on public.cleanup_logs(auth_user_id);
create index if not exists idx_cleanup_logs_invite_id on public.cleanup_logs(invite_id);

alter table public.cleanup_logs enable row level security;

drop policy if exists cleanup_logs_service_role_all on public.cleanup_logs;
create policy cleanup_logs_service_role_all
on public.cleanup_logs
for all
to service_role
using (true)
with check (true);

drop policy if exists cleanup_logs_platform_admin_select on public.cleanup_logs;
create policy cleanup_logs_platform_admin_select
on public.cleanup_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.allowed = true
      and (pa.auth_user_id = auth.uid() or lower(pa.email) = lower(coalesce(auth.jwt()->>'email', '')))
  )
);

grant select, insert, update, delete on public.cleanup_logs to service_role;

-- 2) Helper: find any "protected" FK reference to auth.users
-- We only consider FK references outside the allowlist of tables that are safe to purge
-- as part of an invite cleanup (org mappings, profiles, etc).
create or replace function public.invite_cleanup_find_protected_fk_ref(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ref record;
  hit boolean;
  allow_tables text[] := array[
    'public.user_invites',
    'public.user_profiles',
    'public.profiles',
    'public.org_users',
    'public.org_user_roles',
    'public.user_roles',
    'public.user_company_memberships',
    'public.org_license_assignments',
    'public.access_grants',
    'public.notifications',
    'public.auth_events',
    'public.cleanup_logs'
  ];
begin
  if p_user_id is null then
    return null;
  end if;

  for ref in
    select
      kcu.table_schema,
      kcu.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'auth'
      and ccu.table_name = 'users'
  loop
    if (ref.table_schema || '.' || ref.table_name) = any(allow_tables) then
      continue;
    end if;

    execute format(
      'select exists(select 1 from %I.%I where %I = $1 limit 1)',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into hit using p_user_id;

    if hit then
      return jsonb_build_object(
        'schema', ref.table_schema,
        'table', ref.table_name,
        'column', ref.column_name
      );
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.invite_cleanup_find_protected_fk_ref(uuid) from public;
grant execute on function public.invite_cleanup_find_protected_fk_ref(uuid) to service_role;

-- 3) Helper: inventory pending invites with auth state and protection checks
create or replace function public.invite_cleanup_candidates(
  p_limit integer default 200,
  p_older_than_days integer default 30,
  p_tenant_id uuid default null,
  p_require_expired boolean default true,
  p_include_auth_only boolean default false
)
returns table (
  source text,
  invite_id uuid,
  email text,
  invite_status text,
  invite_created_at timestamptz,
  invite_expires_at timestamptz,
  auth_user_id uuid,
  auth_created_at timestamptz,
  invited_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  has_password boolean,
  protected_ref jsonb,
  eligible boolean
)
language sql
security definer
set search_path = public, auth
as $$
  with pending_invites as (
    select
      ui.id as invite_id,
      ui.email,
      ui.status::text as invite_status,
      ui.created_at as invite_created_at,
      ui.expires_at as invite_expires_at
    from public.user_invites ui
    where ui.status = 'pending'
      and (p_tenant_id is null or ui.tenant_id = p_tenant_id)
      and (p_older_than_days is null or ui.created_at < now() - make_interval(days => p_older_than_days))
      and (not p_require_expired or ui.expires_at < now())
    order by ui.created_at asc
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
  ),
  auth_only as (
    select
      null::uuid as invite_id,
      au.email,
      'pending'::text as invite_status,
      au.created_at as invite_created_at,
      null::timestamptz as invite_expires_at
    from auth.users au
    where p_include_auth_only = true
      and au.invited_at is not null
      and au.confirmed_at is null
      and au.last_sign_in_at is null
      and coalesce(nullif(au.encrypted_password, ''), '') = ''
      and (p_older_than_days is null or au.created_at < now() - make_interval(days => p_older_than_days))
      and (p_tenant_id is null or lower(au.raw_user_meta_data->>'organization_id') = lower(p_tenant_id::text))
      and not exists (
        select 1
        from public.user_invites ui
        where lower(ui.email) = lower(au.email)
          and ui.status in ('pending','accepted','expired','revoked')
      )
    order by au.created_at asc
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
  ),
  combined as (
    select 'user_invites'::text as source, * from pending_invites
    union all
    select 'auth_only'::text as source, * from auth_only
  ),
  joined as (
    select
      c.source,
      c.invite_id,
      c.email,
      c.invite_status,
      c.invite_created_at,
      c.invite_expires_at,
      au.id as auth_user_id,
      au.created_at as auth_created_at,
      au.invited_at,
      au.confirmed_at,
      au.last_sign_in_at,
      (coalesce(nullif(au.encrypted_password, ''), '') <> '') as has_password
    from combined c
    left join auth.users au
      on lower(au.email) = lower(c.email)
  )
  select
    j.source,
    j.invite_id,
    j.email,
    j.invite_status,
    j.invite_created_at,
    j.invite_expires_at,
    j.auth_user_id,
    j.auth_created_at,
    j.invited_at,
    j.confirmed_at,
    j.last_sign_in_at,
    j.has_password,
    ref.protected_ref,
    (
      j.invite_status = 'pending'
      and (
        (j.source = 'user_invites')
        or (j.source = 'auth_only' and p_include_auth_only = true)
      )
      and (j.auth_user_id is null or (
        j.invited_at is not null
        and j.confirmed_at is null
        and j.last_sign_in_at is null
        and j.has_password = false
      ))
      and ref.protected_ref is null
    ) as eligible
  from joined j
  left join lateral (
    select public.invite_cleanup_find_protected_fk_ref(j.auth_user_id) as protected_ref
  ) ref on true;
$$;

revoke all on function public.invite_cleanup_candidates(integer, integer, uuid, boolean, boolean) from public;
grant execute on function public.invite_cleanup_candidates(integer, integer, uuid, boolean, boolean) to service_role;
