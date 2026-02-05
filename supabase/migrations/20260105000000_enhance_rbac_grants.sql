-- ==========================================================
-- 🛠️ ENHANCEMENT: ADVANCED RBAC GRANTS & EXPIRATION
-- ==========================================================
-- Migration: 20260105000000_enhance_rbac_grants.sql
-- Purpose:
-- 1. Add valid_until to rbac_grants for temporary permissions.
-- 2. Restore grant-aware has_permission logic with DENY priority and expiry checks.

-- 1. Add valid_until column
ALTER TABLE public.rbac_grants ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- 2. Restore and Enhance has_permission
-- Handles Platform Admin bypass, explicit DENY (with expiry), 
-- Role-based permissions, and explicit ALLOW (with expiry).
CREATE OR REPLACE FUNCTION public.has_permission(
  _permission_key TEXT,
  _scope_type TEXT DEFAULT NULL,
  _scope_id UUID DEFAULT NULL,
  _user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  -- 1. PLATFORM BYPASS: Platform Admins have full access
  IF public.is_platform_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit DENY grants (User-specific or Role-based)
  -- Deny always wins. Includes expiration check.
  IF EXISTS (
    SELECT 1 FROM public.rbac_grants g
    LEFT JOIN public.rbac_assignments a ON (
        -- Role-based grant: User must have the role assigned
        (g.role_code = a.role_code AND a.user_id = _user_id)
    )
    WHERE g.permission_key = _permission_key
      AND g.effect = 'DENY'
      AND (g.user_id = _user_id OR a.user_id = _user_id)
      -- Expiration check: Only consider if NOT expired
      AND (g.valid_until IS NULL OR g.valid_until > now())
      -- Scope resolution
      AND (
        _scope_type IS NULL
        OR g.scope_type = _scope_type AND (_scope_id IS NULL OR g.scope_id = _scope_id)
      )
  ) THEN
    RETURN FALSE;
  END IF;

  -- 3. Check for Role-based permissions within Scope
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_assignments ra
    JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code AND ra.org_id = rrp.org_id
    WHERE ra.user_id = _user_id
      AND rrp.permission_key = _permission_key
      AND (
        -- Scope Resolution Logic
        _scope_type IS NULL
        OR ra.scope_type = 'GLOBAL'
        OR (ra.scope_type = _scope_type AND (_scope_id IS NULL OR ra.scope_id = _scope_id))
        OR (ra.scope_type = 'ORGANIZATION' AND _scope_type IN ('COMPANY', 'PROJECT'))
        OR (ra.scope_type = 'COMPANY' AND _scope_type = 'PROJECT')
      )
  ) INTO v_has_perm;

  IF v_has_perm THEN
    RETURN TRUE;
  END IF;

  -- 4. Check for explicit ALLOW grants
  -- Includes expiration check.
  IF EXISTS (
    SELECT 1 FROM public.rbac_grants g
    LEFT JOIN public.rbac_assignments a ON (
        -- Role-based grant: User must have the role assigned
        (g.role_code = a.role_code AND a.user_id = _user_id)
    )
    WHERE g.permission_key = _permission_key
      AND g.effect = 'ALLOW'
      AND (g.user_id = _user_id OR a.user_id = _user_id)
      -- Expiration check
      AND (g.valid_until IS NULL OR g.valid_until > now())
      -- Scope resolution
      AND (
        _scope_type IS NULL
        OR g.scope_type = _scope_type AND (_scope_id IS NULL OR g.scope_id = _scope_id)
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.has_permission(text, text, uuid, uuid) IS 'Evaluates effective permission by checking Platform Admin status, explicit DENY grants, Role-based permissions, and explicit ALLOW grants with support for temporary expiration.';

-- 3. Update Audit Trigger for Grants to handle valid_until
CREATE OR REPLACE FUNCTION public.audit_rbac_grants()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    NEW.scope_id, -- Using scope_id as org_id if scope is ORGANIZATION, might need adjustment for deeper scopes
    'GRANT_' || TG_OP, 
    'rbac_grants', 
    NEW.id::text,
    'Custom permission grant ' || LOWER(TG_OP) || 'ed: ' || NEW.permission_key || ' (' || NEW.effect || ')',
    jsonb_build_object(
        'user_id', NEW.user_id,
        'role_code', NEW.role_code,
        'permission_key', NEW.permission_key,
        'effect', NEW.effect,
        'scope_type', NEW.scope_type,
        'scope_id', NEW.scope_id,
        'valid_until', NEW.valid_until,
        'reason', NEW.reason
    )
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_rbac_grants ON public.rbac_grants;
CREATE TRIGGER trg_audit_rbac_grants
AFTER INSERT OR UPDATE ON public.rbac_grants
FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_grants();
