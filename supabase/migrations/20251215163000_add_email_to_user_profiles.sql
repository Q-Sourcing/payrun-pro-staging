-- Add email column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id;

-- Create function to sync email changes
CREATE OR REPLACE FUNCTION public.sync_user_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to sync email updates
DROP TRIGGER IF EXISTS on_auth_user_email_update ON auth.users;
CREATE TRIGGER on_auth_user_email_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_user_profile_email();

-- Update handle_new_user trigger function if it exists to include email
-- Note: Depending on how the initial user profile is created. 
-- Usually it's done via a trigger on auth.users insert.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
