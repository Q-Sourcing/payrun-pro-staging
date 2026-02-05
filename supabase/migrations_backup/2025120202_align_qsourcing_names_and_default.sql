-- Align naming to Q-Sourcing and set default company
do $$
declare
  org_id uuid;
  ug_company_id uuid;
begin
  -- Find existing organization (fallback to known id)
  select id into org_id
  from public.organizations
  where id = '00000000-0000-0000-0000-000000000001'
     or name in ('GWAZU','Q-Sourcing Servtec Group')
  limit 1;

  if org_id is null then
    -- Create if missing (unlikely in staging)
    insert into public.organizations (id, name, description, active)
    values ('00000000-0000-0000-0000-000000000001', 'Q-Sourcing Servtec Group', 'Default organization', true)
    on conflict (id) do nothing;
    org_id := '00000000-0000-0000-0000-000000000001';
  end if;

  -- Rename organization to Q-Sourcing Servtec Group
  update public.organizations
  set name = 'Q-Sourcing Servtec Group'
  where id = org_id;

  -- Rename company GWAZU -> Q-Sourcing Uganda
  update public.companies
  set name = 'Q-Sourcing Uganda'
  where organization_id = org_id
    and name = 'GWAZU';

  -- Ensure default_company_id points to Q-Sourcing Uganda
  select id into ug_company_id
  from public.companies
  where organization_id = org_id
    and name = 'Q-Sourcing Uganda'
  limit 1;

  if ug_company_id is not null then
    update public.organizations
    set default_company_id = ug_company_id
    where id = org_id;
  end if;
end $$;


