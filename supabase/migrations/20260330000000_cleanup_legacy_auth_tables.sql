-- ============================================================================
-- Phase 5: Clean up legacy auth tables
-- ============================================================================
-- This migration:
--   1. Adds a `status` column to `user_profiles` (the canonical profile table)
--   2. Back-fills status from `user_management_profiles` where possible
--   3. Creates a sync trigger so changes to `user_management_profiles.status`
--      propagate to `user_profiles.status` (edge functions still write to UMP)
--   4. Drops the legacy tables from the old role system that are NEVER
--      referenced in either app code or edge functions:
--        - public.users
--        - public.role_assignments
--        - public.user_sessions
--   5. Drops the legacy `profiles` table (superseded by user_profiles;
--      no app or edge function references)
--
-- NOTE: `user_management_profiles`, `user_invites` are kept because edge
-- functions (invite-org-user, manage-users, invite-user, cleanup-invited-users)
-- still write to them. They can be consolidated in a future migration once
-- those edge functions are updated.
-- ============================================================================

-- ── 1. Add status + phone + department to user_profiles ─────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department text;

COMMENT ON COLUMN public.user_profiles.status IS 'Account status: active, inactive, invited';

-- ── 2. Back-fill from user_management_profiles ──────────────────────────────

UPDATE public.user_profiles up
SET
  status     = COALESCE(ump.status, 'active'),
  phone      = ump.phone,
  department = ump.department
FROM public.user_management_profiles ump
WHERE ump.user_id = up.id
  AND up.status = 'active';  -- only override defaults, don't clobber explicit values

-- ── 3. Sync trigger: UMP status → user_profiles status ──────────────────────
-- Edge functions (manage-users, invite-user) write to user_management_profiles.
-- This trigger keeps user_profiles.status in sync automatically.

CREATE OR REPLACE FUNCTION public.sync_ump_status_to_user_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET status = NEW.status
  WHERE id = NEW.user_id
    AND status IS DISTINCT FROM NEW.status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ump_status ON public.user_management_profiles;

CREATE TRIGGER trg_sync_ump_status
  AFTER INSERT OR UPDATE OF status ON public.user_management_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ump_status_to_user_profiles();

-- ── 4. Drop legacy tables from the old role system ──────────────────────────
-- Created in 20251005140000_user_role_system.sql.
-- Zero references in app code AND edge functions.

-- Drop policies first (defensive)
DO $$ DECLARE
  pol RECORD;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users', 'role_assignments', 'user_sessions'] LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.role_assignments CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ── 5. Drop legacy profiles table ───────────────────────────────────────────
-- Created in 20251011084337. Zero references in app code.
-- The cleanup-invited-users edge function has a defensive delete that
-- handles missing tables gracefully.

DO $$ DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.profiles CASCADE;
