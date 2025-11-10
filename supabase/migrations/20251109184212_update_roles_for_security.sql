-- Update Role Enum for Security Enhancement
-- Add platform_admin and org_super_admin roles
-- Migrate existing super_admin to platform_admin

-- First, add new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'org_super_admin';

-- Migrate existing super_admin users to platform_admin
-- Note: PostgreSQL doesn't support direct enum value renaming, so we update the data
UPDATE public.user_roles 
SET role = 'platform_admin'::public.app_role 
WHERE role = 'super_admin'::public.app_role;

-- Update the has_role function to handle new roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'platform_admin'::public.app_role
  )
$$;

-- Create helper function to check if user is org super admin
CREATE OR REPLACE FUNCTION public.is_org_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'org_super_admin'::public.app_role
  )
$$;

-- Create helper function to check if user can unlock accounts
CREATE OR REPLACE FUNCTION public.can_unlock_accounts(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('platform_admin'::public.app_role, 'org_super_admin'::public.app_role)
  )
$$;

-- Update RLS policies to use new roles
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

-- Platform admins can view all roles
CREATE POLICY "Platform admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Users can view own roles (unchanged)
-- This policy already exists, keeping it

-- Add comment to document the change
COMMENT ON TYPE public.app_role IS 'User roles: platform_admin (global), org_super_admin (org-scoped), admin, manager, employee';

