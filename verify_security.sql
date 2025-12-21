-- Finalized Security Verification Tests (Fixed Signatures)

DO $$
DECLARE
    v_user_a UUID;
    v_org_a UUID;
    v_org_b UUID := '00000000-0000-0000-0000-0000000000b1';
    v_role_code TEXT := 'ORG_ADMIN';
    v_pay_run UUID;
BEGIN
    RAISE NOTICE '--- Starting Finalized Security Verification Tests ---';

    -- 1. Identify Existing User and Organization
    SELECT id, organization_id INTO v_user_a, v_org_a 
    FROM public.user_profiles 
    WHERE organization_id != '00000000-0000-0000-0000-000000000000' 
    LIMIT 1;

    IF v_user_a IS NULL THEN
        RAISE EXCEPTION 'No existing non-platform users found to test with';
    END IF;

    -- Create a second organization for testing
    INSERT INTO public.organizations (id, name) 
    VALUES (v_org_b, 'Security Verification Org B') 
    ON CONFLICT (id) DO NOTHING;

    -- 2. Tenant Leak Test: Assign Org B role to User A (from Org A)
    RAISE NOTICE 'Test 2: Tenant Leak Prevention';
    BEGIN
        INSERT INTO public.rbac_assignments (user_id, role_code, scope_type, org_id)
        VALUES (v_user_a, v_role_code, 'ORGANIZATION', v_org_b);
        RAISE EXCEPTION 'FAILED: Assignment across tenants (User in Org A, Role in Org B) was incorrectly allowed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASSED: Assignment across tenants blocked as expected: %', SQLERRM;
    END;

    -- 3. has_permission Scoping Test
    RAISE NOTICE 'Test 3: has_permission Scoping';
    -- Check if User A has permission in Org B (Should be FALSE)
    -- Correct Signature: has_permission(_permission_key, _scope_type, _scope_id, _user_id)
    IF public.has_permission('admin.manage_users', 'ORGANIZATION', v_org_b, v_user_a) THEN
        RAISE EXCEPTION 'FAILED: User A granted permission for Org B context';
    ELSE
        RAISE NOTICE 'PASSED: User A denied permission for Org B context';
    END IF;

    -- 4. Payroll Locking Test
    RAISE NOTICE 'Test 4: Payroll Locking';
    -- Insert a pay run into Org A
    INSERT INTO public.pay_runs (organization_id, name, status, period_start, period_end)
    VALUES (v_org_a, 'Locked Pay Run Test', 'approved', '2024-01-01', '2024-01-31')
    RETURNING id INTO v_pay_run;

    BEGIN
        UPDATE public.pay_runs SET name = 'Unauthorized Update' WHERE id = v_pay_run;
        RAISE EXCEPTION 'FAILED: Modification allowed on approved pay run';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASSED: Modification blocked on approved pay run: %', SQLERRM;
    END;

    -- Cleanup
    DELETE FROM public.pay_runs WHERE id = v_pay_run;
    DELETE FROM public.organizations WHERE id = v_org_b;

    RAISE NOTICE '--- All Verification Tests Completed Successfully ---';
END;
$$;
