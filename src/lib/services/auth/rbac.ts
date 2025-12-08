import { JWTClaimsService, UserContext } from './jwt-claims'

export type Permission = 
  // Admin permissions
  | 'admin.dashboard'
  | 'admin.impersonate'
  | 'admin.organizations.manage'
  | 'admin.users.manage'
  | 'admin.system.settings'
  | 'admin.activity_logs.view'
  
  // Organization permissions
  | 'organizations.view'
  | 'organizations.manage'
  | 'organizations.users.manage'
  
  // Company permissions
  | 'companies.view'
  | 'companies.manage'
  | 'companies.company_units.manage'
  
  // Payroll permissions
  | 'payroll.view'
  | 'payroll.manage'
  | 'payroll.payruns.create'
  | 'payroll.payruns.approve'
  | 'payroll.payruns.process'
  | 'payroll.reports.view'
  | 'payroll.reports.export'
  
  // Employee permissions
  | 'employees.view'
  | 'employees.manage'
  | 'employees.create'
  | 'employees.update'
  | 'employees.delete'
  | 'employees.assign_paygroup'
  
  // Pay group permissions
  | 'paygroups.view'
  | 'paygroups.manage'
  | 'paygroups.create'
  | 'paygroups.update'
  | 'paygroups.delete'
  
  // Settings permissions
  | 'settings.view'
  | 'settings.manage'
  | 'settings.organization'
  | 'settings.security'

export type Role = 'super_admin' | 'org_admin' | 'user'

export interface RolePermissions {
  role: Role
  permissions: Permission[]
  description: string
}

export class RBACService {
  private static readonly ROLE_PERMISSIONS: RolePermissions[] = [
    {
      role: 'super_admin',
      permissions: [
        // All admin permissions
        'admin.dashboard',
        'admin.impersonate',
        'admin.organizations.manage',
        'admin.users.manage',
        'admin.system.settings',
        'admin.activity_logs.view',
        
        // All organization permissions
        'organizations.view',
        'organizations.manage',
        'organizations.users.manage',
        
        // All company permissions
        'companies.view',
        'companies.manage',
        'companies.org_units.manage',
        
        // All payroll permissions
        'payroll.view',
        'payroll.manage',
        'payroll.payruns.create',
        'payroll.payruns.approve',
        'payroll.payruns.process',
        'payroll.reports.view',
        'payroll.reports.export',
        
        // All employee permissions
        'employees.view',
        'employees.manage',
        'employees.create',
        'employees.update',
        'employees.delete',
        'employees.assign_paygroup',
        
        // All pay group permissions
        'paygroups.view',
        'paygroups.manage',
        'paygroups.create',
        'paygroups.update',
        'paygroups.delete',
        
        // All settings permissions
        'settings.view',
        'settings.manage',
        'settings.organization',
        'settings.security'
      ],
      description: 'Full system access with ability to manage all organizations and users'
    },
    {
      role: 'org_admin',
      permissions: [
        // Organization permissions
        'organizations.view',
        'organizations.users.manage',
        
        // Company permissions
        'companies.view',
        'companies.manage',
        'companies.org_units.manage',
        
        // Payroll permissions
        'payroll.view',
        'payroll.manage',
        'payroll.payruns.create',
        'payroll.payruns.approve',
        'payroll.payruns.process',
        'payroll.reports.view',
        'payroll.reports.export',
        
        // Employee permissions
        'employees.view',
        'employees.manage',
        'employees.create',
        'employees.update',
        'employees.delete',
        'employees.assign_paygroup',
        
        // Pay group permissions
        'paygroups.view',
        'paygroups.manage',
        'paygroups.create',
        'paygroups.update',
        'paygroups.delete',
        
        // Settings permissions
        'settings.view',
        'settings.manage',
        'settings.organization'
      ],
      description: 'Organization administrator with full access to their organization'
    },
    {
      role: 'user',
      permissions: [
        // Basic payroll permissions
        'payroll.view',
        'payroll.reports.view',
        
        // Basic employee permissions
        'employees.view',
        
        // Basic pay group permissions
        'paygroups.view',
        
        // Basic settings permissions
        'settings.view'
      ],
      description: 'Regular user with read-only access to payroll data'
    }
  ]

  /**
   * Get all permissions for a role
   */
  static getPermissionsForRole(role: Role): Permission[] {
    const roleConfig = this.ROLE_PERMISSIONS.find(r => r.role === role)
    return roleConfig?.permissions || []
  }

  /**
   * Get all role configurations
   */
  static getAllRoles(): RolePermissions[] {
    return this.ROLE_PERMISSIONS
  }

  /**
   * Check if a role has a specific permission
   */
  static roleHasPermission(role: Role, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role)
    return permissions.includes(permission)
  }

  /**
   * Check if current user has a specific permission
   */
  static hasPermission(permission: Permission): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false

    return this.roleHasPermission(context.role, permission)
  }

  /**
   * Check if current user has any of the specified permissions
   */
  static hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  /**
   * Check if current user has all of the specified permissions
   */
  static hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  /**
   * Get all permissions for current user
   */
  static getCurrentUserPermissions(): Permission[] {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return []

    return this.getPermissionsForRole(context.role)
  }

  /**
   * Check if current user can access a specific resource
   */
  static canAccessResource(resource: string, action: string = 'view'): boolean {
    const permission = `${resource}.${action}` as Permission
    return this.hasPermission(permission)
  }

  /**
   * Check if current user can manage a specific resource
   */
  static canManageResource(resource: string): boolean {
    return this.hasPermission(`${resource}.manage` as Permission)
  }

  /**
   * Check if current user can create a specific resource
   */
  static canCreateResource(resource: string): boolean {
    return this.hasPermission(`${resource}.create` as Permission)
  }

  /**
   * Check if current user can update a specific resource
   */
  static canUpdateResource(resource: string): boolean {
    return this.hasPermission(`${resource}.update` as Permission)
  }

  /**
   * Check if current user can delete a specific resource
   */
  static canDeleteResource(resource: string): boolean {
    return this.hasPermission(`${resource}.delete` as Permission)
  }

  /**
   * Get user's role display name
   */
  static getRoleDisplayName(role: Role): string {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator'
      case 'org_admin':
        return 'Organization Administrator'
      case 'user':
        return 'User'
      default:
        return 'Unknown Role'
    }
  }

  /**
   * Get user's role description
   */
  static getRoleDescription(role: Role): string {
    const roleConfig = this.ROLE_PERMISSIONS.find(r => r.role === role)
    return roleConfig?.description || 'No description available'
  }

  /**
   * Check if a role can be assigned by current user
   */
  static canAssignRole(targetRole: Role): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false

    // Super admin can assign any role
    if (context.role === 'super_admin') return true

    // Org admin can only assign user role
    if (context.role === 'org_admin' && targetRole === 'user') return true

    return false
  }

  /**
   * Check if current user can manage another user
   */
  static canManageUser(targetUserId: string, targetRole: Role): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false

    // Super admin can manage anyone
    if (context.role === 'super_admin') return true

    // Users can manage themselves
    if (context.userId === targetUserId) return true

    // Org admin can manage users in their organization
    if (context.role === 'org_admin' && targetRole === 'user') {
      // This would need additional logic to check if target user is in same org
      return true
    }

    return false
  }

  /**
   * Get permission groups for UI display
   */
  static getPermissionGroups(): Record<string, Permission[]> {
    const groups: Record<string, Permission[]> = {
      'Admin': [
        'admin.dashboard',
        'admin.impersonate',
        'admin.organizations.manage',
        'admin.users.manage',
        'admin.system.settings',
        'admin.activity_logs.view'
      ],
      'Organizations': [
        'organizations.view',
        'organizations.manage',
        'organizations.users.manage'
      ],
      'Companies': [
        'companies.view',
        'companies.manage',
        'companies.org_units.manage'
      ],
      'Payroll': [
        'payroll.view',
        'payroll.manage',
        'payroll.payruns.create',
        'payroll.payruns.approve',
        'payroll.payruns.process',
        'payroll.reports.view',
        'payroll.reports.export'
      ],
      'Employees': [
        'employees.view',
        'employees.manage',
        'employees.create',
        'employees.update',
        'employees.delete',
        'employees.assign_paygroup'
      ],
      'Pay Groups': [
        'paygroups.view',
        'paygroups.manage',
        'paygroups.create',
        'paygroups.update',
        'paygroups.delete'
      ],
      'Settings': [
        'settings.view',
        'settings.manage',
        'settings.organization',
        'settings.security'
      ]
    }

    return groups
  }
}
