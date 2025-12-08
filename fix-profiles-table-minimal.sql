-- Minimal fix - Just add the missing columns that secure-login needs
-- Run this first, then test login

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create the functions needed by secure-login
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = 0, updated_at = NOW()
  WHERE id = _user_id;
END;
$func$;

CREATE OR REPLACE FUNCTION public.increment_failed_login_attempts(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW()
  WHERE id = _user_id
  RETURNING failed_login_attempts INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$func$;

