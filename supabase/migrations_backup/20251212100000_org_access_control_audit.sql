-- ==========================================================
-- OBAC: Auditing triggers for access-control changes
-- ==========================================================
-- Logs into public.audit_logs (existing table used across system).
-- We log:
-- - org_users changes
-- - org_user_roles changes
-- - user_company_memberships changes
-- - org_licenses changes
-- - org_license_assignments changes
-- - access_grants changes
-- ==========================================================

-- Ensure audit_logs exists (it does in this repo); no-op if already created
-- We rely on columns: integration_name, action, user_id, resource, details, timestamp, result

create or replace function public.log_access_control_audit()
returns trigger
language plpgsql
security definer
as $$
declare
  actor text := coalesce(auth.jwt()->>'email', auth.uid()::text);
  org_id uuid := null;
  details jsonb;
  action text;
  resource text;
begin
  -- Best-effort derive org_id
  if tg_table_name = 'org_users' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'org_user_roles' then
    select ou.org_id into org_id
    from public.org_users ou
    where ou.id = coalesce(new.org_user_id, old.org_user_id)
    limit 1;
  elsif tg_table_name = 'org_licenses' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'org_license_assignments' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'access_grants' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'user_company_memberships' then
    select c.organization_id into org_id
    from public.companies c
    where c.id = coalesce(new.company_id, old.company_id)
    limit 1;
  end if;

  resource := tg_table_name;
  if tg_op = 'INSERT' then
    action := resource || '.create';
    details := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    action := resource || '.update';
    details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif tg_op = 'DELETE' then
    action := resource || '.delete';
    details := to_jsonb(old);
  end if;

  insert into public.audit_logs (
    integration_name,
    action,
    user_id,
    resource,
    details,
    timestamp,
    result
  )
  values (
    'access_control',
    action,
    actor,
    resource,
    jsonb_build_object(
      'org_id', org_id,
      'table', tg_table_name,
      'op', tg_op,
      'row', details
    ),
    now(),
    'success'
  );

  return coalesce(new, old);
end;
$$;

-- org_users
drop trigger if exists trg_audit_org_users on public.org_users;
create trigger trg_audit_org_users
after insert or update or delete on public.org_users
for each row execute function public.log_access_control_audit();

-- org_user_roles
drop trigger if exists trg_audit_org_user_roles on public.org_user_roles;
create trigger trg_audit_org_user_roles
after insert or delete on public.org_user_roles
for each row execute function public.log_access_control_audit();

-- user_company_memberships (existing table; may already exist in some environments)
do $$
begin
  if to_regclass('public.user_company_memberships') is not null then
    execute 'drop trigger if exists trg_audit_user_company_memberships on public.user_company_memberships';
    execute 'create trigger trg_audit_user_company_memberships after insert or update or delete on public.user_company_memberships for each row execute function public.log_access_control_audit()';
  end if;
end $$;

-- org_licenses
drop trigger if exists trg_audit_org_licenses on public.org_licenses;
create trigger trg_audit_org_licenses
after insert or update on public.org_licenses
for each row execute function public.log_access_control_audit();

-- org_license_assignments
drop trigger if exists trg_audit_org_license_assignments on public.org_license_assignments;
create trigger trg_audit_org_license_assignments
after insert or update or delete on public.org_license_assignments
for each row execute function public.log_access_control_audit();

-- access_grants
drop trigger if exists trg_audit_access_grants on public.access_grants;
create trigger trg_audit_access_grants
after insert or update or delete on public.access_grants
for each row execute function public.log_access_control_audit();






