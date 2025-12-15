import { ReactNode } from 'react'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { RBACService, Permission, Role } from '@/lib/services/auth/rbac'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock } from 'lucide-react'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  role?: Role
  roles?: Role[]
  requireAll?: boolean
  fallback?: ReactNode
  showError?: boolean
}

export function PermissionGuard({
  children,
  permission,
  permissions,
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

  // If not authenticated or no role, deny access
  if (!isAuthenticated || !userContext?.role) {
    if (fallback) return <>{fallback}</>
    // Start with deny
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

  const userRole = userContext.role

  // Check role permissions
  let hasRolePermission = true
  if (role) {
    hasRolePermission = userRole === role
  } else if (roles && roles.length > 0) {
    hasRolePermission = roles.includes(userRole)
  }

  if (!hasRolePermission) {
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

  // Check granular permissions
  let hasSpecificPermission = true
  if (permission) {
    hasSpecificPermission = RBACService.roleHasPermission(userRole, permission)
  } else if (permissions && permissions.length > 0) {
    hasSpecificPermission = requireAll
      ? permissions.every(p => RBACService.roleHasPermission(userRole, p))
      : permissions.some(p => RBACService.roleHasPermission(userRole, p))
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

// Convenience components for common permission checks
export function SuperAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard role="super_admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function OrgAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard roles={['super_admin', 'org_admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard roles={['super_admin', 'org_admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function RequirePermission({
  permission,
  children,
  fallback
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode
}) {
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function RequireAnyPermission({
  permissions,
  children,
  fallback
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode
}) {
  return (
    <PermissionGuard permissions={permissions} requireAll={false} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function RequireAllPermissions({
  permissions,
  children,
  fallback
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode
}) {
  return (
    <PermissionGuard permissions={permissions} requireAll={true} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}
