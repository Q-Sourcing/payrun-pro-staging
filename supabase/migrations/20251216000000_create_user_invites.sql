-- Create user_invites table for Enterprise Onboarding
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    inviter_id UUID REFERENCES auth.users(id),
    tenant_id UUID, -- Optional: If invite is scoped to a specific tenant
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

-- Temporary open policies — will be replaced by 20251219000200_tighten_obac.sql
CREATE POLICY "user_invites_select_inviter"
    ON public.user_invites FOR SELECT TO authenticated
    USING (inviter_id = auth.uid());

CREATE POLICY "user_invites_select_own_email"
    ON public.user_invites FOR SELECT TO authenticated
    USING (email = (select email from auth.users where id = auth.uid()));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO service_role;
GRANT SELECT ON public.user_invites TO authenticated;
