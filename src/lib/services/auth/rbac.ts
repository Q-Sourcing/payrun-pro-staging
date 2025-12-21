import { JWTClaimsService } from './jwt-claims'

export type Scope = 'GLOBAL' | 'ORGANIZATION' | 'COMPANY' | 'PROJECT' | 'SELF'

export type Role =
  | 'PLATFORM_SUPER_ADMIN'
  | 'PLATFORM_AUDITOR'
  | 'ORG_ADMIN'
  | 'ORG_HR_ADMIN'
  | 'ORG_FINANCE_CONTROLLER'
  | 'ORG_AUDITOR'
  | 'ORG_VIEWER'
  | 'COMPANY_PAYROLL_ADMIN'
  | 'COMPANY_HR'
  | 'COMPANY_VIEWER'
  | 'PROJECT_MANAGER'
  | 'PROJECT_PAYROLL_OFFICER'
  | 'PROJECT_VIEWER'
  | 'SELF_USER'
  | 'SELF_CONTRACTOR'

export type Permission = string

export interface RolePermissions {
  role: Role
  permissions: Permission[]
  allowedScopes: Scope[]
  description: string
}

export class RBACService {
  /**
   * Check if current user has a specific permission
   */
  static hasPermission(permission: Permission): boolean {
    return JWTClaimsService.validatePermission(permission)
  }

  /**
   * Check if current user has a permission within a specific scope
   */
  static hasScopedPermission(permission: Permission, scopeType: Scope, scopeId?: string | null): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false

    // Platform Admins bypass everything
    if (context.isPlatformAdmin) return true

    // Check effective permissions from JWT
    if (!context.permissions.includes(permission)) return false

    // Check if user has an assignment matching the scope
    return context.roles.some(assignment => {
      // ORG SCOPING: Assignment must belong to the active organization OR be a platform-wide role
      const isPlatformRole = assignment.org_id === '00000000-0000-0000-0000-000000000000'
      const matchesCurrentOrg = assignment.org_id === context.organizationId

      if (!isPlatformRole && !matchesCurrentOrg) return false

      // GLOBAL assignment covers everything within the org
      if (assignment.scope_type === 'GLOBAL') return true

      // Exact scope match
      if (assignment.scope_type === scopeType && (assignment.scope_id === scopeId || !scopeId)) return true

      // Hierarchical check
      if (assignment.scope_type === 'ORGANIZATION' && ['COMPANY', 'PROJECT'].includes(scopeType as any)) return true
      if (assignment.scope_type === 'COMPANY' && scopeType === 'PROJECT') return true

      return false
    })
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
    return context?.permissions || []
  }

  /**
   * Get all role assignments for current user
   */
  static getCurrentUserRoles(): any[] {
    const context = JWTClaimsService.getCurrentUserContext()
    return context?.roles || []
  }

  /**
   * Get user's primary role for display
   */
  static getRoleDisplayName(role: string): string {
    return role.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')
  }

  /**
   * Check if a role can be assigned by current user
   */
  static canAssignRole(targetRole: Role): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false

    // Platform super admin can assign any role
    if (context.isPlatformAdmin) return true

    // Org admins can assign roles within their organization tier
    if (this.isOrgAdmin()) {
      return targetRole.startsWith('ORG_') || targetRole.startsWith('COMPANY_') || targetRole.startsWith('PROJECT_') || targetRole.startsWith('SELF_')
    }

    return false
  }

  /**
   * Check if current user can access a specific resource (convenience helper)
   */
  static canAccessResource(resource: string, action: string = 'view'): boolean {
    return this.hasPermission(`${resource}.${action}`)
  }

  /**
   * Check if user can manage a specific resource
   */
  static canManageResource(resource: string): boolean {
    return this.hasPermission(`${resource}.manage`) || this.isOrgAdmin()
  }

  /**
   * Check if user can create a specific resource
   */
  static canCreateResource(resource: string): boolean {
    return this.hasPermission(`${resource}.create`)
  }

  /**
   * Check if user can update a specific resource
   */
  static canUpdateResource(resource: string): boolean {
    return this.hasPermission(`${resource}.edit`) || this.hasPermission(`${resource}.update`)
  }

  /**
   * Check if user can delete a specific resource
   */
  static canDeleteResource(resource: string): boolean {
    return this.hasPermission(`${resource}.delete`)
  }

  /**
   * Helper: Check if user is platform super admin
   */
  static isPlatformAdmin(): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    return !!context?.isPlatformAdmin
  }

  /**
   * Helper: Check if user has ORG_ADMIN or higher
   */
  static isOrgAdmin(): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false
    return context.isPlatformAdmin || context.roles.some(r => r.role === 'ORG_ADMIN')
  }

  /**
   * Get permission groups for UI display (Categorized)
   */
  static getPermissionGroups(): Record<string, Permission[]> {
    return {
      'People': ['people.view', 'people.create', 'people.edit', 'people.view_sensitive', 'people.assign_project'],
      'Payroll': ['payroll.prepare', 'payroll.submit', 'payroll.approve', 'payroll.rollback', 'payroll.export_bank', 'payroll.export_mobile_money'],
      'Finance': ['finance.view_reports', 'finance.view_bank_details'],
      'Admin': ['admin.manage_users', 'admin.assign_roles', 'admin.impersonate']
    }
  }
}
