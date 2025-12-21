CREATE OR REPLACE FUNCTION public.sync_rbac_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_roles JSONB;
    v_permissions JSONB;
    v_is_platform_admin BOOLEAN;
    v_org_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN v_user_id := OLD.user_id; ELSE v_user_id := NEW.user_id; END IF;

    -- Collect roles WITH org_id for precise scoping
    SELECT jsonb_agg(jsonb_build_object(
      'role', role_code, 
      'scope_type', scope_type, 
      'scope_id', scope_id,
      'org_id', org_id
    )) 
    INTO v_roles FROM public.rbac_assignments WHERE user_id = v_user_id;

    -- Collect permissions (distinct across all assignments)
    SELECT jsonb_agg(DISTINCT rp.permission_key) 
    INTO v_permissions FROM public.rbac_assignments a
    JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code AND rp.org_id = a.org_id
    WHERE a.user_id = v_user_id;

    -- Check platform admin
    v_is_platform_admin := public.is_platform_admin(v_user_id);
    
    -- Get primary organization_id
    SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = v_user_id;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'rbac_roles', coalesce(v_roles, '[]'::jsonb),
            'rbac_permissions', coalesce(v_permissions, '[]'::jsonb),
            'is_platform_admin', v_is_platform_admin,
            'organization_id', v_org_id
        )
    WHERE id = v_user_id;
    RETURN NULL;
END;
$$;
