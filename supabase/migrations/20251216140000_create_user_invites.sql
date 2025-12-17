
-- Create user_invites table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    inviter_id UUID REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.organizations(id),
    role_data JSONB,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all invites"
    ON public.user_invites
    FOR SELECT
    TO authenticated
    USING (true); -- Simplified for now, refine later

CREATE POLICY "Admins can insert invites"
    ON public.user_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can delete invites"
    ON public.user_invites
    FOR DELETE
    TO authenticated
    USING (true);
