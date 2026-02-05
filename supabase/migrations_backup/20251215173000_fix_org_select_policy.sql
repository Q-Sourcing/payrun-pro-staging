-- Drop the restrictive policy
DROP POLICY IF EXISTS "org_select_same_org_or_super_admin" ON organizations;

-- Re-create a more robust policy
CREATE POLICY "org_select_member_or_super_admin" ON organizations FOR SELECT TO authenticated USING (
  -- Super Admin bypass (via role claim or profile check)
  (auth.jwt()->>'role') = 'super_admin' 
  OR 
  -- Impersonation bypass (organization_id in JWT top level)
  id = (auth.jwt()->>'organization_id')::uuid
  OR
  -- Standard User check (organization_id in user_profiles)
  id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);
