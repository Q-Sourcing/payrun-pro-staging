// User Role System Types and Definitions

export type UserRole = 
  | 'super_admin'
  | 'organization_admin'
  | 'ceo_executive'
  | 'payroll_manager'
  | 'employee'
  | 'hr_business_partner'
  | 'finance_controller';

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
  | 'bulk_operations'
  | 'delete_records';

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
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Ultimate system authority with unrestricted access across all organizations',
    level: 10,
    permissions: [
      'view_all_employees',
      'edit_all_employees',
      'process_payroll',
      'approve_payroll',
      'view_financial_reports',
      'view_executive_reports',
      'manage_users',
      'system_configuration',
      'view_audit_logs',
      'manage_integrations',
      'view_system_health',
      'view_sensitive_data',
      'export_data',
      'bulk_operations',
      'delete_records'
    ],
    restrictions: [],
    visibleData: [
      'Complete global dashboard with all metrics',
      'Cross-organization analytics and comparisons',
      'System health monitoring panels',
      'Global compliance and audit reports'
    ],
    dashboardSections: [
      'global_overview',
      'system_health',
      'user_management',
      'integrations',
      'audit_logs',
      'financial_reports',
      'compliance'
    ],
    canAccess: {
      employees: 'all',
      payroll: 'process',
      reports: 'all',
      system: 'full',
      users: 'all'
    }
  },

  organization_admin: {
    id: 'organization_admin',
    name: 'Organization Administrator',
    description: 'Full control within a specific organization/company',
    level: 8,
    permissions: [
      'view_organization_employees',
      'edit_organization_employees',
      'process_payroll',
      'approve_payroll',
      'view_financial_reports',
      'view_executive_reports',
      'manage_organization_users',
      'organization_configuration',
      'approve_expenses',
      'approve_leave',
      'approve_overtime',
      'manage_budgets',
      'view_sensitive_data',
      'export_data',
      'bulk_operations'
    ],
    restrictions: [
      'Cannot access data outside their organization',
      'Cannot modify global system settings'
    ],
    visibleData: [
      'Organization-wide dashboard',
      'All employee data within their company',
      'Financial reports for their organization',
      'Compliance status for their jurisdiction'
    ],
    dashboardSections: [
      'organization_overview',
      'employee_management',
      'payroll_processing',
      'financial_reports',
      'compliance',
      'user_management'
    ],
    canAccess: {
      employees: 'organization',
      payroll: 'process',
      reports: 'all',
      system: 'organization',
      users: 'organization'
    }
  },

  ceo_executive: {
    id: 'ceo_executive',
    name: 'CEO/Executive',
    description: 'High-level oversight and decision-making without operational tasks',
    level: 7,
    permissions: [
      'view_organization_employees',
      'view_financial_reports',
      'view_executive_reports',
      'approve_payroll',
      'manage_budgets',
      'view_sensitive_data',
      'export_data'
    ],
    restrictions: [
      'Cannot process payroll or make individual employee changes',
      'Cannot view detailed individual employee salary data (unless configured)',
      'No access to system configuration settings'
    ],
    visibleData: [
      'Executive dashboard with financial summaries',
      'Department-wise cost analytics',
      'Headcount and turnover reports',
      'Budget compliance and forecasting data'
    ],
    dashboardSections: [
      'executive_overview',
      'financial_summary',
      'department_analytics',
      'budget_compliance',
      'strategic_reports'
    ],
    canAccess: {
      employees: 'organization',
      payroll: 'approve',
      reports: 'all',
      system: 'none',
      users: 'none'
    }
  },

  payroll_manager: {
    id: 'payroll_manager',
    name: 'Payroll Manager',
    description: 'Department-level payroll management and team oversight',
    level: 6,
    permissions: [
      'view_department_employees',
      'edit_department_employees',
      'process_payroll',
      'view_department_reports',
      'approve_expenses',
      'approve_leave',
      'approve_overtime',
      'export_data'
    ],
    restrictions: [
      'Cannot access data outside their department',
      'Cannot process organization-wide payroll',
      'Cannot modify system settings',
      'Cannot view executive compensation data'
    ],
    visibleData: [
      'Team member profiles and data',
      'Department payroll summaries',
      'Team attendance and leave records',
      'Budget utilization for their department'
    ],
    dashboardSections: [
      'department_overview',
      'team_management',
      'payroll_processing',
      'attendance_management',
      'department_reports'
    ],
    canAccess: {
      employees: 'department',
      payroll: 'process',
      reports: 'department',
      system: 'none',
      users: 'none'
    }
  },

  employee: {
    id: 'employee',
    name: 'Employee',
    description: 'Self-service access to personal payroll information',
    level: 1,
    permissions: [
      'view_own_data',
      'edit_own_data',
      'view_own_reports'
    ],
    restrictions: [
      'Cannot view other employees\' data',
      'No access to payroll processing functions',
      'Cannot generate reports beyond personal data',
      'No system configuration access'
    ],
    visibleData: [
      'Personal dashboard with own information',
      'Individual payslips and payment history',
      'Personal tax documents',
      'Leave balances and attendance records'
    ],
    dashboardSections: [
      'personal_overview',
      'payslips',
      'attendance',
      'leave_management',
      'benefits'
    ],
    canAccess: {
      employees: 'own',
      payroll: 'none',
      reports: 'own',
      system: 'none',
      users: 'none'
    }
  },

  hr_business_partner: {
    id: 'hr_business_partner',
    name: 'HR Business Partner',
    description: 'HR operational support without full payroll processing authority',
    level: 4,
    permissions: [
      'view_organization_employees',
      'edit_organization_employees',
      'view_department_reports',
      'approve_leave',
      'export_data',
      'bulk_operations'
    ],
    restrictions: [
      'Cannot process payroll or approve payments',
      'Cannot view financial reports beyond headcount data',
      'Cannot modify pay rates or compensation structures'
    ],
    visibleData: [
      'Employee records and profiles',
      'HR compliance reports',
      'Attendance and leave compliance',
      'Organizational hierarchy data'
    ],
    dashboardSections: [
      'hr_overview',
      'employee_management',
      'compliance',
      'attendance_tracking',
      'hr_reports'
    ],
    canAccess: {
      employees: 'organization',
      payroll: 'none',
      reports: 'department',
      system: 'none',
      users: 'none'
    }
  },

  finance_controller: {
    id: 'finance_controller',
    name: 'Finance Controller',
    description: 'Financial oversight and compliance monitoring',
    level: 5,
    permissions: [
      'view_organization_employees',
      'view_financial_reports',
      'view_executive_reports',
      'approve_payroll',
      'manage_budgets',
      'view_audit_logs',
      'export_data'
    ],
    restrictions: [
      'Cannot modify employee personal data',
      'No access to HR-specific functions',
      'Cannot process operational payroll tasks'
    ],
    visibleData: [
      'Financial payroll reports',
      'Audit trails and compliance reports',
      'Tax compliance and filings',
      'Bank reconciliation reports'
    ],
    dashboardSections: [
      'financial_overview',
      'compliance_monitoring',
      'audit_trails',
      'budget_management',
      'financial_reports'
    ],
    canAccess: {
      employees: 'organization',
      payroll: 'approve',
      reports: 'all',
      system: 'none',
      users: 'none'
    }
  }
};

// Permission Matrix for quick lookup
export const PERMISSION_MATRIX: Record<UserRole, Record<Permission, boolean>> = {
  super_admin: Object.fromEntries(
    Object.values(ROLE_DEFINITIONS.super_admin.permissions).map(p => [p, true])
  ) as Record<Permission, boolean>,
  
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
