import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { User, UserRole, Permission } from '@/lib/types/roles';
import { ROLE_DEFINITIONS } from '@/lib/types/roles';

interface UserManagementGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  fallbackComponent?: React.ReactNode;
  onUnauthorized?: () => void;
}

// Helper function to convert Supabase profile to our User type
const convertProfileToUser = (profile: any, supabaseUser: any): User | null => {
  if (!supabaseUser) return null;

  // Handle mixed profile shapes (legacy array vs new singular role)
  let primaryRole: UserRole = 'SELF_USER';

  // SUPER ADMIN FALLBACK: Check email whitelist first
  // This matches logic in use-user-role.ts
  const SUPER_ADMIN_EMAILS = ['nalungukevin@gmail.com'];
  if (SUPER_ADMIN_EMAILS.includes(supabaseUser.email || '')) {
    primaryRole = 'PLATFORM_SUPER_ADMIN';
  } else if (profile?.role) {
    // New profile shape
    primaryRole = profile.role as UserRole;
  } else if (profile?.roles && Array.isArray(profile.roles)) {
    // Legacy profile shape
    primaryRole = profile.roles[0] as UserRole;
  } else {
    // Fallback if no profile or role found
    const appRole = supabaseUser.app_metadata?.role || supabaseUser.user_metadata?.role;
    if (appRole === 'PLATFORM_SUPER_ADMIN' || appRole === 'super_admin') primaryRole = 'PLATFORM_SUPER_ADMIN';
  }

  // Fallback for names
  const firstName = profile?.first_name || supabaseUser.user_metadata?.first_name || '';
  const lastName = profile?.last_name || supabaseUser.user_metadata?.last_name || '';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName,
    lastName,
    role: primaryRole,
    organizationId: profile?.organization_id || supabaseUser.user_metadata?.organization_id || null,
    managerId: null,
    isActive: true,
    lastLogin: supabaseUser.last_sign_in_at || new Date().toISOString(),
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    updatedAt: profile?.updated_at || supabaseUser.updated_at || new Date().toISOString(),
    permissions: ROLE_DEFINITIONS[primaryRole]?.permissions || [],
    restrictions: [],
    twoFactorEnabled: false,
    sessionTimeout: 480
  };
};

export function UserManagementGuard({
  children,
  requiredRole,
  requiredPermission,
  fallbackComponent,
  onUnauthorized
}: UserManagementGuardProps) {
  const { user, profile } = useSupabaseAuth();

  // Convert Supabase profile to our User type
  const convertedUser = convertProfileToUser(profile, user);

  // Check if user is authenticated
  if (!user || !convertedUser) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            You must be logged in to access this section.
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check role-based access
  if (requiredRole && !hasRequiredRole(convertedUser, requiredRole)) {
    const defaultFallback = (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Insufficient Role</h3>
          <p className="text-muted-foreground mb-4">
            You need <strong>{ROLE_DEFINITIONS[requiredRole].name}</strong> role or higher to access this section.
            <br />
            Your current role: <strong>{ROLE_DEFINITIONS[convertedUser.role].name}</strong>
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={onUnauthorized}>
              Contact Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    );

    return fallbackComponent || defaultFallback;
  }

  // Check permission-based access
  if (requiredPermission && !hasRequiredPermission(convertedUser, requiredPermission)) {
    const defaultFallback = (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Permission Denied</h3>
          <p className="text-muted-foreground mb-4">
            You don't have the required permission to access this section.
            <br />
            Required: <strong>{requiredPermission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={onUnauthorized}>
              Request Access
            </Button>
          </div>
        </CardContent>
      </Card>
    );

    return fallbackComponent || defaultFallback;
  }

  // Check user management specific permissions
  if (!canAccessUserManagement(convertedUser)) {
    const defaultFallback = (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            Only super administrators and organization administrators can access user management.
            <br />
            Your current role: <strong>{ROLE_DEFINITIONS[convertedUser.role].name}</strong>
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );

    return fallbackComponent || defaultFallback;
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Check if user has the required role or higher
 */
function hasRequiredRole(user: User, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'PLATFORM_SUPER_ADMIN': 100,
    'PLATFORM_AUDITOR': 90,
    'ORG_ADMIN': 80,
    'ORG_HR_ADMIN': 70,
    'ORG_FINANCE_CONTROLLER': 75,
    'ORG_AUDITOR': 60,
    'ORG_VIEWER': 10,
    'COMPANY_PAYROLL_ADMIN': 50,
    'COMPANY_HR': 45,
    'COMPANY_VIEWER': 5,
    'PROJECT_MANAGER': 40,
    'PROJECT_PAYROLL_OFFICER': 35,
    'PROJECT_VIEWER': 2,
    'SELF_USER': 1,
    'SELF_CONTRACTOR': 1
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Check if user has the required permission
 */
function hasRequiredPermission(user: User, requiredPermission: Permission): boolean {
  const roleDefinition = ROLE_DEFINITIONS[user.role];
  return roleDefinition.permissions.includes(requiredPermission);
}

/**
 * Check if user can access user management features
 */
function canAccessUserManagement(user: User): boolean {
  return user.role === 'PLATFORM_SUPER_ADMIN' || user.role === 'ORG_ADMIN';
}

/**
 * Check if user can create users with specific role
 */
export function canCreateUserWithRole(currentUser: User, targetRole: UserRole): boolean {
  // Super admins can create anyone
  if (currentUser.role === 'PLATFORM_SUPER_ADMIN') return true;

  // Organization admins can create users up to their level
  if (currentUser.role === 'ORG_ADMIN') {
    const roleHierarchy: Record<string, number> = {
      'PLATFORM_SUPER_ADMIN': 100,
      'ORG_ADMIN': 80,
      'ORG_HR_ADMIN': 70,
      'ORG_FINANCE_CONTROLLER': 75,
      'ORG_AUDITOR': 60,
      'COMPANY_PAYROLL_ADMIN': 50,
      'COMPANY_HR': 45,
      'SELF_USER': 1
    };

    return (roleHierarchy[targetRole] || 0) <= (roleHierarchy[currentUser.role] || 0);
  }

  return false;
}

/**
 * Check if user can edit another user
 */
export function canEditUser(currentUser: User, targetUser: User): boolean {
  // Super admins can edit anyone
  if (currentUser.role === 'PLATFORM_SUPER_ADMIN') return true;

  // Organization admins can edit users in their organization
  if (currentUser.role === 'ORG_ADMIN') {
    return currentUser.organizationId === targetUser.organizationId;
  }

  return false;
}

/**
 * Check if user can delete another user
 */
export function canDeleteUser(currentUser: User, targetUser: User): boolean {
  // Super admins can delete anyone
  if (currentUser.role === 'PLATFORM_SUPER_ADMIN') return true;

  // Organization admins can delete users in their organization (except super admins)
  if (currentUser.role === 'ORG_ADMIN') {
    return currentUser.organizationId === targetUser.organizationId &&
      targetUser.role !== 'PLATFORM_SUPER_ADMIN';
  }

  return false;
}

/**
 * Get user's accessible roles for user creation
 */
export function getAccessibleRolesForCreation(user: User): UserRole[] {
  if (user.role === 'PLATFORM_SUPER_ADMIN') {
    return Object.keys(ROLE_DEFINITIONS) as UserRole[];
  }

  if (user.role === 'ORG_ADMIN') {
    return ['ORG_ADMIN', 'ORG_HR_ADMIN', 'ORG_FINANCE_CONTROLLER', 'COMPANY_PAYROLL_ADMIN', 'COMPANY_HR', 'SELF_USER'];
  }

  return [];
}

/**
 * Get user's accessible permissions for editing
 */
export function getAccessiblePermissions(user: User): Permission[] {
  const roleDefinition = ROLE_DEFINITIONS[user.role];
  return roleDefinition.permissions;
}
