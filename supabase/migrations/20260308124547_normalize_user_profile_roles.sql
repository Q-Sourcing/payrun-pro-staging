-- 1. Drop the restrictive role check constraint
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Update handle_new_user to normalize roles safely before inserting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  raw_role TEXT;
  safe_role TEXT;
BEGIN
  BEGIN
    org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;

  raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  -- Normalize invitation/non-standard roles to valid values
  safe_role := CASE
    WHEN raw_role IN ('super_admin', 'org_admin', 'user') THEN raw_role
    WHEN raw_role IN ('admin', 'organization_admin') THEN 'org_admin'
    ELSE 'user'
  END;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    safe_role,
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    role = EXCLUDED.role,
    organization_id = COALESCE(public.user_profiles.organization_id, EXCLUDED.organization_id);

  RETURN NEW;
END;
$$;
