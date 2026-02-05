-- Hardened RLS policies for Head Office components
-- Aligns with the OBAC architecture (Platform Bypass + Scope Checks)

-- 1. Helper Function to get org_id from JWT (Checking app_metadata first)
CREATE OR REPLACE FUNCTION public.get_auth_org_id() 
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'organization_id'),
    (auth.jwt() ->> 'organization_id'),
    (auth.jwt() ->> 'org_id')
  )::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Standardize head_office_pay_group_members RLS
ALTER TABLE public.head_office_pay_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View HO Membership" ON public.head_office_pay_group_members;
DROP POLICY IF EXISTS "Manage HO Membership" ON public.head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON public.head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON public.head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON public.head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON public.head_office_pay_group_members;

-- SELECT: Platform admins or users with people.view in the org
DROP POLICY IF EXISTS "ho_membership_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_membership_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_membership_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_membership_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_membership_select_policy" ON public.head_office_pay_group_members; CREATE POLICY "ho_membership_select_policy" ON public.head_office_pay_group_members
FOR SELECT TO authenticated
USING (
  public.is_platform_admin() OR
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
    AND (
      public.has_permission('people.view', 'ORGANIZATION', e.organization_id) OR
      public.has_permission('payroll.prepare', 'ORGANIZATION', e.organization_id)
    )
  )
);

-- ALL (Manage): Platform admins or users with payroll.prepare in the org
DROP POLICY IF EXISTS "ho_membership_manage_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_membership_manage_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_membership_manage_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_membership_manage_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_membership_manage_policy" ON public.head_office_pay_group_members; CREATE POLICY "ho_membership_manage_policy" ON public.head_office_pay_group_members
FOR ALL TO authenticated
USING (
  public.is_platform_admin() OR
  (
    public.has_permission('payroll.prepare', 'ORGANIZATION', public.get_auth_org_id()) AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = head_office_pay_group_members.employee_id
      AND e.organization_id = public.get_auth_org_id()
    )
  )
)
WITH CHECK (
  public.is_platform_admin() OR
  (
    public.has_permission('payroll.prepare', 'ORGANIZATION', public.get_auth_org_id()) AND
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = head_office_pay_group_members.employee_id
      AND e.organization_id = public.get_auth_org_id()
    )
  )
);

-- 3. Fix HO Pay Group Tables to use standard bypass/permission pattern
-- Regular
DROP POLICY IF EXISTS "View Regular HO Paygroups" ON public.head_office_pay_groups_regular;
DROP POLICY IF EXISTS "Manage Regular HO Paygroups" ON public.head_office_pay_groups_regular;
DROP POLICY IF EXISTS "ho_pg_regular_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_pg_regular_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_pg_regular_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_pg_regular_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_pg_regular_select_policy" ON public.head_office_pay_groups_regular; CREATE POLICY "ho_pg_regular_select_policy" ON public.head_office_pay_groups_regular
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "ho_pg_regular_manage_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_pg_regular_manage_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_pg_regular_manage_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_pg_regular_manage_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_pg_regular_manage_policy" ON public.head_office_pay_groups_regular; CREATE POLICY "ho_pg_regular_manage_policy" ON public.head_office_pay_groups_regular
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));

-- Interns
DROP POLICY IF EXISTS "View Intern HO Paygroups" ON public.head_office_pay_groups_interns;
DROP POLICY IF EXISTS "Manage Intern HO Paygroups" ON public.head_office_pay_groups_interns;
DROP POLICY IF EXISTS "ho_pg_interns_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_pg_interns_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_pg_interns_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_pg_interns_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_pg_interns_select_policy" ON public.head_office_pay_groups_interns; CREATE POLICY "ho_pg_interns_select_policy" ON public.head_office_pay_groups_interns
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "ho_pg_interns_manage_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_pg_interns_manage_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_pg_interns_manage_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_pg_interns_manage_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_pg_interns_manage_policy" ON public.head_office_pay_groups_interns; CREATE POLICY "ho_pg_interns_manage_policy" ON public.head_office_pay_groups_interns
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));

-- Expatriates
DROP POLICY IF EXISTS "View Expatriate HO Paygroups" ON public.head_office_pay_groups_expatriates;
DROP POLICY IF EXISTS "Manage Expatriate HO Paygroups" ON public.head_office_pay_groups_expatriates;
DROP POLICY IF EXISTS "ho_pg_expatriates_select_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_pg_expatriates_select_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_pg_expatriates_select_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_pg_expatriates_select_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_pg_expatriates_select_policy" ON public.head_office_pay_groups_expatriates; CREATE POLICY "ho_pg_expatriates_select_policy" ON public.head_office_pay_groups_expatriates
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "ho_pg_expatriates_manage_policy" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "ho_pg_expatriates_manage_policy" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "ho_pg_expatriates_manage_policy" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "ho_pg_expatriates_manage_policy" ON public.head_office_pay_groups_expatriates; DROP POLICY IF EXISTS "ho_pg_expatriates_manage_policy" ON public.head_office_pay_groups_expatriates; CREATE POLICY "ho_pg_expatriates_manage_policy" ON public.head_office_pay_groups_expatriates
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));
