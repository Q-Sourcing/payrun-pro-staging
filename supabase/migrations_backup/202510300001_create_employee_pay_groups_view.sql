-- Recreate compatibility view for employee_pay_groups -> paygroup_employees
-- Compatibility view used by the frontend while we migrate off legacy tables.
-- It exposes assignment rows and the employee columns needed by the UI
-- so queries like `select=employee:employees(*)` can be replaced by selecting
-- directly from this view.

create or replace view public.employee_pay_groups as
select
  peg.id,
  peg.pay_group_id,
  peg.employee_id,
  peg.assigned_on,
  peg.unassigned_on,
  peg.organization_id,
  e.id           as emp_id,
  e.first_name   as emp_first_name,
  e.middle_name  as emp_middle_name,
  e.last_name    as emp_last_name,
  e.email        as emp_email,
  e.pay_type     as emp_pay_type,
  e.pay_rate     as emp_pay_rate,
  e.currency     as emp_currency,
  e.country      as emp_country,
  e.employee_type as emp_employee_type
from public.paygroup_employees peg
left join public.employees e on e.id = peg.employee_id;

alter view public.employee_pay_groups set (security_invoker = true);
grant select on public.employee_pay_groups to anon, authenticated;

-- Compatibility view for employee_pay_groups
-- Purpose: allow code to query employee assignments via a unified name
-- This maps the legacy table paygroup_employees to a view shaped like employee_pay_groups
-- Note: Postgres cannot attach foreign keys to views; embedding relations may
-- still require explicit joins in queries. The view exposes the expected columns.

create or replace view public.employee_pay_groups as
select 
  peg.pay_group_id,
  peg.employee_id,
  null::timestamptz as unassigned_on
from public.paygroup_employees peg;

-- Optional: grant read to authenticated/anon roles
grant select on public.employee_pay_groups to anon, authenticated;


