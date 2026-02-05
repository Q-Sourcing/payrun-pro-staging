-- Create a master index for all pay-group types (safe; additive)
create table if not exists public.pay_group_master (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('regular','expatriate','contractor','intern')),
  source_table text not null,         -- e.g. 'pay_groups', 'expatriate_pay_groups'
  source_id uuid not null,            -- UUID from the source table
  code text unique,                   -- optional readable code like EXPG-U847 (nullable, unique when present)
  name text not null,
  country text,
  currency text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (type, source_table, source_id)
);

-- Seed master with existing REGULAR (monthly) groups from pay_groups
insert into public.pay_group_master (type, source_table, source_id, code, name, country, currency, active)
select
  'regular'::text as type,
  'pay_groups'::text as source_table,
  pg.id as source_id,
  null::text        as code,          -- keep null; monthly groups don't use fancy codes
  pg.name, pg.country, null::text, true
from public.pay_groups pg
on conflict (type, source_table, source_id) do nothing;

-- Seed master with existing EXPATRIATE groups from expatriate_pay_groups
-- Use the *UUID id* as source_id and store the readable paygroup_id (EXPG-...) into code
insert into public.pay_group_master (type, source_table, source_id, code, name, country, currency, active)
select
  'expatriate'::text,
  'expatriate_pay_groups'::text,
  epg.id,
  epg.paygroup_id,     -- e.g. EXPG-U847
  epg.name, epg.country, epg.currency, true
from public.expatriate_pay_groups epg
on conflict (type, source_table, source_id) do nothing;

-- Add a *new* FK column on pay_runs that points to the master index (non-breaking)
alter table public.pay_runs
  add column if not exists pay_group_master_id uuid;

-- Add payroll_type column if it doesn't exist
alter table public.pay_runs
  add column if not exists payroll_type text check (payroll_type in ('regular','expatriate','contractor','intern'));

-- Backfill pay_runs.pay_group_master_id for existing rows based on legacy linkage
-- For regular pay runs, link via pay_groups
update public.pay_runs pr
set pay_group_master_id = pgm.id
from public.pay_group_master pgm
where pgm.type = 'regular' 
  and pgm.source_table = 'pay_groups' 
  and pgm.source_id = pr.pay_group_id
  and pr.pay_group_master_id is null;

-- For expatriate pay runs, try to link via UUID first, then via code
update public.pay_runs pr
set pay_group_master_id = pgm.id
from public.pay_group_master pgm
where pgm.type = 'expatriate' 
  and pgm.source_table = 'expatriate_pay_groups'
  and (
    pgm.source_id = pr.pay_group_id  -- if pay_group_id contains UUID
    or pgm.code = pr.pay_group_id::text  -- if pay_group_id contains EXPG-... code
  )
  and pr.pay_group_master_id is null;

-- Add foreign key constraint
alter table public.pay_runs
  add constraint pay_runs_pay_group_master_id_fkey
  foreign key (pay_group_master_id)
  references public.pay_group_master(id);

-- Create indexes for performance
create index if not exists idx_pay_group_master_type_active on public.pay_group_master(type, active);
create index if not exists idx_pay_runs_master on public.pay_runs(pay_group_master_id);
create index if not exists idx_pay_runs_payroll_type on public.pay_runs(payroll_type);

-- Enable RLS on the new table
alter table public.pay_group_master enable row level security;

-- Create RLS policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'pay_group_master') then
    create policy pgm_select on public.pay_group_master for select using (true);
  end if;
end $$;
