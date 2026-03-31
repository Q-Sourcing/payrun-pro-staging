/**
 * Auth module barrel export
 *
 * This is the single import point for the new auth system.
 * Components should import from '@/lib/auth' or '@/lib/auth/AuthProvider', etc.
 */

// Provider + hook
export { AuthProvider, useAuth } from './AuthProvider';
export type { UserProfile } from './AuthProvider';

// Org context
export { OrgProvider, useOrg } from './OrgProvider';

// Permission hook
export { usePermission } from './usePermission';

// Role convenience hook
export { useUserRole } from './useUserRole';

// Permission guard components
export { PermissionGate, SuperAdminOnly, OrgAdminOnly, RequirePermission } from './PermissionGate';

// Pure functions (for use outside React components)
export {
  parseClaims,
  getUserContext,
  isTokenExpired,
  getTimeUntilExpiration,
} from './claims';
export type { JWTClaims, UserContext, RBACRoleEntry, ScopeType } from './claims';

export {
  hasPermission,
  hasScopedPermission,
  hasAnyPermission,
  hasAllPermissions,
  isPlatformAdmin,
  isOrgAdmin,
  hasRole,
  canAccessResource,
  canAssignRole,
  canAccessOrganization,
  getRoleDisplayName,
  getPermissionGroups,
} from './permissions';
export type { Role, Permission, Scope } from './permissions';
