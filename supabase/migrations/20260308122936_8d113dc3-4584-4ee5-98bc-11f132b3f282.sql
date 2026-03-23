
-- Create user_management_invitations table
CREATE TABLE IF NOT EXISTS public.user_management_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  phone TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_management_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_umi_token ON public.user_management_invitations(token);
CREATE INDEX IF NOT EXISTS idx_umi_email ON public.user_management_invitations(email);
CREATE INDEX IF NOT EXISTS idx_umi_status ON public.user_management_invitations(status);

-- RLS policy: admins/hr can view (uses user_profiles which has the role column)
DROP POLICY IF EXISTS "Admins and HR can view invitations" ON public.user_management_invitations;
CREATE POLICY "Admins and HR can view invitations"
  ON public.user_management_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'hr', 'super_admin', 'org_admin', 'organization_admin')
    )
  );
