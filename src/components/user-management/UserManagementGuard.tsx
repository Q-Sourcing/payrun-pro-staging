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
  if (!profile || !supabaseUser) return null;
  
  // Map the first role from the roles array to our UserRole type
  const primaryRole = profile.roles?.[0] as UserRole || 'employee';
  
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    role: primaryRole,
    organizationId: null,
    departmentId: null,
    managerId: null,
    isActive: true,
    lastLogin: supabaseUser.last_sign_in_at,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
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
  const roleHierarchy = {
    'super_admin': 10,
    'organization_admin': 8,
    'ceo_executive': 7,
    'payroll_manager': 6,
    'finance_controller': 5,
    'hr_business_partner': 4,
    'employee': 1
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
  return user.role === 'super_admin' || user.role === 'organization_admin';
}

/**
 * Check if user can create users with specific role
 */
export function canCreateUserWithRole(currentUser: User, targetRole: UserRole): boolean {
  // Super admins can create anyone
  if (currentUser.role === 'super_admin') return true;
  
  // Organization admins can create users up to their level
  if (currentUser.role === 'organization_admin') {
    const roleHierarchy = {
      'super_admin': 10,
      'organization_admin': 8,
      'ceo_executive': 7,
      'payroll_manager': 6,
      'finance_controller': 5,
      'hr_business_partner': 4,
      'employee': 1
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
  if (currentUser.role === 'super_admin') return true;
  
  // Organization admins can edit users in their organization
  if (currentUser.role === 'organization_admin') {
    return currentUser.organizationId === targetUser.organizationId;
  }
  
  return false;
}

/**
 * Check if user can delete another user
 */
export function canDeleteUser(currentUser: User, targetUser: User): boolean {
  // Super admins can delete anyone
  if (currentUser.role === 'super_admin') return true;
  
  // Organization admins can delete users in their organization (except super admins)
  if (currentUser.role === 'organization_admin') {
    return currentUser.organizationId === targetUser.organizationId && 
           targetUser.role !== 'super_admin';
  }
  
  return false;
}

/**
 * Get user's accessible roles for user creation
 */
export function getAccessibleRolesForCreation(user: User): UserRole[] {
  if (user.role === 'super_admin') {
    return Object.keys(ROLE_DEFINITIONS) as UserRole[];
  }
  
  if (user.role === 'organization_admin') {
    return ['organization_admin', 'ceo_executive', 'payroll_manager', 'finance_controller', 'hr_business_partner', 'employee'];
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
