import { ReactNode } from 'react'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { RBACService, Permission, Role, Scope } from '@/lib/services/auth/rbac'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock } from 'lucide-react'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  scopeType?: Scope
  scopeId?: string | null
  requireAll?: boolean
  fallback?: ReactNode
  showError?: boolean
  // Deprecated direct role checks - will be removed in future refactors
  role?: Role
  roles?: Role[]
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  scopeType = 'GLOBAL',
  scopeId = null,
  requireAll = true,
  role,
  roles,
  fallback = null,
  showError = true
}: PermissionGuardProps) {
  const { userContext, isAuthenticated, isLoading } = useSupabaseAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If not authenticated, deny access
  if (!isAuthenticated || !userContext) {
    if (fallback) return <>{fallback}</>
    return showError ? (
      <div className="flex items-center justify-center p-8">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access this resource.
          </AlertDescription>
        </Alert>
      </div>
    ) : null;
  }

  // LEGACY SUPPORT: Check roles directly if provided
  if (role || roles) {
    const userRoleCodes = userContext.roles.map(r => r.role)
    let hasRoleMatch = false
    if (role) hasRoleMatch = userRoleCodes.includes(role)
    else if (roles) hasRoleMatch = roles.some(r => userRoleCodes.includes(r))

    if (!hasRoleMatch) {
      if (fallback) return <>{fallback}</>
      return showError ? (
        <div className="flex items-center justify-center p-8">
          <Alert className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have the required role to access this resource.
            </AlertDescription>
          </Alert>
        </div>
      ) : null;
    }
  }

  // MODERN: Check granular permissions with scope
  let hasSpecificPermission = true
  if (permission) {
    hasSpecificPermission = RBACService.hasScopedPermission(permission, scopeType, scopeId)
  } else if (permissions && permissions.length > 0) {
    hasSpecificPermission = requireAll
      ? permissions.every(p => RBACService.hasScopedPermission(p, scopeType, scopeId))
      : permissions.some(p => RBACService.hasScopedPermission(p, scopeType, scopeId))
  }

  if (!hasSpecificPermission) {
    if (fallback) return <>{fallback}</>
    return showError ? (
      <div className="flex items-center justify-center p-8">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this resource.
          </AlertDescription>
        </Alert>
      </div>
    ) : null;
  }

  // Access granted
  return <>{children}</>
}

/**
 * CONVENIENCE COMPONENTS (New OBAC Taxonomy)
 */

export function SuperAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard role="PLATFORM_SUPER_ADMIN" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function OrgAdminOnly({ children, fallback, scopeId }: { children: ReactNode; fallback?: ReactNode; scopeId?: string }) {
  return (
    <PermissionGuard role="ORG_ADMIN" scopeType="ORGANIZATION" scopeId={scopeId} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function RequirePermission({
  permission,
  scopeType = 'GLOBAL',
  scopeId,
  children,
  fallback
}: {
  permission: Permission;
  scopeType?: Scope;
  scopeId?: string | null;
  children: ReactNode;
  fallback?: ReactNode
}) {
  return (
    <PermissionGuard permission={permission} scopeType={scopeType} scopeId={scopeId} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}
