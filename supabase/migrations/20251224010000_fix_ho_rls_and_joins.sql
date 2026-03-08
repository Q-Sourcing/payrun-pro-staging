-- Consolidation of RLS policies for Head Office tables
-- Standardizes role checks and fixes organization-level isolation

-- 1. Helper Function to get org_id from JWT (handles both 'org_id' and 'organization_id' keys if they differ)
CREATE OR REPLACE FUNCTION public.get_auth_org_id() 
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> 'org_id'),
    (auth.jwt() ->> 'organization_id')
  )::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Helper Function to check HO management role
CREATE OR REPLACE FUNCTION public.is_ho_manager() 
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() ->> 'role') IN (
    'Super Admin', 'Organization Admin', 'Payroll Manager',
    'super_admin', 'admin', 'manager', 'payroll_manager',
    'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'COMPANY_PAYROLL_ADMIN'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Update head_office_pay_group_members policies
ALTER TABLE public.head_office_pay_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON head_office_pay_group_members;

FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
  )
);

FOR ALL TO authenticated 
USING (
  public.is_ho_manager() AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
  )
)
WITH CHECK (
  public.is_ho_manager() AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = public.get_auth_org_id()
  )
);

-- 4. Fix Pay Group table policies to be consistent with get_auth_org_id()
-- Regular
FOR SELECT USING (organization_id = public.get_auth_org_id());
FOR ALL TO authenticated USING (organization_id = public.get_auth_org_id() AND public.is_ho_manager());

-- Interns
FOR SELECT USING (organization_id = public.get_auth_org_id());
FOR ALL TO authenticated USING (organization_id = public.get_auth_org_id() AND public.is_ho_manager());

-- Expatriates
FOR SELECT USING (organization_id = public.get_auth_org_id());
FOR ALL TO authenticated USING (organization_id = public.get_auth_org_id() AND public.is_ho_manager());
