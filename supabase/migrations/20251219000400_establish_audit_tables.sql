-- Establish missing audit and auth event tables
-- Migration: 20251219000400_establish_audit_tables.sql
-- Description: Creates auth_events and activity_logs tables if they are missing or improperly configured.

-- 1. Create auth_events table (used by AuthLogger service)
CREATE TABLE IF NOT EXISTS public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    geo_location JSONB,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- 2. Create activity_logs table (standardized audit log)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Basic RLS Policies (Modern OBAC compatible)
-- Note: is_platform_admin() and current_org_id() are defined in 20251219000200_tighten_obac.sql

-- Auth Events Select
DROP POLICY IF EXISTS "auth_events_select_policy" ON public.auth_events;
CREATE POLICY "auth_events_select_policy" ON public.auth_events
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR 
    (org_id = public.current_org_id() AND (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('super_admin', 'org_admin')
        )
    ))
);

-- Auth Events Insert (Allow anyone to log their own events)
DROP POLICY IF EXISTS "auth_events_insert_policy" ON public.auth_events;
CREATE POLICY "auth_events_insert_policy" ON public.auth_events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Activity Logs Select
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs
FOR SELECT TO authenticated
USING (
    public.is_platform_admin() OR 
    organization_id = public.current_org_id()
);

-- Activity Logs Insert
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Repopulate indexes
CREATE INDEX IF NOT EXISTS idx_auth_events_org_user ON public.auth_events(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_timestamp ON public.auth_events(timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_user ON public.activity_logs(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
