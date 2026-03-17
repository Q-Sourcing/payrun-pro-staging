-- Ensure payroll benefits are explicitly scoped to one pay run + employee.
create table if not exists public.payroll_benefits (
  id uuid primary key default gen_random_uuid(),
  payrun_id uuid not null,
  employee_id uuid not null,
  benefit_id uuid not null,
  benefit_name text not null,
  cost numeric not null default 0,
  cost_type text not null default 'fixed' check (cost_type in ('fixed', 'percentage')),
  entry_type text not null default 'benefit' check (entry_type in ('benefit', 'deduction')),
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_benefits_payrun_id_fkey
    foreign key (payrun_id) references public.pay_runs(id) on delete cascade,
  constraint payroll_benefits_employee_id_fkey
    foreign key (employee_id) references public.employees(id) on delete cascade,
  constraint payroll_benefits_benefit_id_fkey
    foreign key (benefit_id) references public.benefits(id) on delete cascade,
  constraint payroll_benefits_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  constraint payroll_benefits_unique_per_run_employee_benefit
    unique (payrun_id, employee_id, benefit_id)
);

create index if not exists idx_payroll_benefits_payrun_id
  on public.payroll_benefits(payrun_id);

create index if not exists idx_payroll_benefits_employee_id
  on public.payroll_benefits(employee_id);

create index if not exists idx_payroll_benefits_payrun_employee
  on public.payroll_benefits(payrun_id, employee_id);

drop trigger if exists update_payroll_benefits_updated_at on public.payroll_benefits;
create trigger update_payroll_benefits_updated_at
before update on public.payroll_benefits
for each row
execute function public.update_updated_at_column();

alter table public.payroll_benefits enable row level security;

drop policy if exists "Employees can view own payroll benefits by run" on public.payroll_benefits;
create policy "Employees can view own payroll benefits by run"
  on public.payroll_benefits
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = payroll_benefits.employee_id
        and e.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.pay_items pi
      where pi.pay_run_id = payroll_benefits.payrun_id
        and pi.employee_id = payroll_benefits.employee_id
    )
  );

drop policy if exists "HR can manage payroll benefits for run employees" on public.payroll_benefits;
create policy "HR can manage payroll benefits for run employees"
  on public.payroll_benefits
  for all
  to authenticated
  using (
    (
      public.check_is_org_admin(auth.uid())
      or exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role in ('hr_business_partner', 'organization_admin', 'payroll_manager', 'super_admin')
      )
    )
    and exists (
      select 1
      from public.pay_items pi
      where pi.pay_run_id = payroll_benefits.payrun_id
        and pi.employee_id = payroll_benefits.employee_id
    )
  )
  with check (
    (
      public.check_is_org_admin(auth.uid())
      or exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role in ('hr_business_partner', 'organization_admin', 'payroll_manager', 'super_admin')
      )
    )
    and exists (
      select 1
      from public.pay_items pi
      where pi.pay_run_id = payroll_benefits.payrun_id
        and pi.employee_id = payroll_benefits.employee_id
    )
  );
