drop policy "Admins can view all audit logs" on "public"."audit_logs";

drop policy "Admins can view all role assignments" on "public"."role_assignments";

drop policy "Admins can view all sessions" on "public"."user_sessions";

-- Skipping drop of is_platform_admin() — still used by policies.

drop view if exists "public"."employee_master";

drop view if exists "public"."employee_pay_groups";

drop view if exists "public"."master_payrolls";

drop view if exists "public"."paygroup_employees_legacy";

drop view if exists "public"."paygroup_employees_view";

drop view if exists "public"."paygroup_summary_view";

set check_function_bodies = off;

create or replace view "public"."employee_master" as  SELECT id,
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) AS organization_id,
    first_name,
    last_name,
        CASE
            WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN ((first_name || ' '::text) || last_name)
            WHEN (first_name IS NOT NULL) THEN first_name
            WHEN (last_name IS NOT NULL) THEN last_name
            ELSE ''::text
        END AS name,
    email,
    personal_email,
    phone,
    work_phone,
    employee_number,
    employee_type,
    employee_category,
    engagement_type,
    employment_status,
    designation,
    work_location,
    nationality,
    citizenship,
    date_joined,
    country,
    currency,
    company_id,
    company_unit_id,
    pay_group_id,
    status,
    user_id,
    created_at,
    updated_at
   FROM public.employees;


create or replace view "public"."employee_pay_groups" as  SELECT peg.id,
    peg.pay_group_id,
    peg.employee_id,
    peg.assigned_at AS assigned_on,
    peg.removed_at AS unassigned_on,
    pg.organization_id,
    e.id AS emp_id,
    e.first_name AS emp_first_name,
    e.middle_name AS emp_middle_name,
    e.last_name AS emp_last_name,
    e.email AS emp_email,
    e.pay_type AS emp_pay_type,
    e.pay_rate AS emp_pay_rate,
    e.currency AS emp_currency,
    e.country AS emp_country,
    e.employee_type AS emp_employee_type
   FROM ((public.paygroup_employees peg
     LEFT JOIN public.employees e ON ((e.id = peg.employee_id)))
     LEFT JOIN public.pay_groups pg ON ((pg.id = peg.pay_group_id)));


create or replace view "public"."master_payrolls" as  SELECT id,
    organization_id,
    pay_group_id,
    pay_period_start,
    pay_period_end,
    total_gross,
    total_net,
    payroll_status,
    0 AS total_employees
   FROM public.pay_runs pr;


create or replace view "public"."paygroup_employees_legacy" as  SELECT id,
    employee_id,
    active,
    assigned_at,
    removed_at,
    assigned_by,
    notes,
    pay_group_master_id AS paygroup_id,
    pay_group_master_id,
    pay_group_id
   FROM public.paygroup_employees pe;


create or replace view "public"."paygroup_employees_view" as  SELECT peg.id AS assignment_id,
    peg.employee_id,
    peg.pay_group_id,
    COALESCE(peg.active, true) AS active,
    pg.name AS pay_group_name,
    COALESCE(lower((pg.type)::text), 'local'::text) AS pay_group_type,
    pg.category,
    pg.employee_type,
    pg.pay_frequency,
    pg.pay_type
   FROM (public.paygroup_employees peg
     JOIN public.pay_groups pg ON ((pg.id = peg.pay_group_id)));


create or replace view "public"."paygroup_summary_view" as  SELECT pg.id,
    NULL::text AS paygroup_id,
    pg.name,
    COALESCE((pg.type)::text, 'regular'::text) AS type,
    pg.country,
    NULL::text AS currency,
    'active'::text AS status,
    COALESCE(employee_counts.employee_count, (0)::bigint) AS employee_count,
    pg.created_at,
    pg.updated_at,
    pg.pay_frequency,
    pg.default_tax_percentage,
    NULL::numeric AS exchange_rate_to_local,
    NULL::numeric AS default_daily_rate,
    NULL::text AS tax_country,
    pg.description AS notes
   FROM (public.pay_groups pg
     LEFT JOIN ( SELECT paygroup_employees.pay_group_id,
            count(*) AS employee_count
           FROM public.paygroup_employees
          WHERE (paygroup_employees.active = true)
          GROUP BY paygroup_employees.pay_group_id) employee_counts ON ((employee_counts.pay_group_id = pg.id)))
UNION ALL
 SELECT epg.id,
    epg.paygroup_id,
    epg.name,
    'expatriate'::text AS type,
    epg.country,
    epg.currency,
    'active'::text AS status,
    COALESCE(employee_counts.employee_count, (0)::bigint) AS employee_count,
    epg.created_at,
    epg.updated_at,
    NULL::text AS pay_frequency,
    NULL::numeric AS default_tax_percentage,
    epg.exchange_rate_to_local,
    NULL::numeric AS default_daily_rate,
    epg.tax_country,
    epg.notes
   FROM (public.expatriate_pay_groups epg
     LEFT JOIN ( SELECT paygroup_employees.pay_group_id,
            count(*) AS employee_count
           FROM public.paygroup_employees
          WHERE (paygroup_employees.active = true)
          GROUP BY paygroup_employees.pay_group_id) employee_counts ON ((employee_counts.pay_group_id = epg.id)));


CREATE OR REPLACE FUNCTION public.user_belongs_to_org(target_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.organization_id = target_org_id
  );
$function$
;


  create policy "Admins can view all audit logs"
  on "public"."audit_logs"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::text[]))))));



  create policy "Admins can view all role assignments"
  on "public"."role_assignments"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::text[]))))));



  create policy "Admins can view all sessions"
  on "public"."user_sessions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::text[]))))));



