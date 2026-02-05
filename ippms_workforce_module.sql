-- IPPMS Workforce Module - manual apply SQL
-- Schema: ippms (tables are also prefixed ippms_)

-- Create schema
create schema if not exists ippms;

-- Helper types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ippms_work_type') then
    create type ippms.ippms_work_type as enum ('DAILY_RATE','PIECE_RATE','LEAVE','HOLIDAY','ABSENT','OFF');
  end if;

  if not exists (select 1 from pg_type where typname = 'ippms_attendance_status') then
    create type ippms.ippms_attendance_status as enum ('PRESENT','ABSENT','OFF','LEAVE','UNPAID_LEAVE','SICK','PUBLIC_HOLIDAY');
  end if;

  if not exists (select 1 from pg_type where typname = 'ippms_recorded_source') then
    create type ippms.ippms_recorded_source as enum ('PROJECT_ADMIN','EMPLOYEE_SELF','UPLOAD','SYSTEM_AUTO');
  end if;

  if not exists (select 1 from pg_type where typname = 'ippms_piece_recorded_source') then
    create type ippms.ippms_piece_recorded_source as enum ('PROJECT_ADMIN','UPLOAD','SYSTEM_AUTO');
  end if;

  if not exists (select 1 from pg_type where typname = 'ippms_leave_status') then
    create type ippms.ippms_leave_status as enum ('PENDING','APPROVED','REJECTED','CANCELLED');
  end if;
end$$;

-- Helper function for updated_at
create or replace function ippms.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

-- Helper to detect privileged users
-- Ensure public.is_platform_admin(uuid) exists; if missing, create a stub that returns false.
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_platform_admin'
      and p.pronargs = 1
      and p.proargtypes[0] = 'uuid'::regtype
  ) then
    create or replace function public.is_platform_admin(_user_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $f$
      select false;
    $f$;
  end if;
end$$;

create or replace function ippms.is_privileged()
returns boolean
language sql
stable
as $$
  with jwt as (
    select coalesce(current_setting('request.jwt.claims', true)::json, '{}'::json) as c
  )
  select
    coalesce(public.is_platform_admin(auth.uid()), false)
    or public.has_permission(auth.uid(), 'payroll.prepare')
    or public.has_permission(auth.uid(), 'payroll.approve')
    or public.has_permission(auth.uid(), 'people.view')
    or public.has_permission(auth.uid(), 'people.edit')
    or (select (c->>'role') in ('platform_admin','org_admin','super_admin','admin') from jwt)
    or (select (c->>'app_role') in ('platform_admin','org_admin','super_admin','admin') from jwt)
    or auth.role() = 'service_role';
$$;

-- Helper to check if the caller manages a project
create or replace function ippms.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select
    ippms.is_privileged()
    or exists (
      select 1
      from public.employees e
      where e.user_id = auth.uid() and e.project_id = p_project_id
    );
$$;

-- Base tables (ordered to satisfy FK dependencies)
create table if not exists ippms.ippms_piece_work_catalogue (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  unit_name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_piece_catalogue_code unique (code)
);

create table if not exists ippms.ippms_shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer default 0,
  is_default boolean default false,
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ippms.ippms_employee_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  shift_id uuid not null references ippms.ippms_shifts(id) on delete cascade,
  start_date date not null,
  end_date date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_shift_assignment unique (employee_id, project_id, shift_id, start_date)
);

create table if not exists ippms.ippms_attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  attendance_date date not null,
  status ippms.ippms_attendance_status not null,
  shift_id uuid references ippms.ippms_shifts(id),
  hours_worked numeric(6,2),
  overtime_hours numeric(6,2),
  remarks text,
  daily_rate_snapshot numeric(12,2),
  recorded_by uuid references auth.users(id),
  recorded_source ippms.ippms_recorded_source default 'PROJECT_ADMIN',
  payrun_id uuid references public.pay_runs(id) on delete set null,
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ippms.ippms_piece_work_rates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  piece_id uuid not null references ippms.ippms_piece_work_catalogue(id) on delete cascade,
  rate numeric(12,2) not null,
  start_date date not null,
  end_date date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_piece_rate_window unique (employee_id, project_id, piece_id, start_date)
);

create table if not exists ippms.ippms_piece_work_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  work_date date not null,
  piece_id uuid not null references ippms.ippms_piece_work_catalogue(id) on delete restrict,
  quantity numeric(14,2) not null,
  rate_snapshot numeric(12,2),
  recorded_by uuid references auth.users(id),
  recorded_source ippms.ippms_piece_recorded_source default 'PROJECT_ADMIN',
  payrun_id uuid references public.pay_runs(id) on delete set null,
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ippms.ippms_work_days (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  work_date date not null,
  work_type ippms.ippms_work_type not null,
  attendance_id uuid references ippms.ippms_attendance_records(id),
  piece_entry_id uuid references ippms.ippms_piece_work_entries(id),
  payrun_id uuid references public.pay_runs(id) on delete set null,
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_work_day unique (employee_id, project_id, work_date)
);

create table if not exists ippms.ippms_leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  paid boolean default false,
  requires_approval boolean default true,
  max_days_per_year integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_leave_code unique (code)
);

create table if not exists ippms.ippms_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  leave_type_id uuid not null references ippms.ippms_leave_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  reason text,
  status ippms.ippms_leave_status default 'PENDING',
  approved_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint leave_date_range check (end_date >= start_date)
);

create table if not exists ippms.ippms_holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  holiday_date date not null,
  country text,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_holiday_per_project unique (project_id, holiday_date)
);

-- Indexes for performance
create index if not exists idx_ippms_work_days_project_date on ippms.ippms_work_days(project_id, work_date);
create index if not exists idx_ippms_work_days_payrun on ippms.ippms_work_days(payrun_id) where payrun_id is not null;
create index if not exists idx_ippms_attendance_project_date on ippms.ippms_attendance_records(project_id, attendance_date);
create index if not exists idx_ippms_attendance_payrun on ippms.ippms_attendance_records(payrun_id) where payrun_id is not null;
create index if not exists idx_ippms_piece_entries_project_date on ippms.ippms_piece_work_entries(project_id, work_date);
create index if not exists idx_ippms_piece_entries_payrun on ippms.ippms_piece_work_entries(payrun_id) where payrun_id is not null;
create index if not exists idx_ippms_leave_requests_emp on ippms.ippms_leave_requests(employee_id, start_date, end_date);
create index if not exists idx_ippms_holidays_date on ippms.ippms_holidays(holiday_date);
create index if not exists idx_ippms_employee_shifts_emp on ippms.ippms_employee_shifts(employee_id, project_id, start_date);

-- Triggers
do $$
begin
  perform 1 from pg_trigger where tgname = 'trg_work_days_updated_at';
  if not found then
    create trigger trg_work_days_updated_at before update on ippms.ippms_work_days
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_attendance_updated_at';
  if not found then
    create trigger trg_attendance_updated_at before update on ippms.ippms_attendance_records
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_piece_entries_updated_at';
  if not found then
    create trigger trg_piece_entries_updated_at before update on ippms.ippms_piece_work_entries
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_piece_rates_updated_at';
  if not found then
    create trigger trg_piece_rates_updated_at before update on ippms.ippms_piece_work_rates
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_leave_types_updated_at';
  if not found then
    create trigger trg_leave_types_updated_at before update on ippms.ippms_leave_types
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_leave_requests_updated_at';
  if not found then
    create trigger trg_leave_requests_updated_at before update on ippms.ippms_leave_requests
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_holidays_updated_at';
  if not found then
    create trigger trg_holidays_updated_at before update on ippms.ippms_holidays
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_shifts_updated_at';
  if not found then
    create trigger trg_shifts_updated_at before update on ippms.ippms_shifts
    for each row execute function ippms.tg_set_updated_at();
  end if;

  perform 1 from pg_trigger where tgname = 'trg_employee_shifts_updated_at';
  if not found then
    create trigger trg_employee_shifts_updated_at before update on ippms.ippms_employee_shifts
    for each row execute function ippms.tg_set_updated_at();
  end if;
end$$;

-- RLS
alter table ippms.ippms_work_days enable row level security;
alter table ippms.ippms_attendance_records enable row level security;
alter table ippms.ippms_piece_work_entries enable row level security;
alter table ippms.ippms_piece_work_rates enable row level security;
alter table ippms.ippms_piece_work_catalogue enable row level security;
alter table ippms.ippms_leave_types enable row level security;
alter table ippms.ippms_leave_requests enable row level security;
alter table ippms.ippms_holidays enable row level security;
alter table ippms.ippms_shifts enable row level security;
alter table ippms.ippms_employee_shifts enable row level security;

-- Policies (read: employee self, admin; write: project manager/admin)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_work_days' and policyname = 'ippms_work_days_select_self'
  ) then
    create policy ippms_work_days_select_self on ippms.ippms_work_days
      for select using (
        ippms.is_privileged()
        or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_work_days' and policyname = 'ippms_work_days_write_admin'
  ) then
    create policy ippms_work_days_write_admin on ippms.ippms_work_days
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_attendance_records' and policyname = 'ippms_attendance_select_self'
  ) then
    create policy ippms_attendance_select_self on ippms.ippms_attendance_records
      for select using (
        ippms.is_privileged()
        or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_attendance_records' and policyname = 'ippms_attendance_write_admin'
  ) then
    create policy ippms_attendance_write_admin on ippms.ippms_attendance_records
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_piece_work_entries' and policyname = 'ippms_piece_entries_select_self'
  ) then
    create policy ippms_piece_entries_select_self on ippms.ippms_piece_work_entries
      for select using (
        ippms.is_privileged()
        or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_piece_work_entries' and policyname = 'ippms_piece_entries_write_admin'
  ) then
    create policy ippms_piece_entries_write_admin on ippms.ippms_piece_work_entries
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_piece_work_rates' and policyname = 'ippms_piece_rates_read'
  ) then
    create policy ippms_piece_rates_read on ippms.ippms_piece_work_rates
      for select using (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_piece_work_rates' and policyname = 'ippms_piece_rates_write'
  ) then
    create policy ippms_piece_rates_write on ippms.ippms_piece_work_rates
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_piece_work_catalogue' and policyname = 'ippms_piece_catalogue_read'
  ) then
    create policy ippms_piece_catalogue_read on ippms.ippms_piece_work_catalogue
      for select using (true); -- catalogue is safe to read
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_piece_work_catalogue' and policyname = 'ippms_piece_catalogue_write'
  ) then
    create policy ippms_piece_catalogue_write on ippms.ippms_piece_work_catalogue
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_leave_types' and policyname = 'ippms_leave_types_read'
  ) then
    create policy ippms_leave_types_read on ippms.ippms_leave_types
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_leave_types' and policyname = 'ippms_leave_types_write'
  ) then
    create policy ippms_leave_types_write on ippms.ippms_leave_types
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_leave_requests' and policyname = 'ippms_leave_requests_select'
  ) then
    create policy ippms_leave_requests_select on ippms.ippms_leave_requests
      for select using (
        ippms.is_privileged()
        or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_leave_requests' and policyname = 'ippms_leave_requests_write'
  ) then
    create policy ippms_leave_requests_write on ippms.ippms_leave_requests
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_holidays' and policyname = 'ippms_holidays_read'
  ) then
    create policy ippms_holidays_read on ippms.ippms_holidays
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_holidays' and policyname = 'ippms_holidays_write'
  ) then
    create policy ippms_holidays_write on ippms.ippms_holidays
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_shifts' and policyname = 'ippms_shifts_read'
  ) then
    create policy ippms_shifts_read on ippms.ippms_shifts
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_shifts' and policyname = 'ippms_shifts_write'
  ) then
    create policy ippms_shifts_write on ippms.ippms_shifts
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_employee_shifts' and policyname = 'ippms_employee_shifts_read'
  ) then
    create policy ippms_employee_shifts_read on ippms.ippms_employee_shifts
      for select using (
        ippms.is_privileged()
        or exists (select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'ippms' and tablename = 'ippms_employee_shifts' and policyname = 'ippms_employee_shifts_write'
  ) then
    create policy ippms_employee_shifts_write on ippms.ippms_employee_shifts
      for all using (ippms.is_privileged() or auth.role() = 'service_role')
      with check (ippms.is_privileged() or auth.role() = 'service_role');
  end if;
end$$;

-- RPCs

-- Work day fetcher
create or replace function ippms.ippms_get_work_days(
  p_project_id uuid,
  p_start date,
  p_end date,
  p_employee_id uuid default null
)
returns table (
  id uuid,
  employee_id uuid,
  project_id uuid,
  work_date date,
  work_type ippms.ippms_work_type,
  attendance_status ippms.ippms_attendance_status,
  piece_id uuid,
  quantity numeric,
  rate_snapshot numeric,
  is_locked boolean,
  payrun_id uuid
) language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view work days';
  end if;

  return query
  select
    wd.id,
    wd.employee_id,
    wd.project_id,
    wd.work_date,
    wd.work_type,
    ar.status as attendance_status,
    pe.piece_id,
    pe.quantity,
    pe.rate_snapshot,
    wd.is_locked,
    wd.payrun_id
  from ippms.ippms_work_days wd
  left join ippms.ippms_attendance_records ar on ar.id = wd.attendance_id
  left join ippms.ippms_piece_work_entries pe on pe.id = wd.piece_entry_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and (p_employee_id is null or wd.employee_id = p_employee_id);
end;
$$;

-- Update or create work type with conflict handling
create or replace function ippms.ippms_update_work_type(
  p_employee_id uuid,
  p_project_id uuid,
  p_work_date date,
  p_work_type ippms.ippms_work_type
)
returns uuid language plpgsql
security definer
set search_path = public, ippms
as $$
declare
  v_id uuid;
  v_locked boolean;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to update work days';
  end if;

  select id, is_locked into v_id, v_locked
  from ippms.ippms_work_days
  where employee_id = p_employee_id and project_id = p_project_id and work_date = p_work_date;

  if v_locked then
    raise exception 'Work day is locked for payrun';
  end if;

  if v_id is null then
    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type)
    values (p_employee_id, p_project_id, p_work_date, p_work_type)
    returning id into v_id;
  else
    update ippms.ippms_work_days
    set work_type = p_work_type,
        attendance_id = case when p_work_type in ('DAILY_RATE','LEAVE','HOLIDAY') then attendance_id else null end,
        piece_entry_id = case when p_work_type = 'PIECE_RATE' then piece_entry_id else null end
    where id = v_id;
  end if;

  return v_id;
end;
$$;

-- Attendance fetch
create or replace function ippms.ippms_get_attendance(
  p_project_id uuid,
  p_start date,
  p_end date,
  p_employee_id uuid default null
)
returns setof ippms.ippms_attendance_records language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view attendance';
  end if;

  return query
  select *
  from ippms.ippms_attendance_records
  where project_id = p_project_id
    and attendance_date between p_start and p_end
    and (p_employee_id is null or employee_id = p_employee_id);
end;
$$;

-- Save attendance in bulk (upsert)
create or replace function ippms.ippms_save_attendance_bulk(
  p_project_id uuid,
  p_records jsonb
)
returns jsonb language plpgsql
security definer
set search_path = public, ippms
as $$
declare
  rec jsonb;
  v_id uuid;
  v_status ippms.ippms_attendance_status;
  v_emp uuid;
  v_date date;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to manage attendance';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_emp := (rec->>'employee_id')::uuid;
    v_date := (rec->>'attendance_date')::date;
    v_status := (rec->>'status')::ippms.ippms_attendance_status;

    -- Guard against piece work already present
    if exists (
      select 1 from ippms.ippms_work_days wd
      where wd.employee_id = v_emp and wd.project_id = p_project_id and wd.work_date = v_date and wd.work_type = 'PIECE_RATE'
    ) then
      raise exception 'Work day already recorded as PIECE_RATE for %, %', v_emp, v_date;
    end if;

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, shift_id,
      hours_worked, overtime_hours, remarks, daily_rate_snapshot,
      recorded_by, recorded_source
    ) values (
      v_emp, p_project_id, v_date, v_status,
      (rec->>'shift_id')::uuid,
      nullif(rec->>'hours_worked','')::numeric,
      nullif(rec->>'overtime_hours','')::numeric,
      rec->>'remarks',
      nullif(rec->>'daily_rate_snapshot','')::numeric,
      auth.uid(),
      coalesce((rec->>'recorded_source')::ippms.ippms_recorded_source, 'PROJECT_ADMIN')
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = excluded.status,
          shift_id = excluded.shift_id,
          hours_worked = excluded.hours_worked,
          overtime_hours = excluded.overtime_hours,
          remarks = excluded.remarks,
          daily_rate_snapshot = excluded.daily_rate_snapshot,
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into v_id;

    -- ensure work_day linkage
    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type, attendance_id)
    values (v_emp, p_project_id, v_date, case when v_status in ('LEAVE','UNPAID_LEAVE') then 'LEAVE' when v_status = 'PUBLIC_HOLIDAY' then 'HOLIDAY' else 'DAILY_RATE' end, v_id)
    on conflict (employee_id, project_id, work_date) do update
      set work_type = excluded.work_type,
          attendance_id = v_id,
          piece_entry_id = case when excluded.work_type = 'DAILY_RATE' then null else ippms.ippms_work_days.piece_entry_id end,
          updated_at = now();
  end loop;

  return jsonb_build_object('status','ok');
end;
$$;

-- Piece entries fetch
create or replace function ippms.ippms_get_piece_entries(
  p_project_id uuid,
  p_start date,
  p_end date,
  p_employee_id uuid default null
)
returns setof ippms.ippms_piece_work_entries language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view piece work';
  end if;

  return query
  select *
  from ippms.ippms_piece_work_entries
  where project_id = p_project_id
    and work_date between p_start and p_end
    and (p_employee_id is null or employee_id = p_employee_id);
end;
$$;

-- Save piece entries bulk
create or replace function ippms.ippms_save_piece_entries(
  p_project_id uuid,
  p_records jsonb
)
returns jsonb language plpgsql
security definer
set search_path = public, ippms
as $$
declare
  rec jsonb;
  v_emp uuid;
  v_date date;
  v_id uuid;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to manage piece work';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_emp := (rec->>'employee_id')::uuid;
    v_date := (rec->>'work_date')::date;

    if exists (
      select 1 from ippms.ippms_work_days wd
      where wd.employee_id = v_emp and wd.project_id = p_project_id and wd.work_date = v_date and wd.work_type in ('DAILY_RATE','LEAVE','HOLIDAY')
    ) then
      raise exception 'Work day already marked for daily/leave/holiday for %, %', v_emp, v_date;
    end if;

    insert into ippms.ippms_piece_work_entries(
      employee_id, project_id, work_date, piece_id, quantity, rate_snapshot,
      recorded_by, recorded_source
    ) values (
      v_emp, p_project_id, v_date,
      (rec->>'piece_id')::uuid,
      nullif(rec->>'quantity','')::numeric,
      nullif(rec->>'rate_snapshot','')::numeric,
      auth.uid(),
      coalesce((rec->>'recorded_source')::ippms.ippms_piece_recorded_source, 'PROJECT_ADMIN')
    )
    returning id into v_id;

    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type, piece_entry_id)
    values (v_emp, p_project_id, v_date, 'PIECE_RATE', v_id)
    on conflict (employee_id, project_id, work_date) do update
      set work_type = 'PIECE_RATE',
          piece_entry_id = v_id,
          attendance_id = null,
          updated_at = now();
  end loop;

  return jsonb_build_object('status','ok');
end;
$$;

-- Apply leave (creates leave request + attendance + work_days)
create or replace function ippms.ippms_apply_leave(
  p_employee_id uuid,
  p_project_id uuid,
  p_leave_type_id uuid,
  p_start date,
  p_end date,
  p_reason text default null
)
returns uuid language plpgsql
security definer
set search_path = public, ippms
as $$
declare
  v_leave_id uuid;
  v_paid boolean;
  v_dt date;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to apply leave';
  end if;

  select paid into v_paid from ippms.ippms_leave_types where id = p_leave_type_id;

  insert into ippms.ippms_leave_requests(
    employee_id, project_id, leave_type_id, start_date, end_date, reason, status, approved_by
  ) values (
    p_employee_id, p_project_id, p_leave_type_id, p_start, p_end, p_reason, 'APPROVED', auth.uid()
  )
  returning id into v_leave_id;

  v_dt := p_start;
  while v_dt <= p_end loop
    perform ippms.ippms_update_work_type(p_employee_id, p_project_id, v_dt, 'LEAVE');

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, recorded_by, recorded_source
    ) values (
      p_employee_id, p_project_id, v_dt,
      case when v_paid then 'LEAVE' else 'UNPAID_LEAVE' end,
      auth.uid(),
      'SYSTEM_AUTO'
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = excluded.status,
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into strict v_leave_id;

    update ippms.ippms_work_days
    set attendance_id = v_leave_id,
        work_type = 'LEAVE',
        piece_entry_id = null
    where employee_id = p_employee_id and project_id = p_project_id and work_date = v_dt;

    v_dt := v_dt + interval '1 day';
  end loop;

  return v_leave_id;
end;
$$;

-- Apply holiday across project employees
create or replace function ippms.ippms_apply_holiday(
  p_project_id uuid,
  p_holiday_date date,
  p_name text,
  p_country text default null
)
returns uuid language plpgsql
security definer
set search_path = public, ippms
as $$
declare
  v_holiday_id uuid;
  emp record;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to apply holiday';
  end if;

  insert into ippms.ippms_holidays(name, holiday_date, country, project_id)
  values (p_name, p_holiday_date, p_country, p_project_id)
  on conflict (project_id, holiday_date) do update
    set name = excluded.name,
        country = excluded.country,
        updated_at = now()
  returning id into v_holiday_id;

  for emp in
    select id from public.employees where project_id = p_project_id
  loop
    perform ippms.ippms_update_work_type(emp.id, p_project_id, p_holiday_date, 'HOLIDAY');

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, recorded_by, recorded_source
    ) values (
      emp.id, p_project_id, p_holiday_date, 'PUBLIC_HOLIDAY', auth.uid(), 'SYSTEM_AUTO'
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = 'PUBLIC_HOLIDAY',
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into v_holiday_id;

    update ippms.ippms_work_days
    set attendance_id = v_holiday_id,
        work_type = 'HOLIDAY',
        piece_entry_id = null
    where employee_id = emp.id and project_id = p_project_id and work_date = p_holiday_date;
  end loop;

  return v_holiday_id;
end;
$$;

-- Shifts fetch
create or replace function ippms.ippms_get_shifts(p_project_id uuid)
returns setof ippms.ippms_shifts language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view shifts';
  end if;
  return query select * from ippms.ippms_shifts where project_id = p_project_id or project_id is null order by is_default desc, name;
end;
$$;

-- Assign shift
create or replace function ippms.ippms_assign_shift(
  p_employee_id uuid,
  p_project_id uuid,
  p_shift_id uuid,
  p_start date,
  p_end date
)
returns uuid language plpgsql
security definer
set search_path = public, ippms
as $$
declare
  v_id uuid;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to assign shift';
  end if;

  insert into ippms.ippms_employee_shifts(employee_id, project_id, shift_id, start_date, end_date)
  values (p_employee_id, p_project_id, p_shift_id, p_start, p_end)
  on conflict (employee_id, project_id, shift_id, start_date) do update
    set end_date = excluded.end_date,
        active = true,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- Templates (lightweight stubs for CSV/Excel generators)
create or replace function ippms.ippms_generate_attendance_template(p_project_id uuid)
returns table(employee_id uuid, attendance_date date, status text, shift_id uuid, hours_worked numeric, overtime_hours numeric, remarks text) language sql stable as $$
  select e.id as employee_id, current_date as attendance_date, 'PRESENT'::text as status, null::uuid as shift_id, 8::numeric as hours_worked, 0::numeric as overtime_hours, null::text as remarks
  from public.employees e
  where e.project_id = p_project_id;
$$;

create or replace function ippms.ippms_import_attendance_template(p_project_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer
set search_path = public, ippms
as $$
begin
  perform ippms.ippms_save_attendance_bulk(p_project_id, p_payload);
  return jsonb_build_object('status','ok');
end;
$$;

create or replace function ippms.ippms_generate_piecework_template(p_project_id uuid)
returns table(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric) language sql stable as $$
  select e.id, current_date, null::uuid as piece_id, 0::numeric as quantity, null::numeric as rate_snapshot
  from public.employees e
  where e.project_id = p_project_id;
$$;

create or replace function ippms.ippms_import_piecework_template(p_project_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer
set search_path = public, ippms
as $$
begin
  perform ippms.ippms_save_piece_entries(p_project_id, p_payload);
  return jsonb_build_object('status','ok');
end;
$$;

-- Payrun helpers (daily lane)
create or replace function ippms.ippms_daily_payrun_rows(
  p_project_id uuid,
  p_start date,
  p_end date
)
returns table(employee_id uuid, work_date date, status ippms.ippms_attendance_status, daily_rate_snapshot numeric, work_day_id uuid, attendance_id uuid) language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to read payrun rows';
  end if;

  return query
  select wd.employee_id, wd.work_date, ar.status, ar.daily_rate_snapshot, wd.id, ar.id
  from ippms.ippms_work_days wd
  join ippms.ippms_attendance_records ar on ar.id = wd.attendance_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and wd.work_type in ('DAILY_RATE','LEAVE','HOLIDAY')
    and wd.payrun_id is null
    and ar.status in ('PRESENT','PUBLIC_HOLIDAY','LEAVE','UNPAID_LEAVE');
end;
$$;

create or replace function ippms.ippms_lock_daily_payrun(
  p_payrun_id uuid,
  p_work_day_ids uuid[]
)
returns void language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  update ippms.ippms_work_days
  set payrun_id = p_payrun_id, is_locked = true
  where id = any(p_work_day_ids);

  update ippms.ippms_attendance_records ar
  set payrun_id = p_payrun_id, is_locked = true
  where ar.id in (select attendance_id from ippms.ippms_work_days where id = any(p_work_day_ids));
end;
$$;

-- Payrun helpers (piece lane)
create or replace function ippms.ippms_piece_payrun_rows(
  p_project_id uuid,
  p_start date,
  p_end date
)
returns table(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric, piece_entry_id uuid, work_day_id uuid) language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to read piece payrun rows';
  end if;

  return query
  select wd.employee_id, wd.work_date, pe.piece_id, pe.quantity, pe.rate_snapshot, pe.id, wd.id
  from ippms.ippms_work_days wd
  join ippms.ippms_piece_work_entries pe on pe.id = wd.piece_entry_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and wd.work_type = 'PIECE_RATE'
    and wd.payrun_id is null;
end;
$$;

create or replace function ippms.ippms_lock_piece_payrun(
  p_payrun_id uuid,
  p_piece_entry_ids uuid[]
)
returns void language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  update ippms.ippms_piece_work_entries
  set payrun_id = p_payrun_id, is_locked = true
  where id = any(p_piece_entry_ids);

  update ippms.ippms_work_days wd
  set payrun_id = p_payrun_id, is_locked = true
  where wd.piece_entry_id = any(p_piece_entry_ids);
end;
$$;

-- Public wrappers to expose RPCs (PostgREST hits public schema)
-- Attendance
create or replace function public.ippms_get_attendance(
  p_project_id uuid,
  p_start date,
  p_end date,
  p_employee_id uuid default null
)
returns setof ippms.ippms_attendance_records
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return query select * from ippms.ippms_get_attendance(p_project_id, p_start, p_end, p_employee_id);
end;
$$;

create or replace function public.ippms_save_attendance_bulk(
  p_project_id uuid,
  p_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_save_attendance_bulk(p_project_id, p_records);
end;
$$;

-- Work days
create or replace function public.ippms_get_work_days(
  p_project_id uuid,
  p_start date,
  p_end date,
  p_employee_id uuid default null
)
returns table (
  id uuid,
  employee_id uuid,
  project_id uuid,
  work_date date,
  work_type ippms.ippms_work_type,
  attendance_status ippms.ippms_attendance_status,
  piece_id uuid,
  quantity numeric,
  rate_snapshot numeric,
  is_locked boolean,
  payrun_id uuid
)
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return query select * from ippms.ippms_get_work_days(p_project_id, p_start, p_end, p_employee_id);
end;
$$;

create or replace function public.ippms_update_work_type(
  p_employee_id uuid,
  p_project_id uuid,
  p_work_date date,
  p_work_type ippms.ippms_work_type
)
returns uuid
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_update_work_type(p_employee_id, p_project_id, p_work_date, p_work_type);
end;
$$;

-- Piece work
create or replace function public.ippms_get_piece_entries(
  p_project_id uuid,
  p_start date,
  p_end date,
  p_employee_id uuid default null
)
returns setof ippms.ippms_piece_work_entries
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return query select * from ippms.ippms_get_piece_entries(p_project_id, p_start, p_end, p_employee_id);
end;
$$;

create or replace function public.ippms_save_piece_entries(
  p_project_id uuid,
  p_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_save_piece_entries(p_project_id, p_records);
end;
$$;

-- Leave / holiday
create or replace function public.ippms_apply_leave(
  p_employee_id uuid,
  p_project_id uuid,
  p_leave_type_id uuid,
  p_start date,
  p_end date,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_apply_leave(p_employee_id, p_project_id, p_leave_type_id, p_start, p_end, p_reason);
end;
$$;

create or replace function public.ippms_apply_holiday(
  p_project_id uuid,
  p_holiday_date date,
  p_name text,
  p_country text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_apply_holiday(p_project_id, p_holiday_date, p_name, p_country);
end;
$$;

-- Shifts
create or replace function public.ippms_get_shifts(p_project_id uuid)
returns setof ippms.ippms_shifts
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return query select * from ippms.ippms_get_shifts(p_project_id);
end;
$$;

create or replace function public.ippms_assign_shift(
  p_employee_id uuid,
  p_project_id uuid,
  p_shift_id uuid,
  p_start date,
  p_end date
)
returns uuid
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_assign_shift(p_employee_id, p_project_id, p_shift_id, p_start, p_end);
end;
$$;

-- Templates
create or replace function public.ippms_generate_attendance_template(p_project_id uuid)
returns table(employee_id uuid, attendance_date date, status text, shift_id uuid, hours_worked numeric, overtime_hours numeric, remarks text)
language sql
stable
security definer
set search_path = public, ippms
as $$
  select * from ippms.ippms_generate_attendance_template(p_project_id);
$$;

create or replace function public.ippms_import_attendance_template(p_project_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_import_attendance_template(p_project_id, p_payload);
end;
$$;

create or replace function public.ippms_generate_piecework_template(p_project_id uuid)
returns table(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric)
language sql
stable
security definer
set search_path = public, ippms
as $$
  select * from ippms.ippms_generate_piecework_template(p_project_id);
$$;

create or replace function public.ippms_import_piecework_template(p_project_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return ippms.ippms_import_piecework_template(p_project_id, p_payload);
end;
$$;

-- Payrun helpers
create or replace function public.ippms_daily_payrun_rows(
  p_project_id uuid,
  p_start date,
  p_end date
)
returns table(employee_id uuid, work_date date, status ippms.ippms_attendance_status, daily_rate_snapshot numeric, work_day_id uuid, attendance_id uuid)
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return query select * from ippms.ippms_daily_payrun_rows(p_project_id, p_start, p_end);
end;
$$;

create or replace function public.ippms_lock_daily_payrun(
  p_payrun_id uuid,
  p_work_day_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  perform ippms.ippms_lock_daily_payrun(p_payrun_id, p_work_day_ids);
end;
$$;

create or replace function public.ippms_piece_payrun_rows(
  p_project_id uuid,
  p_start date,
  p_end date
)
returns table(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric, piece_entry_id uuid, work_day_id uuid)
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  return query select * from ippms.ippms_piece_payrun_rows(p_project_id, p_start, p_end);
end;
$$;

create or replace function public.ippms_lock_piece_payrun(
  p_payrun_id uuid,
  p_piece_entry_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, ippms
as $$
begin
  perform ippms.ippms_lock_piece_payrun(p_payrun_id, p_piece_entry_ids);
end;
$$;









