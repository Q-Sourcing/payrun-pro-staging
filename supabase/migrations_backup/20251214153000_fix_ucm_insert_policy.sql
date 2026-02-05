-- Fix RLS for user_company_memberships INSERTs
-- Org Admins need to insert memberships for NEW users, sometimes before the user has full context.

-- 1. Drop the restrictive managed policy if it exists (or we can just add a new specific insert policy)
-- The existing policy "ucm_manage_org_admin" might be too complex for simple inserts or fail on new users.

-- Allow Organization Admins to INSERT if they belong to the organization of the company being assigned
-- We check: 
-- 1. Caller is authenticated
-- 2. Caller is org_admin or super_admin
-- 3. The company they are assigning belongs to their organization (JWT claim)

CREATE POLICY "Allow Org Admins to Insert Memberships"
ON public.user_company_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt()->>'role') IN ('super_admin', 'organization_admin', 'org_admin', 'org_owner')
  AND 
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = user_company_memberships.company_id
    AND c.organization_id = (auth.jwt()->>'organization_id')::uuid
  )
);

-- Ensure the existing policy doesn't conflict or we rely on this new one being additive (Supabase policies are OR by default for permissive, but if one fails...)
-- Actually policies are OR. If ANY policy allows it, it proceeds. 
-- So adding this specific INSERT policy should unblock the 403.
