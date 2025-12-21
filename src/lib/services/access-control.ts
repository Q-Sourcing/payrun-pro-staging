import {
  UserRole,
  Permission,
  User,
  PermissionCheck,
  AccessControl,
  ROLE_DEFINITIONS
} from '@/lib/types/roles';
import { RBACService } from '@/lib/services/auth/rbac';

/**
 * AccessControlService (Legacy Wrapper for OBAC)
 * This service is becoming a wrapper around RBACService and JWTClaimsService.
 * Most new code should use RBACService directly.
 */
export class AccessControlService {
  private currentUser: User | null = null;

  constructor(user?: User) {
    if (user) {
      this.currentUser = user;
    }
  }

  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): PermissionCheck {
    const hasAccess = RBACService.hasPermission(permission as any);

    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : `User does not have permission '${permission}'`
    };
  }

  /**
   * Check if user can view a specific resource
   */
  canView(resource: string, context?: any): PermissionCheck {
    let p: string = '';
    let scopeType: any = 'GLOBAL';
    let scopeId = context?.organizationId || context?.companyId || context?.projectId;

    switch (resource) {
      case 'employees':
      case 'people':
        p = 'people.view';
        break;
      case 'payroll':
        p = 'payroll.view';
        break;
      case 'reports':
        p = 'reports.view';
        break;
      case 'projects':
        p = 'projects.view';
        break;
      default:
        p = resource + '.view';
    }

    const hasAccess = RBACService.hasScopedPermission(p, scopeType, scopeId);

    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : `Access denied for resource: ${resource}`
    };
  }

  /**
   * Check if user can edit a specific resource
   */
  canEdit(resource: string, context?: any): PermissionCheck {
    let p: string = '';
    switch (resource) {
      case 'employees':
      case 'people':
        p = 'people.edit';
        break;
      case 'payroll':
        p = 'payroll.prepare';
        break;
      default:
        p = resource + '.edit';
    }

    const hasAccess = RBACService.hasPermission(p);

    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : `Edit denied for resource: ${resource}`
    };
  }

  /**
   * Check if user can delete a specific resource
   */
  canDelete(resource: string, context?: any): PermissionCheck {
    const hasAccess = RBACService.isPlatformAdmin();
    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : 'Only platform administrators can delete records'
    };
  }

  /**
   * Check if user can approve a specific resource
   */
  canApprove(resource: string, context?: any): PermissionCheck {
    let p = 'payroll.approve';
    if (resource !== 'payroll') p = `${resource}.approve`;

    const hasAccess = RBACService.hasPermission(p);
    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : `Approval denied for: ${resource}`
    };
  }

  canExport(resource: string, context?: any): PermissionCheck {
    const hasAccess = RBACService.hasPermission('reports.export') || RBACService.hasPermission('payroll.export');
    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : 'Export denied'
    };
  }

  /**
   * Map legacy data scopes to new OBAC concepts
   */
  getDataScope(resource: string): 'all' | 'organization' | 'department' | 'own' | 'none' {
    if (RBACService.isPlatformAdmin()) return 'all';

    const roles = RBACService.getCurrentUserRoles();
    const hasOrgAccess = roles.some(r => r.scope_type === 'ORGANIZATION');
    const hasProjectAccess = roles.some(r => r.scope_type === 'PROJECT');

    if (hasOrgAccess) return 'organization';
    if (hasProjectAccess) return 'department';

    return 'own';
  }

  getAccessibleDashboardSections(): string[] {
    const sections = ['overview'];
    if (RBACService.hasPermission('reports.view')) sections.push('reports');
    if (RBACService.hasPermission('analytics.view')) sections.push('analytics');
    if (RBACService.isOrgAdmin()) sections.push('activity');
    return sections;
  }

  getUserRestrictions(): string[] {
    // In the new OBAC system, restrictions are implicitly handled by the absence of permissions.
    // For UI compatibility, we return an empty array or can map specific deny-grants if implemented.
    return [];
  }

  canManageUsers(): PermissionCheck {
    const hasAccess = RBACService.hasPermission('admin.manage_users');
    return {
      hasPermission: hasAccess,
      reason: hasAccess ? undefined : 'User does not have permission to manage users'
    };
  }

  createAccessControl(user: User): AccessControl {
    return {
      canView: (resource: string, context?: any) => this.canView(resource, context).hasPermission,
      canEdit: (resource: string, context?: any) => this.canEdit(resource, context).hasPermission,
      canDelete: (resource: string, context?: any) => this.canDelete(resource, context).hasPermission,
      canApprove: (resource: string, context?: any) => this.canApprove(resource, context).hasPermission,
      canExport: (resource: string, context?: any) => this.canExport(resource, context).hasPermission
    };
  }
}

export const accessControl = new AccessControlService();
