-- ==========================================================
-- Enforce OBAC RLS Policies
-- Migration: 20251219000700_enforce_rbac_rls.sql
-- ==========================================================

-- 1) Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "organizations_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "organizations_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "organizations_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations; CREATE POLICY "organizations_select_policy" ON public.organizations
FOR SELECT TO authenticated
USING (
    public.has_permission('organizations.view', 'ORGANIZATION', id)
);

-- 2) Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_select_policy" ON public.companies;
DROP POLICY IF EXISTS "companies_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "companies_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "companies_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "companies_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "companies_select_policy" ON public.companies; CREATE POLICY "companies_select_policy" ON public.companies
FOR SELECT TO authenticated
USING (
    public.has_permission('companies.view', 'COMPANY', id)
);

-- 3) Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "projects_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "projects_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "projects_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "projects_select_policy" ON public.projects; CREATE POLICY "projects_select_policy" ON public.projects
FOR SELECT TO authenticated
USING (
    public.has_permission('projects.view', 'PROJECT', id)
);

-- 4) Employees (People)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "employees_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "employees_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "employees_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "employees_select_policy" ON public.employees; CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
    public.has_permission('people.view', 'ORGANIZATION', organization_id) OR
    (company_id IS NOT NULL AND public.has_permission('people.view', 'COMPANY', company_id))
);

-- 5) Pay Runs
ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.pay_runs;
DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "pay_runs_select_policy" ON public.pay_runs; CREATE POLICY "pay_runs_select_policy" ON public.pay_runs
FOR SELECT TO authenticated
USING (
    public.has_permission('payroll.view', 'ORGANIZATION', organization_id)
);

-- 6) Sensitive Action Guards (Write Policies)

-- Employees Update
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "employees_update_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "employees_update_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "employees_update_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "employees_update_policy" ON public.employees; CREATE POLICY "employees_update_policy" ON public.employees
FOR UPDATE TO authenticated
USING (
    public.has_permission('people.edit', 'ORGANIZATION', organization_id)
)
WITH CHECK (
    public.has_permission('people.edit', 'ORGANIZATION', organization_id)
);

-- Payroll Submit
DROP POLICY IF EXISTS "pay_runs_update_policy" ON public.pay_runs;
DROP POLICY IF EXISTS "pay_runs_update_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "pay_runs_update_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "pay_runs_update_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "pay_runs_update_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "pay_runs_update_policy" ON public.pay_runs; CREATE POLICY "pay_runs_update_policy" ON public.pay_runs
FOR UPDATE TO authenticated
USING (
    public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)
)
WITH CHECK (
    public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)
);

-- Special Approval Policy
DROP POLICY IF EXISTS "pay_runs_approve_policy" ON public.pay_runs;
-- Note: Approval is typically an update to 'status'. 
-- We can enforce this via a trigger or a specific policy if needed.
-- For now, we'll use a general update policy that checks for the approve permission if status is being changed to approved.
-- However, standard SQL RLS doesn't easily check 'transitioned' values in 'USING'.
-- We'll enforce the 'approve' permission at the API/Database Function level as well.

-- 7) Immutable Audit Log Policy
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs; CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (true); -- Anyone can log

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs; CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT TO authenticated
USING (
    public.has_permission('admin.activity_logs.view', 'ORGANIZATION', organization_id) OR
    (auth.uid() = user_id)
);

-- Deny all updates/deletes to audit logs
DROP POLICY IF EXISTS "audit_logs_immutable" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_immutable" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "audit_logs_immutable" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "audit_logs_immutable" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "audit_logs_immutable" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "audit_logs_immutable" ON public.audit_logs; CREATE POLICY "audit_logs_immutable" ON public.audit_logs
FOR UPDATE OR DELETE TO authenticated
USING (false);
