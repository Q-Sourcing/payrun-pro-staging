import { ReactNode } from 'react'
import { useAuthContext } from '@/hooks/use-auth-context'
import { Permission, Role } from '@/lib/services/auth/rbac'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Lock } from 'lucide-react'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  role?: Role
  roles?: Role[]
  fallback?: ReactNode
  showError?: boolean
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback,
  showError = true
}: PermissionGuardProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isSuperAdmin, 
    isOrgAdmin, 
    isUser,
    isLoading 
  } = useAuthContext()

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check role permissions
  let hasRolePermission = true
  if (role) {
    hasRolePermission = 
      (role === 'super_admin' && isSuperAdmin()) ||
      (role === 'org_admin' && isOrgAdmin()) ||
      (role === 'user' && isUser())
  } else if (roles && roles.length > 0) {
    hasRolePermission = roles.some(r => 
      (r === 'super_admin' && isSuperAdmin()) ||
      (r === 'org_admin' && isOrgAdmin()) ||
      (r === 'user' && isUser())
    )
  }

  // Check specific permissions
  let hasSpecificPermission = true
  if (permission) {
    hasSpecificPermission = hasPermission(permission)
  } else if (permissions && permissions.length > 0) {
    hasSpecificPermission = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  // Check if user has required permissions
  const hasAccess = hasRolePermission && hasSpecificPermission

  // Show fallback or error if no access
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showError) {
      return null
    }

    return (
      <div className="flex items-center justify-center p-8">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this resource.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
