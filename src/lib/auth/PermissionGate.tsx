/**
 * PermissionGate.tsx — New permission guard component
 *
 * Replaces the old PermissionGuard. Uses useAuth() + usePermission()
 * from the new auth system. No dependency on RBACService singleton.
 */

import { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { usePermission } from './usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import type { Permission, Role, Scope } from './permissions';

interface PermissionGateProps {
  children: ReactNode;
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions to check (use with requireAll) */
  permissions?: Permission[];
  /** Scope type: GLOBAL, ORGANIZATION, or COMPANY */
  scopeType?: Scope;
  /** Scope ID for organization or company scoping */
  scopeId?: string | null;
  /** If true, user must have ALL permissions. If false, ANY permission suffices */
  requireAll?: boolean;
  /** Content to show if access denied */
  fallback?: ReactNode;
  /** Show error alert if access denied (default: true) */
  showError?: boolean;
  /** @deprecated Use permission-based checks instead */
  role?: Role;
  /** @deprecated Use permission-based checks instead */
  roles?: Role[];
}

export function PermissionGate({
  children,
  permission,
  permissions,
  scopeType = 'GLOBAL',
  scopeId = null,
  requireAll = true,
  role,
  roles,
  fallback = null,
  showError = true,
}: PermissionGateProps) {
  const { isAuthenticated, isLoading, userContext } = useAuth();
  const perms = usePermission();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !userContext) {
    if (fallback) return <>{fallback}</>;
    return showError ? (
      <div className="flex items-center justify-center p-8">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>You must be logged in to access this resource.</AlertDescription>
        </Alert>
      </div>
    ) : null;
  }

  // Legacy role check
  if (role || roles) {
    const userRoleCodes = userContext.roles.map((r) => r.role);
    let hasRoleMatch = false;
    if (role) hasRoleMatch = userRoleCodes.includes(role);
    else if (roles) hasRoleMatch = roles.some((r) => userRoleCodes.includes(r));

    if (!hasRoleMatch) {
      if (fallback) return <>{fallback}</>;
      return showError ? (
        <div className="flex items-center justify-center p-8">
          <Alert className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>You don't have the required role to access this resource.</AlertDescription>
          </Alert>
        </div>
      ) : null;
    }
  }

  // Permission check
  let hasSpecificPermission = true;
  if (permission) {
    hasSpecificPermission = perms.hasScopedPermission(permission, scopeType, scopeId);
  } else if (permissions && permissions.length > 0) {
    hasSpecificPermission = requireAll
      ? permissions.every((p) => perms.hasScopedPermission(p, scopeType, scopeId))
      : permissions.some((p) => perms.hasScopedPermission(p, scopeType, scopeId));
  }

  if (!hasSpecificPermission) {
    if (fallback) return <>{fallback}</>;
    return showError ? (
      <div className="flex items-center justify-center p-8">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>You don't have permission to access this resource.</AlertDescription>
        </Alert>
      </div>
    ) : null;
  }

  return <>{children}</>;
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export function SuperAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate role="PLATFORM_SUPER_ADMIN" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function OrgAdminOnly({
  children,
  fallback,
  scopeId,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  scopeId?: string;
}) {
  return (
    <PermissionGate role="ORG_ADMIN" scopeType="ORGANIZATION" scopeId={scopeId} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function RequirePermission({
  permission,
  scopeType = 'GLOBAL',
  scopeId,
  children,
  fallback,
}: {
  permission: Permission;
  scopeType?: Scope;
  scopeId?: string | null;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGate permission={permission} scopeType={scopeType} scopeId={scopeId} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
