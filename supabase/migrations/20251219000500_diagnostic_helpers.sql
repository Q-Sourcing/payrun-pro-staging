-- Diagnostic helper for user state
-- Migration: 20251219000500_diagnostic_helpers.sql

CREATE OR REPLACE FUNCTION public.get_user_diagnostic_data(_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    result JSONB;
    v_user_id UUID;
    auth_user RECORD;
    profile_record RECORD;
    org_user_record RECORD;
    invite_record RECORD;
BEGIN
    -- 1. Find the user ID from auth.users (case-insensitive)
    SELECT id, email, confirmed_at, last_sign_in_at, created_at, raw_user_meta_data 
    INTO auth_user
    FROM auth.users 
    WHERE email = LOWER(_email)
    LIMIT 1;

    IF NOT FOUND THEN
        -- Try exact match if lower failed (just in case)
        SELECT id, email, confirmed_at, last_sign_in_at, created_at, raw_user_meta_data 
        INTO auth_user
        FROM auth.users 
        WHERE email = _email
        LIMIT 1;
    END IF;

    IF auth_user.id IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found in auth.users', 'searched_email', _email);
    END IF;

    v_user_id := auth_user.id;

    -- 2. Get User Profile
    SELECT * INTO profile_record FROM public.user_profiles WHERE id = v_user_id;

    -- 3. Get Org User status
    SELECT * INTO org_user_record FROM public.org_users WHERE user_id = v_user_id;

    -- 4. Get Invitations
    SELECT * INTO invite_record FROM public.user_invites WHERE email ILIKE _email ORDER BY created_at DESC LIMIT 1;

    -- Build the result blob
    result := jsonb_build_object(
        'auth_user', jsonb_build_object(
            'id', auth_user.id,
            'email', auth_user.email,
            'confirmed_at', auth_user.confirmed_at,
            'last_sign_in_at', auth_user.last_sign_in_at,
            'created_at', auth_user.created_at,
            'meta_org_id', auth_user.raw_user_meta_data->>'organization_id'
        ),
        'profile', CASE WHEN profile_record.id IS NOT NULL THEN 
            jsonb_build_object(
                'id', profile_record.id,
                'email', profile_record.email,
                'organization_id', profile_record.organization_id,
                'role', profile_record.role,
                'locked_at', profile_record.locked_at,
                'failed_attempts', profile_record.failed_login_attempts
            )
        ELSE NULL END,
        'org_user', CASE WHEN org_user_record.id IS NOT NULL THEN
            jsonb_build_object(
                'status', org_user_record.status,
                'org_id', org_user_record.org_id
            )
        ELSE NULL END,
        'invitation', CASE WHEN invite_record.id IS NOT NULL THEN
            jsonb_build_object(
                'status', invite_record.status,
                'expires_at', invite_record.expires_at,
                'tenant_id', invite_record.tenant_id
            )
        ELSE NULL END
    );

    RETURN result;
END;
$$;
