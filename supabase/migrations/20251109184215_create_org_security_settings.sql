-- Create organization_security_settings table
-- Stores security configuration per organization

CREATE TABLE IF NOT EXISTS public.organization_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pay_groups(id) ON DELETE CASCADE,
  lockout_threshold INTEGER NOT NULL DEFAULT 5 CHECK (lockout_threshold >= 3 AND lockout_threshold <= 10),
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_security_settings_org_id ON public.organization_security_settings(org_id);

-- Enable RLS
ALTER TABLE public.organization_security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Platform admins can view all settings
CREATE POLICY "Platform admins can view all security settings"
ON public.organization_security_settings
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Org super admins can view their org settings
CREATE POLICY "Org super admins can view org security settings"
ON public.organization_security_settings
FOR SELECT
TO authenticated
USING (
  public.is_org_super_admin(auth.uid())
  AND org_id IN (
    SELECT organization_id 
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- Platform admins can manage all settings
CREATE POLICY "Platform admins can manage all security settings"
ON public.organization_security_settings
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Org super admins can manage their org settings
CREATE POLICY "Org super admins can manage org security settings"
ON public.organization_security_settings
FOR ALL
TO authenticated
USING (
  public.is_org_super_admin(auth.uid())
  AND org_id IN (
    SELECT organization_id 
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  public.is_org_super_admin(auth.uid())
  AND org_id IN (
    SELECT organization_id 
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
  )
);

-- Create function to get lockout threshold for an organization
CREATE OR REPLACE FUNCTION public.get_lockout_threshold(_org_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT lockout_threshold FROM public.organization_security_settings WHERE org_id = _org_id),
    5 -- Default threshold
  )
$$;

-- Create function to check if email alerts are enabled for an organization
CREATE OR REPLACE FUNCTION public.is_email_alerts_enabled(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email_alerts_enabled FROM public.organization_security_settings WHERE org_id = _org_id),
    true -- Default enabled
  )
$$;

-- Add comments
COMMENT ON TABLE public.organization_security_settings IS 'Organization-level security configuration settings';
COMMENT ON COLUMN public.organization_security_settings.lockout_threshold IS 'Number of failed login attempts before account lockout (3-10)';
COMMENT ON COLUMN public.organization_security_settings.email_alerts_enabled IS 'Whether to send email alerts to admins on account lockouts';

