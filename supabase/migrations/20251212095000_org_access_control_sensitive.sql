-- ==========================================================
-- OBAC: Sensitive action enforcement (grants + helper functions)
-- ==========================================================
-- This migration defines:
-- - A canonical set of permission/action keys
-- - Helper functions to evaluate “can do X” based on:
--   * company membership AND
--   * org roles AND
--   * explicit access_grants for sensitive actions
--
-- Note:
-- - These functions can be used by RLS policies and/or Edge Functions.
-- - We avoid removing existing tenant policies here to prevent regressions.
-- ==========================================================

-- Permission keys (action scope_key) used across the app:
-- - approve_payroll
-- - export_bank_schedule
-- - pii.read
--
-- Module scope_key examples:
-- - module.payroll
-- - module.manpower
-- - module.ippms
--
-- Project type scope_key examples:
-- - project_type.manpower
-- - project_type.expatriate
-- - project_type.ippms

create or replace function public.has_any_org_role(p_org_id uuid, p_role_keys text[])
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
        and r.key = any(p_role_keys)
    );
$$;

-- Canonical check for sensitive actions:
-- - membership in company (if company-scoped)
-- - baseline org role
-- - explicit allow grant (deny overrides allow via has_grant)
create or replace function public.can_perform_action(
  p_org_id uuid,
  p_company_id uuid,
  p_action text
)
returns boolean
language plpgsql
stable
as $$
declare
  allowed_roles text[];
  needs_company boolean := p_company_id is not null;
begin
  if public.is_platform_admin() then
    return true;
  end if;

  if needs_company and not public.has_company_membership(p_company_id) then
    return false;
  end if;

  -- baseline RBAC: which org roles may ever perform the action
  if p_action = 'approve_payroll' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_PAYROLL_ADMIN','ORG_FINANCE_APPROVER','ORG_HEAD_OFFICE_PAYROLL'];
  elsif p_action = 'export_bank_schedule' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_PAYROLL_ADMIN','ORG_FINANCE_APPROVER','ORG_HEAD_OFFICE_PAYROLL'];
  elsif p_action = 'pii.read' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_HR','ORG_PAYROLL_ADMIN','ORG_HEAD_OFFICE_PAYROLL'];
  else
    -- Non-sensitive / unknown action: require explicit grant to be safe
    allowed_roles := array['ORG_OWNER','ORG_ADMIN'];
  end if;

  if not public.has_any_org_role(p_org_id, allowed_roles) then
    return false;
  end if;

  -- Sensitive actions require explicit allow (deny overrides allow)
  return public.has_grant(p_org_id, 'action', p_action, p_company_id);
end;
$$;


