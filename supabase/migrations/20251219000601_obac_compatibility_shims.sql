-- ==========================================================
-- OBAC Compatibility Shims
-- Migration: 20251219000601_obac_compatibility_shims.sql
-- ==========================================================

-- shim: has_permission(uuid, text)
-- Supports legacy calls where the scope was implicit or unneeded.
-- Internally checks if the user has the permission in ANY scope.
CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Check for PLATFORM_SUPER_ADMIN (Bypass)
    IF EXISTS (
        SELECT 1 FROM public.rbac_assignments 
        WHERE user_id = p_user_id AND role_code = 'PLATFORM_SUPER_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check for Role-based permissions within ANY Scope
    IF EXISTS (
        SELECT 1 FROM public.rbac_assignments a
        JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code
        WHERE a.user_id = p_user_id
          AND rp.permission_key = p_permission_key
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Check for explicit ALLOW grants in ANY Scope
    IF EXISTS (
        SELECT 1 FROM public.rbac_grants g
        JOIN public.rbac_assignments a ON (
            (g.user_id = p_user_id) OR 
            (g.role_code = a.role_code AND a.user_id = p_user_id)
        )
        WHERE g.permission_key = p_permission_key
          AND g.effect = 'ALLOW'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;
