-- Create user_company_memberships table to scope users to specific companies
create table if not exists public.user_company_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text,
  created_at timestamptz default now(),
  unique (user_id, company_id)
);

create index if not exists idx_ucm_user on public.user_company_memberships(user_id);
create index if not exists idx_ucm_company on public.user_company_memberships(company_id);

alter table public.user_company_memberships enable row level security;

-- Users can read their own memberships
drop policy if exists "ucm_select_own" on public.user_company_memberships;
create policy "ucm_select_own"
on public.user_company_memberships
for select
to authenticated
using (user_id = auth.uid());

-- Org admins can manage memberships within their org via company relation
drop policy if exists "ucm_manage_org_admin" on public.user_company_memberships;
create policy "ucm_manage_org_admin"
on public.user_company_memberships
for all
to authenticated
using (
  (auth.jwt()->>'role') in ('super_admin','organization_admin')
  and exists (
    select 1 from public.companies c
    where c.id = user_company_memberships.company_id
      and c.organization_id = (auth.jwt()->>'organization_id')::uuid
  )
)
with check (
  (auth.jwt()->>'role') in ('super_admin','organization_admin')
  and exists (
    select 1 from public.companies c
    where c.id = user_company_memberships.company_id
      and c.organization_id = (auth.jwt()->>'organization_id')::uuid
  )
);


