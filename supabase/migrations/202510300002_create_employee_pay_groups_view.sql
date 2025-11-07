-- Repackaged migration: employee_pay_groups compatibility view
-- This is safe to run multiple times (create or replace)

create or replace view public.employee_pay_groups as
select
  peg.id,
  peg.pay_group_id,
  peg.employee_id,
  peg.assigned_on,
  peg.unassigned_on,
  peg.organization_id,
  e.id            as emp_id,
  e.first_name    as emp_first_name,
  e.middle_name   as emp_middle_name,
  e.last_name     as emp_last_name,
  e.email         as emp_email,
  e.pay_type      as emp_pay_type,
  e.pay_rate      as emp_pay_rate,
  e.currency      as emp_currency,
  e.country       as emp_country,
  e.employee_type as emp_employee_type
from public.paygroup_employees peg
left join public.employees e on e.id = peg.employee_id;

alter view public.employee_pay_groups set (security_invoker = true);
grant select on public.employee_pay_groups to anon, authenticated;


