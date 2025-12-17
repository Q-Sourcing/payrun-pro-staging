-- Allow Org Admins to view profiles of users in their organization
-- This is necessary for seeing invited users in the User Management list

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies if any (safeguard)
-- We don't want to drop "Users can modify own profile" etc. so we use a specific name.

DROP POLICY IF EXISTS "Org Admins can view profiles in their organization" ON public.user_profiles;

CREATE POLICY "Org Admins can view profiles in their organization"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- User can see their own profile
    id = auth.uid() 
    OR
    -- Org Admins can see profiles that belong to their org
    (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
);
