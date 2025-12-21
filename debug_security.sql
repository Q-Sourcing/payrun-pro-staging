-- Debugging Security Verification Tests

DO $$
DECLARE
    v_user_a UUID;
    v_org_a UUID;
    v_org_b UUID := '00000000-0000-0000-0000-0000000000b1';
    v_role_code TEXT := 'ORG_ADMIN';
    v_is_platform_admin BOOLEAN;
BEGIN
    RAISE NOTICE '--- Debugging Security Verification Tests ---';

    -- 1. Identify Existing User and Organization
    SELECT id, organization_id INTO v_user_a, v_org_a 
    FROM public.user_profiles 
    WHERE organization_id != '00000000-0000-0000-0000-000000000000' 
    LIMIT 1;

    IF v_user_a IS NULL THEN
        RAISE EXCEPTION 'No existing non-platform users found to test with';
    END IF;

    v_is_platform_admin := public.is_platform_admin(v_user_a);
    RAISE NOTICE 'v_user_a: %, org_a: %, is_platform_admin: %', v_user_a, v_org_a, v_is_platform_admin;

    -- Create a second organization for testing
    INSERT INTO public.organizations (id, name) 
    VALUES (v_org_b, 'Security Verification Org B') 
    ON CONFLICT (id) DO NOTHING;

    -- Check if User A has permission in Org B
    IF public.has_permission('admin.manage_users', 'ORGANIZATION', v_org_b, v_user_a) THEN
        IF v_is_platform_admin THEN
            RAISE NOTICE 'INFO: User A granted permission for Org B (EXPECTED because they are Platform Admin)';
        ELSE
            RAISE EXCEPTION 'FAILED: User A granted permission for Org B context (NOT Platform Admin)';
        END IF;
    ELSE
        RAISE NOTICE 'PASSED: User A denied permission for Org B context';
    END IF;

    -- Cleanup
    DELETE FROM public.organizations WHERE id = v_org_b;

    RAISE NOTICE '--- Debugging Completed ---';
END;
$$;
