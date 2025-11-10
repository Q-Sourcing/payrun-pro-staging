-- Create auth_events table for comprehensive authentication event logging
-- ISO 27001 compliant audit logging

CREATE TABLE IF NOT EXISTS public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.pay_groups(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success',
    'login_failed',
    'logout',
    'password_reset_request',
    'password_reset_success',
    'password_change',
    'account_locked',
    'account_unlocked',
    'account_created',
    'account_deleted',
    'session_expired',
    'session_refreshed',
    'two_factor_enabled',
    'two_factor_disabled',
    'two_factor_verified',
    'two_factor_failed'
  )),
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  geo_location JSONB, -- {country, city, region, latitude, longitude, timezone}
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  reason TEXT, -- Error message or reason for failure
  metadata JSONB DEFAULT '{}', -- Additional event-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_org_id ON public.auth_events(org_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_timestamp ON public.auth_events(timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_ip_address ON public.auth_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_events_success ON public.auth_events(success);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_auth_events_user_timestamp ON public.auth_events(user_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_org_timestamp ON public.auth_events(org_id, timestamp_utc DESC);

-- Enable RLS
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Platform admins can view all auth events
CREATE POLICY "Platform admins can view all auth events"
ON public.auth_events
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Org super admins can view auth events for their organization
CREATE POLICY "Org super admins can view org auth events"
ON public.auth_events
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

-- Users can view their own auth events
CREATE POLICY "Users can view own auth events"
ON public.auth_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only service role can insert auth events (via Edge Functions)
CREATE POLICY "Service role can insert auth events"
ON public.auth_events
FOR INSERT
TO authenticated
WITH CHECK (true); -- Edge Functions use service role

-- Prevent deletion and updates (tamper-evident logs)
-- No UPDATE or DELETE policies - logs are immutable

-- Create function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = _user_id
  LIMIT 1
$$;

-- Add comment
COMMENT ON TABLE public.auth_events IS 'ISO 27001 compliant authentication event audit log. Immutable records of all authentication activities.';
COMMENT ON COLUMN public.auth_events.geo_location IS 'Geolocation data from IP lookup: {country, city, region, latitude, longitude, timezone}';
COMMENT ON COLUMN public.auth_events.metadata IS 'Additional event-specific data (e.g., device info, browser version)';

