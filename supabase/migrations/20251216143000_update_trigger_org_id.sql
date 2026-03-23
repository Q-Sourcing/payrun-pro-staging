
-- Ensure baseline tables exist (may have been created outside migrations)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    default_company_id UUID
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID NOT NULL PRIMARY KEY,
    organization_id UUID,
    role TEXT DEFAULT 'user' NOT NULL,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    email TEXT,
    activated_at TIMESTAMP WITH TIME ZONE
);

-- Update handle_new_user to capture organization_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Try to cast the organization_id from metadata to UUID safely
  BEGIN
    org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role, organization_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    organization_id = COALESCE(public.user_profiles.organization_id, EXCLUDED.organization_id); -- Don't overwrite if already set (though for new user it won't be)
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
