/**
 * usePermission.ts — Single permission hook
 *
 * Reads from the JWT claims already in memory (via useAuth).
 * Zero extra DB calls. Every component that needs permission checks uses this.
 */

import { useMemo } from 'react';
import { useAuth } from './AuthProvider';
import {
  hasPermission,
  hasScopedPermission,
  hasAnyPermission,
  hasAllPermissions,
  isPlatformAdmin,
  isOrgAdmin,
  hasRole,
  canAccessResource,
  canManageResource,
  canCreateResource,
  canUpdateResource,
  canDeleteResource,
  canAssignRole,
  canAccessOrganization,
  getRoleDisplayName,
  getPermissionGroups,
} from './permissions';
import type { Permission, Role, Scope } from './permissions';

export function usePermission() {
  const { userContext } = useAuth();

  return useMemo(
    () => ({
      // Permission checks
      hasPermission: (permission: Permission) => hasPermission(userContext, permission),
      hasScopedPermission: (permission: Permission, scopeType: Scope, scopeId?: string | null) =>
        hasScopedPermission(userContext, permission, scopeType, scopeId),
      hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userContext, permissions),
      hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userContext, permissions),

      // Role checks
      isPlatformAdmin: isPlatformAdmin(userContext),
      isOrgAdmin: isOrgAdmin(userContext),
      isSelfUser: hasRole(userContext, 'SELF_USER'),
      hasRole: (roleCode: string) => hasRole(userContext, roleCode),

      // Resource checks
      canAccessResource: (resource: string, action?: string) => canAccessResource(userContext, resource, action),
      canManageResource: (resource: string) => canManageResource(userContext, resource),
      canCreateResource: (resource: string) => canCreateResource(userContext, resource),
      canUpdateResource: (resource: string) => canUpdateResource(userContext, resource),
      canDeleteResource: (resource: string) => canDeleteResource(userContext, resource),

      // Org/role assignment
      canAssignRole: (targetRole: Role) => canAssignRole(userContext, targetRole),
      canAccessOrganization: (orgId: string) => canAccessOrganization(userContext, orgId),

      // Current state
      permissions: userContext?.permissions ?? [],
      roles: userContext?.roles ?? [],
      role: (userContext?.roles[0]?.role as Role) ?? null,
      organizationId: userContext?.organizationId ?? null,

      // Impersonation
      isImpersonated: userContext?.isImpersonated ?? false,
      impersonatedBy: userContext?.impersonatedBy ?? null,

      // UI helpers
      getRoleDisplayName,
      getPermissionGroups,
    }),
    [userContext],
  );
}
