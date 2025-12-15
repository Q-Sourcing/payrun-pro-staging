-- Create platform admin role enum if missing
do $$
begin
  if not exists (select 1 from pg_type where typname = 'platform_admin_role') then
    create type public.platform_admin_role as enum ('super_admin', 'support_admin', 'compliance', 'billing');
  end if;
end
$$;

-- platform_admins table
create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  email text not null unique,
  full_name text,
  role public.platform_admin_role not null default 'super_admin',
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_admins_auth_user_id_idx
  on public.platform_admins (auth_user_id) where auth_user_id is not null;

-- platform_admin_devices table
create table if not exists public.platform_admin_devices (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.platform_admins (id) on delete cascade,
  device_id text not null unique,
  device_name text,
  browser text,
  os text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_admin_devices_admin_id_idx on public.platform_admin_devices (admin_id);

-- Upsert Nalungu Kevin as platform super admin
insert into public.platform_admins (auth_user_id, email, full_name, role, allowed)
values (
  (select id from auth.users where email = 'nalungukevin@gmail.com'),
  'nalungukevin@gmail.com',
  'Nalungu Kevin',
  'super_admin',
  true
)
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  full_name = excluded.full_name,
  role = excluded.role,
  allowed = true,
  updated_at = now();



