-- Create user_invites table for Enterprise Onboarding
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    inviter_id UUID REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.organizations(id), -- Optional: If invite is scoped to a specific tenant
    role_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store intended roles/orgs: { orgs: [], platformRoles: [] }
    status invite_status NOT NULL DEFAULT 'pending',
    token_hash TEXT, -- Optional: Store hash of the invite token for verification if needed
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);
CREATE INDEX IF NOT EXISTS idx_user_invites_inviter ON public.user_invites(inviter_id);

-- RLS Policies
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Allow platform admins to view all invites (or strict RLS if needed)
-- For now, let's allow authenticated users to view invites they sent OR invites for their email.

CREATE POLICY "Admins can view all invites"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins 
            WHERE auth_user_id = auth.uid() AND allowed = true
        )
    );

CREATE POLICY "Users can view invites sent by themselves"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invites addressed to them"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (email = (select email from auth.users where id = auth.uid()));

-- Only Service Role (Edge Functions) should insert/update universally.
-- Admins can update status (revoke) via Edge Functions or direct if policy allows.
-- Let's restrict modification to Service Role for now to force usage of our controlled Edge Functions.
-- But wait, Platform Admins might need to Revoke directly from UI if we don't build an API for it?
-- Better to use functions. But for now, let's allow Platform Admins to update 'status' to 'revoked'.

CREATE POLICY "Admins can update invites (revoke)"
    ON public.user_invites
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins 
            WHERE auth_user_id = auth.uid() AND allowed = true
        )
    )
    WITH CHECK (
        EXISTS (
             SELECT 1 FROM public.platform_admins 
             WHERE auth_user_id = auth.uid() AND allowed = true
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO service_role;
GRANT SELECT ON public.user_invites TO authenticated;
