-- Backfill organization_id on user_profiles rows that have it as NULL.
-- Joins through org_users (user_id → org_id) to find the correct organization.
-- This fixes the RLS visibility issue: the user_profiles SELECT policy allows
-- org members to see each other only when organization_id = current_org_id().
-- Users whose rows were created by the manage-users edge function without
-- organization_id were invisible in criteria builder dropdowns.

UPDATE public.user_profiles up
SET organization_id = ou.org_id
FROM public.org_users ou
WHERE up.id = ou.user_id
  AND up.organization_id IS NULL
  AND ou.status = 'active';
