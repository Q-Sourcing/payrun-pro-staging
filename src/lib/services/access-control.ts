import { 
  UserRole, 
  Permission, 
  User, 
  PermissionCheck, 
  AccessControl,
  ROLE_DEFINITIONS,
  hasPermission,
  canAccessResource
} from '@/lib/types/roles';

export class AccessControlService {
  private currentUser: User | null = null;

  constructor(user?: User) {
    if (user) {
      this.currentUser = user;
    }
  }

  /**
   * Set the current user for access control checks
   */
  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    const hasAccess = hasPermission(this.currentUser.role, permission);
    
    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : `Role '${this.currentUser.role}' does not have permission '${permission}'`
    };
  }

  /**
   * Check if user can view a specific resource
   */
  canView(resource: string, context?: any): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    // Check basic access
    if (!canAccessResource(this.currentUser.role, resource, context)) {
      return {
        hasPermission: false,
        reason: `Role '${this.currentUser.role}' cannot access '${resource}'`
      };
    }

    // Check specific permissions based on resource type
    let requiredPermission: Permission;
    switch (resource) {
      case 'employees':
        requiredPermission = this.getEmployeeViewPermission();
        break;
      case 'payroll':
        requiredPermission = 'view_financial_reports';
        break;
      case 'reports':
        requiredPermission = this.getReportViewPermission();
        break;
      case 'system':
        requiredPermission = 'system_configuration';
        break;
      default:
        return {
          hasPermission: false,
          reason: `Unknown resource type: ${resource}`
        };
    }

    return this.hasPermission(requiredPermission);
  }

  /**
   * Check if user can edit a specific resource
   */
  canEdit(resource: string, context?: any): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    // Check basic access
    if (!canAccessResource(this.currentUser.role, resource, context)) {
      return {
        hasPermission: false,
        reason: `Role '${this.currentUser.role}' cannot access '${resource}'`
      };
    }

    // Check specific permissions based on resource type
    let requiredPermission: Permission;
    switch (resource) {
      case 'employees':
        requiredPermission = this.getEmployeeEditPermission();
        break;
      case 'payroll':
        requiredPermission = 'process_payroll';
        break;
      case 'system':
        requiredPermission = 'system_configuration';
        break;
      default:
        return {
          hasPermission: false,
          reason: `Unknown resource type: ${resource}`
        };
    }

    return this.hasPermission(requiredPermission);
  }

  /**
   * Check if user can delete a specific resource
   */
  canDelete(resource: string, context?: any): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    // Only super admins can delete records
    if (this.currentUser.role !== 'super_admin') {
      return {
        hasPermission: false,
        reason: 'Only super administrators can delete records'
      };
    }

    return this.hasPermission('delete_records');
  }

  /**
   * Check if user can approve a specific resource
   */
  canApprove(resource: string, context?: any): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    let requiredPermission: Permission;
    switch (resource) {
      case 'payroll':
        requiredPermission = 'approve_payroll';
        break;
      case 'expenses':
        requiredPermission = 'approve_expenses';
        break;
      case 'leave':
        requiredPermission = 'approve_leave';
        break;
      case 'overtime':
        requiredPermission = 'approve_overtime';
        break;
      default:
        return {
          hasPermission: false,
          reason: `Unknown approval resource: ${resource}`
        };
    }

    return this.hasPermission(requiredPermission);
  }

  /**
   * Check if user can export data
   */
  canExport(resource: string, context?: any): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    // Check if user has export permission
    const exportCheck = this.hasPermission('export_data');
    if (!exportCheck.hasPermission) {
      return exportCheck;
    }

    // Check if user can view the resource they want to export
    return this.canView(resource, context);
  }

  /**
   * Get user's accessible data scope
   */
  getDataScope(resource: string): 'all' | 'organization' | 'department' | 'own' | 'none' {
    if (!this.currentUser) {
      return 'none';
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    switch (resource) {
      case 'employees':
        return roleDef.canAccess.employees;
      case 'payroll':
        return roleDef.canAccess.payroll === 'process' || roleDef.canAccess.payroll === 'approve' ? 'organization' : 'none';
      case 'reports':
        return roleDef.canAccess.reports === 'all' ? 'all' : 
               roleDef.canAccess.reports === 'financial' ? 'organization' :
               roleDef.canAccess.reports === 'department' ? 'department' :
               roleDef.canAccess.reports === 'own' ? 'own' : 'none';
      default:
        return 'none';
    }
  }

  /**
   * Check if user can access specific employee data
   */
  canAccessEmployee(employeeId: string, context?: { organizationId?: string; departmentId?: string }): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    // Super admin can access all employees
    if (roleDef.canAccess.employees === 'all') {
      return { hasPermission: true };
    }

    // Employee can only access their own data
    if (roleDef.canAccess.employees === 'own') {
      if (this.currentUser.id === employeeId) {
        return { hasPermission: true };
      } else {
        return {
          hasPermission: false,
          reason: 'Employees can only access their own data'
        };
      }
    }

    // Organization and department level access
    if (roleDef.canAccess.employees === 'organization' || roleDef.canAccess.employees === 'department') {
      // This would require checking the employee's organization/department
      // For now, we'll assume they have access if they have the permission
      return this.hasPermission('view_organization_employees');
    }

    return {
      hasPermission: false,
      reason: 'Insufficient permissions to access employee data'
    };
  }

  /**
   * Get dashboard sections accessible to user
   */
  getAccessibleDashboardSections(): string[] {
    if (!this.currentUser) {
      return [];
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    return roleDef.dashboardSections;
  }

  /**
   * Get user's role restrictions
   */
  getUserRestrictions(): string[] {
    if (!this.currentUser) {
      return [];
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    return roleDef.restrictions;
  }

  /**
   * Check if user can perform bulk operations
   */
  canPerformBulkOperations(): PermissionCheck {
    return this.hasPermission('bulk_operations');
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): PermissionCheck {
    if (!this.currentUser) {
      return {
        hasPermission: false,
        reason: 'No user logged in'
      };
    }

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    if (roleDef.canAccess.users === 'all') {
      return this.hasPermission('manage_users');
    } else if (roleDef.canAccess.users === 'organization') {
      return this.hasPermission('manage_organization_users');
    } else if (roleDef.canAccess.users === 'department') {
      return this.hasPermission('manage_department_users');
    }

    return {
      hasPermission: false,
      reason: 'User does not have permission to manage users'
    };
  }

  /**
   * Get employee view permission based on role
   */
  private getEmployeeViewPermission(): Permission {
    if (!this.currentUser) return 'view_own_data';

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    switch (roleDef.canAccess.employees) {
      case 'all':
        return 'view_all_employees';
      case 'organization':
        return 'view_organization_employees';
      case 'department':
        return 'view_department_employees';
      case 'own':
        return 'view_own_data';
      default:
        return 'view_own_data';
    }
  }

  /**
   * Get employee edit permission based on role
   */
  private getEmployeeEditPermission(): Permission {
    if (!this.currentUser) return 'edit_own_data';

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    switch (roleDef.canAccess.employees) {
      case 'all':
        return 'edit_all_employees';
      case 'organization':
        return 'edit_organization_employees';
      case 'department':
        return 'edit_department_employees';
      case 'own':
        return 'edit_own_data';
      default:
        return 'edit_own_data';
    }
  }

  /**
   * Get report view permission based on role
   */
  private getReportViewPermission(): Permission {
    if (!this.currentUser) return 'view_own_reports';

    const roleDef = ROLE_DEFINITIONS[this.currentUser.role];
    
    switch (roleDef.canAccess.reports) {
      case 'all':
        return 'view_financial_reports';
      case 'financial':
        return 'view_financial_reports';
      case 'department':
        return 'view_department_reports';
      case 'own':
        return 'view_own_reports';
      default:
        return 'view_own_reports';
    }
  }

  /**
   * Create access control object for a user
   */
  createAccessControl(user: User): AccessControl {
    const service = new AccessControlService(user);
    
    return {
      canView: (resource: string, context?: any) => service.canView(resource, context).hasPermission,
      canEdit: (resource: string, context?: any) => service.canEdit(resource, context).hasPermission,
      canDelete: (resource: string, context?: any) => service.canDelete(resource, context).hasPermission,
      canApprove: (resource: string, context?: any) => service.canApprove(resource, context).hasPermission,
      canExport: (resource: string, context?: any) => service.canExport(resource, context).hasPermission
    };
  }
}

// Global access control instance
export const accessControl = new AccessControlService();
