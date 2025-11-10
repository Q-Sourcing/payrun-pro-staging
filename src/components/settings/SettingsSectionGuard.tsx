import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { ROLE_DEFINITIONS, type UserRole } from '@/lib/types/roles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingsSectionGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * Component to guard settings sections based on role and permissions
 * Super admins have access to all settings
 */
export function SettingsSectionGuard({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
  showError = true,
}: SettingsSectionGuardProps) {
  const { role, isSuperAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Super admin has access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!role) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You must be logged in to access settings.</AlertDescription>
      </Alert>
    );
  }

  const roleDefinition = ROLE_DEFINITIONS[role];
  const roleLevel = roleDefinition.level;

  // Check role requirements
  let hasRoleAccess = true;
  if (requiredRole) {
    const requiredRoleLevel = ROLE_DEFINITIONS[requiredRole].level;
    hasRoleAccess = roleLevel >= requiredRoleLevel;
  } else if (requiredRoles && requiredRoles.length > 0) {
    if (requireAll) {
      hasRoleAccess = requiredRoles.every(r => roleLevel >= ROLE_DEFINITIONS[r].level);
    } else {
      hasRoleAccess = requiredRoles.some(r => roleLevel >= ROLE_DEFINITIONS[r].level);
    }
  }

  // Check permission requirements
  let hasPermissionAccess = true;
  if (requiredPermission) {
    hasPermissionAccess = roleDefinition.permissions.includes(requiredPermission as any);
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    if (requireAll) {
      hasPermissionAccess = requiredPermissions.every(p => 
        roleDefinition.permissions.includes(p as any)
      );
    } else {
      hasPermissionAccess = requiredPermissions.some(p => 
        roleDefinition.permissions.includes(p as any)
      );
    }
  }

  const hasAccess = hasRoleAccess && hasPermissionAccess;

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showError) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this settings section.
              {requiredRole && ` Required role: ${ROLE_DEFINITIONS[requiredRole].name}`}
              {requiredRoles && requiredRoles.length > 0 && (
                <span> Required roles: {requiredRoles.map(r => ROLE_DEFINITIONS[r].name).join(', ')}</span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

