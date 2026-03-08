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


-- SELECT: Platform admins or users with people.view in the org
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
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));

-- Interns
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));

-- Expatriates
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR organization_id = public.get_auth_org_id());

FOR ALL TO authenticated
USING (public.is_platform_admin() OR (organization_id = public.get_auth_org_id() AND public.has_permission('payroll.prepare', 'ORGANIZATION', organization_id)));
