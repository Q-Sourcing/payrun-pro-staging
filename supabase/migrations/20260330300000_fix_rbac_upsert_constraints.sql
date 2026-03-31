-- ============================================================================
-- Fix RBAC upsert constraints
-- ============================================================================
-- Two issues:
-- 1. rbac_assignments has a unique constraint on (user_id, role_code,
--    scope_type, scope_id) but scope_id is often NULL for GLOBAL scope.
--    PostgreSQL treats NULLs as distinct in unique constraints, so upserts
--    with NULL scope_id always INSERT instead of UPDATE, eventually failing
--    on FK constraints or creating duplicates.
--
-- 2. rbac_grants has NO unique constraint at all, so upserts with onConflict
--    always fail with a 400 error.
--
-- Fixes:
-- 1. Deduplicate existing rows, drop the old constraint, and create a new
--    one using COALESCE to handle NULL scope_id.
-- 2. Deduplicate rbac_grants and add unique indexes.
-- ============================================================================

-- ── 1. Fix rbac_assignments ─────────────────────────────────────────────────

-- Drop the old constraint that doesn't handle NULLs properly
ALTER TABLE public.rbac_assignments
  DROP CONSTRAINT IF EXISTS rbac_assignments_user_id_role_code_scope_type_scope_id_key;

-- Deduplicate: keep the newest row per (user_id, role_code, scope_type, coalesced scope_id)
DELETE FROM public.rbac_assignments a
USING public.rbac_assignments b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.role_code = b.role_code
  AND a.scope_type = b.scope_type
  AND COALESCE(a.scope_id, '00000000-0000-0000-0000-000000000000') =
      COALESCE(b.scope_id, '00000000-0000-0000-0000-000000000000');

-- Now create the unique index
CREATE UNIQUE INDEX rbac_assignments_user_role_scope_unique
  ON public.rbac_assignments (
    user_id,
    role_code,
    scope_type,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000')
  );

-- ── 2. Fix rbac_grants ──────────────────────────────────────────────────────

-- Deduplicate user-level grants: keep newest per (user_id, permission_key, scope_type, scope_id)
DELETE FROM public.rbac_grants a
USING public.rbac_grants b
WHERE a.user_id IS NOT NULL
  AND b.user_id IS NOT NULL
  AND a.id < b.id
  AND a.user_id = b.user_id
  AND a.permission_key = b.permission_key
  AND a.scope_type = b.scope_type
  AND a.scope_id = b.scope_id;

-- User-level grants: one grant per (user, permission, scope_type, scope_id)
CREATE UNIQUE INDEX rbac_grants_user_perm_scope_unique
  ON public.rbac_grants (
    user_id,
    permission_key,
    scope_type,
    scope_id
  )
  WHERE user_id IS NOT NULL;

-- Deduplicate role-level grants
DELETE FROM public.rbac_grants a
USING public.rbac_grants b
WHERE a.role_code IS NOT NULL
  AND b.role_code IS NOT NULL
  AND a.id < b.id
  AND a.role_code = b.role_code
  AND a.permission_key = b.permission_key
  AND a.scope_type = b.scope_type
  AND a.scope_id = b.scope_id;

-- Role-level grants: one grant per (role, permission, scope_type, scope_id)
CREATE UNIQUE INDEX rbac_grants_role_perm_scope_unique
  ON public.rbac_grants (
    role_code,
    permission_key,
    scope_type,
    scope_id
  )
  WHERE role_code IS NOT NULL;
