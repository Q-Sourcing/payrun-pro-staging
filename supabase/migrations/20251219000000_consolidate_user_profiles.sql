-- Consolidate user identity and security into user_profiles
-- Migration: 20251219000000_consolidate_user_profiles.sql

-- 1) Add lockout fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lockout_reason TEXT;

-- 2) Add indexes for lockout queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_locked_at ON public.user_profiles(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_failed_attempts ON public.user_profiles(failed_login_attempts) WHERE failed_login_attempts > 0;

-- 3) Add check constraint
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS check_failed_attempts_non_negative;

ALTER TABLE public.user_profiles
ADD CONSTRAINT check_failed_attempts_non_negative 
CHECK (failed_login_attempts >= 0);

-- 4) Redefine lockout functions to use user_profiles
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    failed_login_attempts = 0,
    locked_at = NULL,
    updated_at = NOW()
  WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_failed_login_attempts(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.user_profiles
  SET 
    failed_login_attempts = failed_login_attempts + 1,
    updated_at = NOW()
  WHERE id = _user_id
  RETURNING failed_login_attempts INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_account_locked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT locked_at IS NOT NULL
  FROM public.user_profiles
  WHERE id = _user_id
$$;

-- 5) Backfill data from profiles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    UPDATE public.user_profiles up
    SET 
      failed_login_attempts = p.failed_login_attempts,
      locked_at = p.locked_at,
      locked_by = p.locked_by,
      unlocked_at = p.unlocked_at,
      unlocked_by = p.unlocked_by,
      lockout_reason = p.lockout_reason
    FROM public.profiles p
    WHERE up.id = p.id;
  END IF;
END $$;

-- 6) Comments
COMMENT ON COLUMN public.user_profiles.failed_login_attempts IS 'Number of consecutive failed login attempts. Reset on successful login.';
COMMENT ON COLUMN public.user_profiles.locked_at IS 'Timestamp when account was locked due to failed attempts or admin action.';
COMMENT ON COLUMN public.user_profiles.locked_by IS 'User ID of admin who locked the account (NULL if auto-locked).';
COMMENT ON COLUMN public.user_profiles.unlocked_at IS 'Timestamp when account was unlocked.';
COMMENT ON COLUMN public.user_profiles.unlocked_by IS 'User ID of admin who unlocked the account.';
COMMENT ON COLUMN public.user_profiles.lockout_reason IS 'Reason for account lockout (e.g., "Failed login attempts exceeded threshold").';
