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

DROP POLICY IF EXISTS "head_office_pay_group_members_select" ON public.head_office_pay_group_members;
DROP POLICY IF EXISTS "head_office_pay_group_members_all" ON public.head_office_pay_group_members;

-- SELECT: Platform admins or users with people.view in the org
CREATE POLICY "head_office_pay_group_members_select"
ON public.head_office_pay_group_members FOR SELECT TO authenticated
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
CREATE POLICY "head_office_pay_group_members_all"
ON public.head_office_pay_group_members FOR ALL TO authenticated
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
DROP POLICY IF EXISTS "pay_groups_select" ON public.pay_groups;
DROP POLICY IF EXISTS "pay_groups_all" ON public.pay_groups;
CREATE POLICY "pay_groups_select" ON public.pay_groups
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

CREATE POLICY "pay_groups_all" ON public.pay_groups
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));

-- Interns
DROP POLICY IF EXISTS "intern_pay_groups_select" ON public.intern_pay_groups;
DROP POLICY IF EXISTS "intern_pay_groups_all" ON public.intern_pay_groups;
CREATE POLICY "intern_pay_groups_select" ON public.intern_pay_groups
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

CREATE POLICY "intern_pay_groups_all" ON public.intern_pay_groups
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));

-- Expatriates
DROP POLICY IF EXISTS "expatriate_pay_groups_select" ON public.expatriate_pay_groups;
DROP POLICY IF EXISTS "expatriate_pay_groups_all" ON public.expatriate_pay_groups;
CREATE POLICY "expatriate_pay_groups_select" ON public.expatriate_pay_groups
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

CREATE POLICY "expatriate_pay_groups_all" ON public.expatriate_pay_groups
FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));
