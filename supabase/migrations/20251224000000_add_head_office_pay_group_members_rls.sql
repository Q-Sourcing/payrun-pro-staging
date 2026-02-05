-- Add RLS policies for head_office_pay_group_members table
-- This allows authenticated users to manage pay group members for their organization

-- Enable RLS on the table
ALTER TABLE head_office_pay_group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON head_office_pay_group_members;
DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON head_office_pay_group_members;

-- SELECT policy: Users can view pay group members for their organization
DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can view pay group members for their organization" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can view pay group members for their organization"
ON head_office_pay_group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> 'organization_id')::uuid
  )
);

-- INSERT policy: Users can insert pay group members for their organization
DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can insert pay group members for their organization" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can insert pay group members for their organization"
ON head_office_pay_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> 'organization_id')::uuid
  )
);

-- UPDATE policy: Users can update pay group members for their organization
DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can update pay group members for their organization" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can update pay group members for their organization"
ON head_office_pay_group_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> 'organization_id')::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> 'organization_id')::uuid
  )
);

-- DELETE policy: Users can delete pay group members for their organization
DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON public.head_office_pay_group_members; DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON public.head_office_pay_groups_regular; DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON public.head_office_pay_groups_interns; DROP POLICY IF EXISTS "Users can delete pay group members for their organization" ON public.head_office_pay_groups_expatriates; CREATE POLICY "Users can delete pay group members for their organization"
ON head_office_pay_group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = head_office_pay_group_members.employee_id
    AND e.organization_id = (auth.jwt() ->> 'organization_id')::uuid
  )
);
