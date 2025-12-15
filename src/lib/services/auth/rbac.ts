import { JWTClaimsService, UserContext } from './jwt-claims'

export type Scope = 'global' | 'organization' | 'project' | 'head_office'

export type Permission =
  // --- Admin permissions ---
  | 'admin.dashboard'
  | 'admin.impersonate'
  | 'admin.organizations.manage'
  | 'admin.users.manage'
  | 'admin.system.settings'
  | 'admin.activity_logs.view'

  // --- Organization permissions ---
  | 'organizations.view'
  | 'organizations.manage'
  | 'organizations.users.manage'

  // --- Company permissions ---
  | 'companies.view'
  | 'companies.manage'
  | 'companies.company_units.manage'

  // --- NEW DOMAIN-AWARE PERMISSIONS ---

  // People (Head Office & Projects)
  | 'people.view'
  | 'people.create_head_office'
  | 'people.create_project'
  | 'people.edit'
  | 'people.view_sensitive'

  // Projects
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.assign_people'

  // Pay Groups
  | 'paygroups.view'
  | 'paygroups.create'
  | 'paygroups.edit'
  | 'paygroups.assign_people'
  | 'paygroups.assign_projects'

  // Payroll (Unified Actions)
  | 'payroll.view'         // View pay runs / dashboard
  | 'payroll.prepare'      // Create/calculate
  | 'payroll.submit'       // Submit for approval
  | 'payroll.approve'      // Approve step
  | 'payroll.run'          // Process payment
  | 'payroll.export'       // Bank/Tax exports
  | 'payroll.finalize'     // Close period

  // Reports
  | 'reports.view'
  | 'reports.export'

  // --- LEGACY COMPATIBILITY (Keep until migration complete) ---

  // Payroll permissions (Legacy)
  | 'payroll.manage'
  | 'payroll.payruns.create'
  | 'payroll.payruns.approve'
  | 'payroll.payruns.process'
  | 'payroll.reports.view'
  | 'payroll.reports.export'

  // Employee permissions (Legacy)
  | 'employees.view'
  | 'employees.manage'
  | 'employees.create'
  | 'employees.update'
  | 'employees.delete'
  | 'employees.assign_paygroup'

  // Pay group permissions (Legacy)
  | 'paygroups.manage' // Missing legacy key
  | 'paygroups.update' // Missing legacy key
  | 'paygroups.delete' // in case specific key needed

  // Settings permissions
  | 'settings.view'
  | 'settings.manage'
  | 'settings.organization'
  | 'settings.security'

export type Role = 'super_admin' | 'org_admin' | 'hr_admin' | 'project_manager' | 'project_payroll_officer' | 'head_office_admin' | 'finance_approver' | 'user' | 'viewer'

export interface RolePermissions {
  role: Role
  permissions: Permission[]
  allowedScopes: Scope[]
  description: string
}

export class RBACService {
  private static readonly ROLE_PERMISSIONS: RolePermissions[] = [
    {
      role: 'super_admin',
      permissions: [
        // ... (all permissions)
        'admin.dashboard', 'admin.impersonate', 'admin.organizations.manage', 'admin.users.manage', 'admin.system.settings', 'admin.activity_logs.view',
        'organizations.view', 'organizations.manage', 'organizations.users.manage',
        'companies.view', 'companies.manage', 'companies.company_units.manage',
        'payroll.view', 'payroll.manage', 'payroll.payruns.create', 'payroll.payruns.approve', 'payroll.payruns.process', 'payroll.reports.view', 'payroll.reports.export',
        'employees.view', 'employees.manage', 'employees.create', 'employees.update', 'employees.delete', 'employees.assign_paygroup',
        'paygroups.view', 'paygroups.manage', 'paygroups.create', 'paygroups.update', 'paygroups.delete',
        'settings.view', 'settings.manage', 'settings.organization', 'settings.security',
        'people.view', 'people.create_head_office', 'people.create_project', 'people.edit', 'people.view_sensitive',
        'projects.view', 'projects.create', 'projects.edit', 'projects.assign_people',
        'payroll.prepare', 'payroll.submit', 'payroll.approve', 'payroll.run', 'payroll.export', 'payroll.finalize',
        'reports.view', 'reports.export'
      ],
      allowedScopes: ['global', 'organization', 'head_office', 'project'],
      description: 'System Super Administrator'
    },
    {
      role: 'org_admin',
      permissions: [
        'organizations.view', 'organizations.users.manage',
        'companies.view', 'companies.manage', 'companies.company_units.manage',
        'settings.view', 'settings.manage', 'settings.organization',
        'people.view', 'people.create_head_office', 'people.create_project', 'people.edit', 'people.view_sensitive',
        'projects.view', 'projects.create', 'projects.edit', 'projects.assign_people',
        'paygroups.view', 'paygroups.create', 'paygroups.edit', 'paygroups.assign_people', 'paygroups.assign_projects',
        'payroll.view', 'payroll.prepare', 'payroll.submit', 'payroll.approve', 'payroll.run', 'payroll.export', 'payroll.finalize',
        'reports.view', 'reports.export'
      ],
      allowedScopes: ['organization', 'head_office', 'project'],
      description: 'Organization Administrator'
    },
    {
      role: 'hr_admin',
      permissions: [
        'people.view', 'people.create_head_office', 'people.create_project', 'people.edit', 'people.view_sensitive',
        'projects.view', 'projects.assign_people',
        'paygroups.view', 'paygroups.assign_people', 'paygroups.assign_projects',
        'employees.view', 'employees.manage', 'employees.create', 'employees.update'
      ],
      allowedScopes: ['organization', 'head_office', 'project'],
      description: 'HR Administrator - Can manage employees and assignments'
    },
    {
      role: 'project_manager',
      permissions: [
        'people.view', 'people.create_project', 'people.edit',
        'projects.view', 'projects.edit', 'projects.assign_people',
        'paygroups.view', 'paygroups.assign_people',
        'payroll.view', 'payroll.prepare', 'payroll.submit', 'payroll.export',
        'reports.view'
      ],
      allowedScopes: ['project'],
      description: 'Project Manager - Manages project-specific employees and payroll preparation'
    },
    {
      role: 'project_payroll_officer',
      permissions: [
        'people.view',
        'projects.view',
        'paygroups.view',
        'payroll.view', 'payroll.prepare', 'payroll.reports.view'
      ],
      allowedScopes: ['project'],
      description: 'Project Payroll Officer - Can prepare payroll for projects'
    },
    {
      role: 'head_office_admin',
      permissions: [
        'people.view', 'people.create_head_office', 'people.edit', 'people.view_sensitive',
        'paygroups.view', 'paygroups.create', 'paygroups.edit', 'paygroups.assign_people',
        'payroll.view', 'payroll.prepare', 'payroll.submit', 'payroll.run', 'payroll.export',
        'reports.view', 'reports.export'
      ],
      allowedScopes: ['head_office'],
      description: 'Head Office Administrator - Manages head office payroll and employees'
    },
    {
      role: 'finance_approver',
      permissions: [
        'payroll.view', 'payroll.approve', 'payroll.finalize', 'payroll.export',
        'reports.view', 'reports.export',
        'people.view', 'people.view_sensitive'
      ],
      allowedScopes: ['organization'],
      description: 'Finance Approver - Approves and finalizes payroll'
    },
    {
      role: 'viewer',
      permissions: [
        'people.view',
        'projects.view',
        'paygroups.view',
        'payroll.view',
        'reports.view'
      ],
      allowedScopes: ['organization'],
      description: 'Read-only access'
    },
    {
      role: 'user', // Legacy/Default
      permissions: [
        'payroll.view',
        'employees.view',
        'paygroups.view',
        'settings.view',
        'people.view',
        'reports.view'
      ],
      allowedScopes: ['global', 'organization'], // Default to allow viewing?
      description: 'Standard User'
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
   * Get all allowed scopes for a role
   */
  static getScopesForRole(role: Role): Scope[] {
    const roleConfig = this.ROLE_PERMISSIONS.find(r => r.role === role)
    return roleConfig?.allowedScopes || []
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
   * Check if current user has a permission within a specific scope
   */
  static hasScopedPermission(permission: Permission, requiredScope: Scope): boolean {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return false
    return this.roleHasScopedPermission(context.role, permission, requiredScope)
  }

  /**
   * Check if a role has a permission within a specific scope
   */
  static roleHasScopedPermission(role: Role, permission: Permission, requiredScope: Scope): boolean {
    // 1. Check if role has the abstract permission
    if (!this.roleHasPermission(role, permission)) return false

    // 2. Check if role allows the requested scope
    const allowedScopes = this.getScopesForRole(role)

    // 'global' scope implies access to all scopes
    if (allowedScopes.includes('global')) return true;

    // Direct match
    if (allowedScopes.includes(requiredScope)) return true;

    // 'organization' scope implies full access within the org
    if (allowedScopes.includes('organization')) return true;

    return false
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
   * Get all scopes for current user
   */
  static getCurrentUserScopes(): Scope[] {
    const context = JWTClaimsService.getCurrentUserContext()
    if (!context) return []

    return this.getScopesForRole(context.role)
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
        'companies.company_units.manage'
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
