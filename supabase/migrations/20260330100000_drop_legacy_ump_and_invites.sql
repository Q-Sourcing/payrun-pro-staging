-- ============================================================================
-- Phase 6: Drop legacy user_management_profiles and user_invites tables
-- ============================================================================
-- All edge functions have been migrated to write directly to user_profiles
-- and user_management_invitations. These tables are now unused:
--   - user_management_profiles  (replaced by user_profiles)
--   - user_invites              (replaced by user_management_invitations)
--
-- Also drops the sync trigger that was bridging UMP → user_profiles,
-- since there's nothing writing to UMP anymore.
-- ============================================================================

-- ── 1. Drop the sync trigger (no longer needed) ────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_ump_status ON public.user_management_profiles;
DROP FUNCTION IF EXISTS public.sync_ump_status_to_user_profiles();

-- ── 2. Drop user_management_profiles ────────────────────────────────────────
-- Drop policies first (defensive)
DO $$ DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'user_management_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_management_profiles', pol.policyname);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.user_management_profiles CASCADE;

-- ── 3. Drop user_invites ────────────────────────────────────────────────────
DO $$ DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'user_invites' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_invites', pol.policyname);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.user_invites CASCADE;
