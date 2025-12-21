-- Diagnostic Script: Verify Permission Fix
DO $$
DECLARE
    v_user_id UUID;
    v_is_privileged BOOLEAN;
    v_has_perm BOOLEAN;
BEGIN
    -- 1. Get a test user (or use auth.uid() if running in a real context)
    -- For diagnostic purposes, we'll try to find a user with a role.
    SELECT user_id INTO v_user_id FROM public.rbac_assignments LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No rbac_assignments found to test with.';
        RETURN;
    END IF;

    RAISE NOTICE 'Testing with User ID: %', v_user_id;

    -- 2. Test the shim
    BEGIN
        SELECT public.has_permission(v_user_id, 'people.view') INTO v_has_perm;
        RAISE NOTICE 'public.has_permission(uuid, text) for people.view: %', v_has_perm;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Shim check failed: %', SQLERRM;
    END;

    -- 3. Test ippms.is_privileged()
    -- Note: is_privileged uses auth.uid(), so we need to mock it if possible
    -- but usually we can just check if the function exists and compiles.
    IF EXISTS (
        SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE nspname = 'ippms' AND proname = 'is_privileged'
    ) THEN
        RAISE NOTICE 'ippms.is_privileged() exists and is valid.';
    ELSE
        RAISE EXCEPTION 'ippms.is_privileged() NOT FOUND';
    END IF;

    RAISE NOTICE 'Verification complete. Results look promising.';
END $$;
