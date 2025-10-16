-- ===============================================================
-- PAYRUN PRO MERGE CONFLICT RECONCILIATION WITH FALLBACK SAFETY
-- ===============================================================
-- Author: Nalungu Kevin Colin
-- Purpose: Safely unify conflicting migrations; roll back on error
-- ===============================================================

do $$
declare
  migration_failed boolean := false;
begin
  begin
    -- ⚙️ BEGIN SCHEMA UPDATE TRANSACTION -------------------------

    -- 🧩 Ensure payroll_configurations exists
    if not exists (select 1 from pg_tables where tablename='payroll_configurations') then
      create table payroll_configurations (
        id uuid primary key default gen_random_uuid(),
        organization_id uuid,
        use_strict_mode boolean default true,
        updated_at timestamptz default now()
      );
    end if;

    -- 🧱 Ensure paygroup_employees exists
    if not exists (select 1 from pg_tables where tablename='paygroup_employees') then
      create table paygroup_employees (
        id uuid primary key default gen_random_uuid(),
        pay_group_id uuid not null references pay_groups(id) on delete cascade,
        employee_id uuid not null references employees(id) on delete cascade,
        assigned_by uuid references auth.users(id),
        assigned_at timestamptz default now(),
        active boolean default true,
        notes text
      );
    end if;

    -- 🔐 Enable RLS (if not enabled)
    alter table paygroup_employees enable row level security;

    -- 🛡️ RLS policies (idempotent)
      if not exists (select 1 from pg_policies where policyname='view paygroup_employees') then
        create policy "view paygroup_employees"
        on paygroup_employees for select
        using (
          auth.uid() in (select user_id from user_roles where role in ('Super Admin','Organization Admin','Payroll Manager'))
          or assigned_by = auth.uid()
        );
      end if;
      if not exists (select 1 from pg_policies where policyname='insert paygroup_employees') then
        create policy "insert paygroup_employees"
        on paygroup_employees for insert
        with check (auth.uid() in (select user_id from user_roles where role in ('Super Admin','Organization Admin','Payroll Manager')));
      end if;
      if not exists (select 1 from pg_policies where policyname='update paygroup_employees') then
        create policy "update paygroup_employees"
        on paygroup_employees for update
        using (auth.uid() in (select user_id from user_roles where role in ('Super Admin','Organization Admin','Payroll Manager')));
      end if;
      if not exists (select 1 from pg_policies where policyname='delete paygroup_employees') then
        create policy "delete paygroup_employees"
        on paygroup_employees for delete
        using (auth.uid() in (select user_id from user_roles where role in ('Super Admin','Organization Admin','Payroll Manager')));
      end if;

    -- 🧩 Ensure employee ID fields exist + indexes
    alter table employees
      add column if not exists national_id text,
      add column if not exists tin text,
      add column if not exists social_security_number text,
      add column if not exists passport_number text;
    create index if not exists idx_employees_national_id on employees (national_id);
    create index if not exists idx_employees_tin on employees (tin);
    create index if not exists idx_employees_ssn on employees (social_security_number);

    -- ⚙️ Create or replace function for unique/smart assignment
    create or replace function enforce_unique_or_smart_paygroup_assignment()
    returns trigger as $fn$
    declare
      org_mode boolean;
      duplicate_count int;
      emp_org_id uuid;
    begin
      select e.organization_id into emp_org_id from employees e where e.id = new.employee_id;
      select use_strict_mode into org_mode from payroll_configurations where organization_id = emp_org_id limit 1;
      if org_mode is null then org_mode := true; end if;
      if (new.active = false) then return new; end if;

      select count(*) into duplicate_count
      from paygroup_employees pe
      join employees e on e.id = pe.employee_id
      where pe.active = true
        and (
          (e.national_id is not null and e.national_id = (select national_id from employees where id=new.employee_id)) or
          (e.tin is not null and e.tin = (select tin from employees where id=new.employee_id)) or
          (e.social_security_number is not null and e.social_security_number = (select social_security_number from employees where id=new.employee_id))
        )
        and pe.employee_id != new.employee_id;

      if duplicate_count > 0 then
        if org_mode = true then
          raise exception 'Strict Mode: Employee with same identification already active in another paygroup.';
        else
          update paygroup_employees
          set active=false
          where employee_id in (
            select id from employees where
              (national_id=(select national_id from employees where id=new.employee_id) and national_id is not null) or
              (tin=(select tin from employees where id=new.employee_id) and tin is not null) or
              (social_security_number=(select social_security_number from employees where id=new.employee_id) and social_security_number is not null)
          )
          and id != new.id;
        end if;
      end if;
      return new;
    end;
    $fn$ language plpgsql security definer;

    -- 🔁 Recreate trigger cleanly
    drop trigger if exists trg_enforce_unique_or_smart on paygroup_employees;
    create trigger trg_enforce_unique_or_smart
    before insert or update on paygroup_employees
    for each row execute function enforce_unique_or_smart_paygroup_assignment();

    -- 📈 Indexes for link table
    create index if not exists idx_pge_group on paygroup_employees (pay_group_id);
    create index if not exists idx_pge_employee on paygroup_employees (employee_id);

    -- ✅ COMMIT IF ALL OK
    commit;
    raise notice '✅ Migration applied successfully.';

  exception
    when others then
      migration_failed := true;
      rollback;
      raise notice '⚠️ Migration failed — rolled back to previous state.';
  end;

end $$;
-- ===============================================================
-- END SAFE MIGRATION BLOCK WITH AUTOMATIC ROLLBACK
-- ===============================================================
