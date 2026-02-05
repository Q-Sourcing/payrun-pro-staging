-- Add account lockout fields to profiles table
-- Supports failed login attempt tracking and account lockout

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lockout_reason TEXT;

-- Add indexes for lockout queries
CREATE INDEX IF NOT EXISTS idx_profiles_locked_at ON public.profiles(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_failed_attempts ON public.profiles(failed_login_attempts) WHERE failed_login_attempts > 0;

-- Add check constraint to ensure failed_login_attempts is non-negative
ALTER TABLE public.profiles
ADD CONSTRAINT check_failed_attempts_non_negative 
CHECK (failed_login_attempts >= 0);

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    failed_login_attempts = 0,
    updated_at = NOW()
  WHERE id = _user_id;
END;
$$;

-- Create function to increment failed login attempts
CREATE OR REPLACE FUNCTION public.increment_failed_login_attempts(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET 
    failed_login_attempts = failed_login_attempts + 1,
    updated_at = NOW()
  WHERE id = _user_id
  RETURNING failed_login_attempts INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$;

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT locked_at IS NOT NULL
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Add comments
COMMENT ON COLUMN public.profiles.failed_login_attempts IS 'Number of consecutive failed login attempts. Reset on successful login.';
COMMENT ON COLUMN public.profiles.locked_at IS 'Timestamp when account was locked due to failed attempts or admin action.';
COMMENT ON COLUMN public.profiles.locked_by IS 'User ID of admin who locked the account (NULL if auto-locked).';
COMMENT ON COLUMN public.profiles.unlocked_at IS 'Timestamp when account was unlocked.';
COMMENT ON COLUMN public.profiles.unlocked_by IS 'User ID of admin who unlocked the account.';
COMMENT ON COLUMN public.profiles.lockout_reason IS 'Reason for account lockout (e.g., "Failed login attempts exceeded threshold").';

