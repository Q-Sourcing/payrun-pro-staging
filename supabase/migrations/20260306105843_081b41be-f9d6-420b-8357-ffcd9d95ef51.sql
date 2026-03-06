-- Table to store extended user management fields (phone, department, status)
CREATE TABLE IF NOT EXISTS public.user_management_profiles (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL UNIQUE,
  phone        TEXT,
  department   TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_management_profiles ENABLE ROW LEVEL SECURITY;

-- Admins and HR can read profiles in their org
CREATE POLICY "org_admins_hr_read_user_management_profiles"
  ON public.user_management_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'hr', 'super_admin')
    )
  );

-- Only the service role (used by the edge function) can insert/update/delete
CREATE POLICY "service_role_manage_user_management_profiles"
  ON public.user_management_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER set_user_management_profiles_updated_at
  BEFORE UPDATE ON public.user_management_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
