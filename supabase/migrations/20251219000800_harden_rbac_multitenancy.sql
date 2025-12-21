-- Migration: Harden OBAC Multi-Tenancy
-- Phase 1: Tenant-scoped roles and permissions

-- 1. Add org_id to rbac_roles
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Ensure Platform Sentinel Org exists
INSERT INTO public.organizations (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Platform System')
ON CONFLICT (id) DO NOTHING;

-- 3. Populate org_ids
-- Platform roles use the sentinel
UPDATE public.rbac_roles 
SET org_id = '00000000-0000-0000-0000-000000000000' 
WHERE tier = 'PLATFORM' AND (org_id IS NULL OR org_id != '00000000-0000-0000-0000-000000000000');

-- Other roles use the primary org or inherit from scope
UPDATE public.rbac_roles 
SET org_id = '00000000-0000-0000-0000-000000000001' 
WHERE tier != 'PLATFORM' AND org_id IS NULL;

-- 4. Enforce constraint: org_id is the SENTINEL for PLATFORM tier, something else for others
ALTER TABLE public.rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_org_id_check;
ALTER TABLE public.rbac_roles ADD CONSTRAINT rbac_roles_org_id_check 
  CHECK (
    (tier = 'PLATFORM' AND org_id = '00000000-0000-0000-0000-000000000000') OR 
    (tier != 'PLATFORM' AND org_id != '00000000-0000-0000-0000-000000000000' AND org_id IS NOT NULL)
  );

-- 5. Add org_id to mapping tables
ALTER TABLE public.rbac_role_permissions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.rbac_assignments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Update mapping tables to inherit org_id from roles
UPDATE public.rbac_role_permissions rrp
SET org_id = rr.org_id
FROM public.rbac_roles rr
WHERE rrp.role_code = rr.code AND (rrp.org_id IS NULL OR rrp.org_id != rr.org_id);

-- Update assignments
UPDATE public.rbac_assignments ra
SET org_id = COALESCE(
  CASE 
    WHEN ra.scope_type = 'ORGANIZATION' THEN ra.scope_id
    WHEN ra.scope_type = 'GLOBAL' THEN '00000000-0000-0000-0000-000000000000'
    ELSE (SELECT organization_id FROM public.companies WHERE id = ra.scope_id)
  END,
  '00000000-0000-0000-0000-000000000001'
)
WHERE ra.org_id IS NULL;

-- 6. Update Primary Keys to be Composite (code, org_id)
ALTER TABLE public.rbac_role_permissions DROP CONSTRAINT IF EXISTS rbac_role_permissions_role_code_fkey;
ALTER TABLE public.rbac_assignments DROP CONSTRAINT IF EXISTS rbac_assignments_role_code_fkey;

ALTER TABLE public.rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_pkey CASCADE;
ALTER TABLE public.rbac_roles ADD PRIMARY KEY (code, org_id);

ALTER TABLE public.rbac_role_permissions ADD CONSTRAINT rbac_role_permissions_role_fkey 
  FOREIGN KEY (role_code, org_id) REFERENCES public.rbac_roles(code, org_id) ON DELETE CASCADE;

ALTER TABLE public.rbac_assignments ADD CONSTRAINT rbac_assignments_role_fkey 
  FOREIGN KEY (role_code, org_id) REFERENCES public.rbac_roles(code, org_id) ON DELETE CASCADE;

ALTER TABLE public.rbac_role_permissions DROP CONSTRAINT IF EXISTS rbac_role_permissions_pkey;
ALTER TABLE public.rbac_role_permissions ADD PRIMARY KEY (role_code, permission_key, org_id);

-- 7. Strict Validation Function
CREATE OR REPLACE FUNCTION public.validate_rbac_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Ensure User belongs to the Org (unless platform admin/sentinel)
  IF NEW.org_id != '00000000-0000-0000-0000-000000000000' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = NEW.user_id AND organization_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION 'User does not belong to the target organization';
    END IF;
  END IF;

  -- 2. Ensure Scope belongs to the Org
  IF NEW.scope_type = 'COMPANY' THEN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.scope_id AND organization_id = NEW.org_id) THEN
      RAISE EXCEPTION 'Target company does not belong to the assignment organization';
    END IF;
  ELSIF NEW.scope_type = 'PROJECT' THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.scope_id AND organization_id = NEW.org_id) THEN
      RAISE EXCEPTION 'Target project does not belong to the assignment organization';
    END IF;
  ELSIF NEW.scope_type = 'ORGANIZATION' THEN
    IF NEW.scope_id != NEW.org_id THEN
      RAISE EXCEPTION 'Organization scope ID must match the assignment organization ID';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_rbac_assignment ON public.rbac_assignments;
CREATE TRIGGER trg_validate_rbac_assignment
BEFORE INSERT OR UPDATE ON public.rbac_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_rbac_assignment();

-- 8. Security Audit Table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    org_id UUID REFERENCES public.organizations(id),
    event_type TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
