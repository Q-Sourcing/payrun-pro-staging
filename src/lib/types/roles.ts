// User Role System Types and Definitions

export type UserRole =
  | 'super_admin'
  | 'org_admin'
  | 'hr_admin'
  | 'project_manager'
  | 'project_payroll_officer'
  | 'head_office_admin'
  | 'finance_approver'
  | 'viewer'
  | 'user'
  // Legacy aliases (kept for backward compatibility during migration)
  | 'organization_admin'
  | 'ceo_executive'
  | 'payroll_manager'
  | 'hr_business_partner'
  | 'finance_controller'
  | 'employee';

export const ORG_SUPER_ADMIN = 'org_admin';

export type Permission =
  | 'view_all_employees'
  | 'view_organization_employees'
  | 'view_department_employees'
  | 'view_own_data'
  | 'edit_all_employees'
  | 'edit_organization_employees'
  | 'edit_department_employees'
  | 'edit_own_data'
  | 'process_payroll'
  | 'approve_payroll'
  | 'view_financial_reports'
  | 'view_executive_reports'
  | 'view_department_reports'
  | 'view_own_reports'
  | 'manage_users'
  | 'manage_organization_users'
  | 'manage_department_users'
  | 'system_configuration'
  | 'organization_configuration'
  | 'view_audit_logs'
  | 'manage_integrations'
  | 'view_system_health'
  | 'approve_expenses'
  | 'approve_leave'
  | 'approve_overtime'
  | 'manage_budgets'
  | 'view_sensitive_data'
  | 'export_data'
  | 'export_bank_schedule'
  | 'bulk_operations'
  | 'delete_records'
  // New Domain-Aware Permissions (from rbac.ts)
  | 'people.view'
  | 'people.create_head_office'
  | 'people.create_project'
  | 'people.edit'
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.assign_people'
  | 'paygroups.view'
  | 'paygroups.create'
  | 'paygroups.edit'
  | 'paygroups.assign_people'
  | 'payroll.view'
  | 'payroll.prepare'
  | 'payroll.submit'
  | 'payroll.approve'
  | 'payroll.run'
  | 'payroll.finalise'
  | 'reports.view'
  | 'reports.export'
  | 'payroll.export';

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  level: number; // Higher number = more permissions
  permissions: Permission[];
  restrictions: string[];
  visibleData: string[];
  dashboardSections: string[];
  canAccess: {
    employees: 'all' | 'organization' | 'department' | 'own' | 'none';
    payroll: 'process' | 'approve' | 'view' | 'none';
    reports: 'all' | 'financial' | 'department' | 'own' | 'none';
    system: 'full' | 'organization' | 'limited' | 'none';
    users: 'all' | 'organization' | 'department' | 'none';
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId?: string;
  departmentId?: string;
  managerId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  restrictions: string[];
  twoFactorEnabled: boolean;
  sessionTimeout: number; // minutes
}

export interface RoleAssignment {
  id: string;
  userId: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  reason: string;
}

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
  alternativeActions?: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  result: 'success' | 'failure' | 'denied';
}

export interface AccessControl {
  canView: (resource: string, context?: any) => boolean;
  canEdit: (resource: string, context?: any) => boolean;
  canDelete: (resource: string, context?: any) => boolean;
  canApprove: (resource: string, context?: any) => boolean;
  canExport: (resource: string, context?: any) => boolean;
}

// Role Definitions
// Role Definitions
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Ultimate system authority with unrestricted access across all organizations',
    level: 10,
    permissions: [
      'view_all_employees', 'edit_all_employees', 'process_payroll', 'approve_payroll', 'view_financial_reports',
      'manage_users', 'system_configuration', 'view_audit_logs', 'export_data', 'delete_records',
      'people.view', 'people.create_head_office', 'people.create_project', 'projects.view', 'projects.create',
      'payroll.run', 'reports.view'
    ],
    restrictions: [],
    visibleData: ['All Data'],
    dashboardSections: ['global_overview', 'system_health'],
    canAccess: { employees: 'all', payroll: 'process', reports: 'all', system: 'full', users: 'all' }
  },

  org_admin: {
    id: 'org_admin',
    name: 'Organization Administrator',
    description: 'Full control within a specific organization',
    level: 9,
    permissions: [
      'view_organization_employees', 'edit_organization_employees', 'process_payroll', 'approve_payroll',
      'manage_organization_users', 'organization_configuration', 'export_data',
      'people.view', 'people.create_head_office', 'people.create_project', 'projects.view', 'projects.create',
      'payroll.run', 'reports.view'
    ],
    restrictions: ['Cannot access other organizations'],
    visibleData: ['Organization Data'],
    dashboardSections: ['organization_overview'],
    canAccess: { employees: 'organization', payroll: 'process', reports: 'all', system: 'organization', users: 'organization' }
  },

  hr_admin: {
    id: 'hr_admin',
    name: 'HR Administrator',
    description: 'Manages employees, assignments, and HR data',
    level: 6,
    permissions: [
      'view_organization_employees', 'edit_organization_employees', 'manage_organization_users',
      'people.view', 'people.create_head_office', 'people.create_project', 'projects.assign_people'
    ],
    restrictions: ['Cannot process payroll'],
    visibleData: ['Employee Records'],
    dashboardSections: ['hr_overview'],
    canAccess: { employees: 'organization', payroll: 'none', reports: 'department', system: 'none', users: 'organization' }
  },

  project_manager: {
    id: 'project_manager',
    name: 'Project Manager',
    description: 'Manages project-specific employees and payroll preparation',
    level: 5,
    permissions: [
      'projects.view', 'projects.edit', 'projects.assign_people', 'payroll.prepare', 'reports.view'
    ],
    restrictions: ['Limited to assigned projects'],
    visibleData: ['Project Data'],
    dashboardSections: ['project_overview'],
    canAccess: { employees: 'department', payroll: 'process', reports: 'department', system: 'none', users: 'none' }
  },

  project_payroll_officer: {
    id: 'project_payroll_officer',
    name: 'Project Payroll Officer',
    description: 'Prepares payroll for projects',
    level: 4,
    permissions: [
      'projects.view', 'payroll.prepare', 'payroll.view'
    ],
    restrictions: ['Cannot approve payroll'],
    visibleData: ['Project Payroll Data'],
    dashboardSections: ['payroll_overview'],
    canAccess: { employees: 'none', payroll: 'process', reports: 'department', system: 'none', users: 'none' }
  },

  head_office_admin: {
    id: 'head_office_admin',
    name: 'Head Office Admin',
    description: 'Manages head office payroll and employees',
    level: 6,
    permissions: [
      'people.view', 'people.create_head_office', 'payroll.run', 'reports.view'
    ],
    restrictions: ['Head Office Context Only'],
    visibleData: ['Head Office Data'],
    dashboardSections: ['head_office_overview'],
    canAccess: { employees: 'organization', payroll: 'process', reports: 'all', system: 'none', users: 'none' }
  },

  finance_approver: {
    id: 'finance_approver',
    name: 'Finance Approver',
    description: 'Approves and finalizes payroll',
    level: 7,
    permissions: [
      'payroll.approve', 'payroll.finalise', 'payroll.export', 'reports.view'
    ],
    restrictions: ['Cannot edit employee data'],
    visibleData: ['Financial Reports'],
    dashboardSections: ['financial_overview'],
    canAccess: { employees: 'organization', payroll: 'approve', reports: 'all', system: 'none', users: 'none' }
  },

  viewer: {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to organization data',
    level: 2,
    permissions: [
      'people.view', 'projects.view', 'payroll.view', 'reports.view'
    ],
    restrictions: ['Read-only'],
    visibleData: ['Organization Data (Read-only)'],
    dashboardSections: ['organization_overview'],
    canAccess: { employees: 'organization', payroll: 'view', reports: 'all', system: 'none', users: 'none' }
  },

  user: {
    id: 'user',
    name: 'Standard User',
    description: 'Standard access',
    level: 1,
    permissions: ['people.view'],
    restrictions: ['Basic access'],
    visibleData: ['Own Data'],
    dashboardSections: ['personal_overview'],
    canAccess: { employees: 'own', payroll: 'none', reports: 'own', system: 'none', users: 'none' }
  },

  // --- Legacy Compatibility Wrappers ---
  organization_admin: {
    id: 'organization_admin',
    name: 'Organization Admin (Legacy)',
    description: 'Legacy role - please migrate to org_admin',
    level: 1,
    permissions: [],
    restrictions: ['Deprecated'],
    visibleData: [],
    dashboardSections: [],
    canAccess: { employees: 'none', payroll: 'none', reports: 'none', system: 'none', users: 'none' }
  },
  ceo_executive: {
    id: 'ceo_executive',
    name: 'CEO (Legacy)',
    description: 'Legacy role - please migrate to viewer or finance_approver',
    level: 1,
    permissions: [],
    restrictions: ['Deprecated'],
    visibleData: [],
    dashboardSections: [],
    canAccess: { employees: 'none', payroll: 'none', reports: 'none', system: 'none', users: 'none' }
  },
  payroll_manager: {
    id: 'payroll_manager',
    name: 'Payroll Manager (Legacy)',
    description: 'Legacy role - please migrate to appropriate payroll role',
    level: 1,
    permissions: [],
    restrictions: ['Deprecated'],
    visibleData: [],
    dashboardSections: [],
    canAccess: { employees: 'none', payroll: 'none', reports: 'none', system: 'none', users: 'none' }
  },
  employee: {
    id: 'employee',
    name: 'Employee (Legacy)',
    description: 'Legacy role - use user',
    level: 1,
    permissions: [],
    restrictions: ['Deprecated'],
    visibleData: [],
    dashboardSections: [],
    canAccess: { employees: 'none', payroll: 'none', reports: 'none', system: 'none', users: 'none' }
  },
  hr_business_partner: {
    id: 'hr_business_partner',
    name: 'HR Partner (Legacy)',
    description: 'Legacy role - please migrate to hr_admin',
    level: 1,
    permissions: [],
    restrictions: ['Deprecated'],
    visibleData: [],
    dashboardSections: [],
    canAccess: { employees: 'none', payroll: 'none', reports: 'none', system: 'none', users: 'none' }
  },
  finance_controller: {
    id: 'finance_controller',
    name: 'Finance Controller (Legacy)',
    description: 'Legacy role - please migrate to finance_approver',
    level: 1,
    permissions: [],
    restrictions: ['Deprecated'],
    visibleData: [],
    dashboardSections: [],
    canAccess: { employees: 'none', payroll: 'none', reports: 'none', system: 'none', users: 'none' }
  }
};

// Permission Matrix for quick lookup
export const PERMISSION_MATRIX: Record<UserRole, Record<Permission, boolean>> = {
  super_admin: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.super_admin.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  org_admin: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.org_admin.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  hr_admin: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.hr_admin.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  project_manager: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.project_manager.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  project_payroll_officer: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.project_payroll_officer.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  head_office_admin: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.head_office_admin.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  finance_approver: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.finance_approver.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  viewer: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.viewer.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  user: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.user.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  // Legacy
  organization_admin: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.organization_admin.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  ceo_executive: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.ceo_executive.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  payroll_manager: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.payroll_manager.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  employee: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.employee.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  hr_business_partner: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.hr_business_partner.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,

  finance_controller: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.finance_controller.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>
};

// Helper functions
export const getRoleDefinition = (role: UserRole): RoleDefinition => {
  return ROLE_DEFINITIONS[role];
};

export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  return PERMISSION_MATRIX[userRole]?.[permission] || false;
};

export const getRoleLevel = (role: UserRole): number => {
  return ROLE_DEFINITIONS[role].level;
};

export const canAccessResource = (
  userRole: UserRole,
  resource: string,
  context?: { organizationId?: string; departmentId?: string; userId?: string }
): boolean => {
  const roleDef = ROLE_DEFINITIONS[userRole];

  switch (resource) {
    case 'employees':
      return roleDef.canAccess.employees !== 'none';
    case 'payroll':
      return roleDef.canAccess.payroll !== 'none';
    case 'reports':
      return roleDef.canAccess.reports !== 'none';
    case 'system':
      return roleDef.canAccess.system !== 'none';
    case 'users':
      return roleDef.canAccess.users !== 'none';
    default:
      return false;
  }
};
