// User Role System Types and Definitions (Standardized OBAC Taxonomy)

export type UserRole =
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
  | 'SELF_CONTRACTOR';

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
}

export interface AccessControl {
  canView: (resource: string, context?: any) => boolean;
  canEdit: (resource: string, context?: any) => boolean;
  canDelete: (resource: string, context?: any) => boolean;
  canApprove: (resource: string, context?: any) => boolean;
  canExport: (resource: string, context?: any) => boolean;
}

export const ORG_SUPER_ADMIN = 'ORG_ADMIN';

export type Permission = string;

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  level: number; // Higher number = more permissions
  permissions: Permission[];
  restrictions: string[];
  canAccess?: {
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
  managerId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  restrictions?: string[];
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
}

// Role Definitions Matrix
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  PLATFORM_SUPER_ADMIN: {
    id: 'PLATFORM_SUPER_ADMIN',
    name: 'Platform Super Admin',
    description: 'Full system-wide access across all organizations',
    level: 100,
    permissions: ['*'],
    restrictions: []
  },
  PLATFORM_AUDITOR: {
    id: 'PLATFORM_AUDITOR',
    name: 'Platform Auditor',
    description: 'Read-only access to all system logs and data',
    level: 90,
    permissions: ['admin.activity_logs.view', 'people.view', 'payroll.view'],
    restrictions: ['Read-only']
  },
  ORG_ADMIN: {
    id: 'ORG_ADMIN',
    name: 'Organization Admin',
    description: 'Full control over organization data and users',
    level: 80,
    permissions: [
      'people.view', 'people.create', 'people.edit', 'people.assign_project',
      'payroll.prepare', 'payroll.submit', 'payroll.rollback',
      'finance.view_reports',
      'admin.manage_users', 'admin.assign_roles'
    ],
    restrictions: ['Restricted to organization scope']
  },
  ORG_HR_ADMIN: {
    id: 'ORG_HR_ADMIN',
    name: 'Organization HR Admin',
    description: 'Manages people and project assignments',
    level: 70,
    permissions: ['people.view', 'people.create', 'people.edit', 'people.assign_project'],
    restrictions: ['No payroll approval']
  },
  ORG_FINANCE_CONTROLLER: {
    id: 'ORG_FINANCE_CONTROLLER',
    name: 'Finance Controller',
    description: 'Full payroll and financial reporting access',
    level: 75,
    permissions: [
      'people.view', 'people.view_sensitive',
      'payroll.prepare', 'payroll.submit', 'payroll.approve', 'payroll.rollback',
      'payroll.export_bank', 'payroll.export_mobile_money',
      'finance.view_reports', 'finance.view_bank_details'
    ],
    restrictions: []
  },
  ORG_AUDITOR: {
    id: 'ORG_AUDITOR',
    name: 'Organization Auditor',
    description: 'Read-only access for auditing within organization',
    level: 60,
    permissions: ['people.view', 'payroll.view', 'finance.view_reports', 'admin.activity_logs.view'],
    restrictions: ['Read-only']
  },
  ORG_VIEWER: {
    id: 'ORG_VIEWER',
    name: 'Organization Viewer',
    description: 'General read-only access',
    level: 10,
    permissions: ['people.view', 'payroll.view'],
    restrictions: ['Read-only']
  },
  COMPANY_PAYROLL_ADMIN: {
    id: 'COMPANY_PAYROLL_ADMIN',
    name: 'Company Payroll Admin',
    description: 'Manages payroll for a specific company',
    level: 50,
    permissions: ['payroll.prepare', 'payroll.submit', 'people.view'],
    restrictions: ['No payroll approval', 'Scoped to company']
  },
  COMPANY_HR: {
    id: 'COMPANY_HR',
    name: 'Company HR',
    description: 'Manages people within a specific company',
    level: 45,
    permissions: ['people.view', 'people.create', 'people.edit'],
    restrictions: ['Scoped to company']
  },
  COMPANY_VIEWER: {
    id: 'COMPANY_VIEWER',
    name: 'Company Viewer',
    description: 'Read-only access to company data',
    level: 5,
    permissions: ['people.view', 'payroll.view'],
    restrictions: ['Read-only', 'Scoped to company']
  },
  PROJECT_MANAGER: {
    id: 'PROJECT_MANAGER',
    name: 'Project Manager',
    description: 'Manages project team and prepares payroll',
    level: 40,
    permissions: ['people.view', 'people.assign_project', 'payroll.prepare', 'payroll.submit', 'projects.view'],
    restrictions: ['Scoped to project']
  },
  PROJECT_PAYROLL_OFFICER: {
    id: 'PROJECT_PAYROLL_OFFICER',
    name: 'Project Payroll Officer',
    description: 'Prepares payroll data for projects',
    level: 35,
    permissions: ['payroll.prepare', 'people.view', 'projects.view'],
    restrictions: ['Scoped to project']
  },
  PROJECT_VIEWER: {
    id: 'PROJECT_VIEWER',
    name: 'Project Viewer',
    description: 'Read-only project access',
    level: 2,
    permissions: ['people.view', 'projects.view'],
    restrictions: ['Read-only', 'Scoped to project']
  },
  SELF_USER: {
    id: 'SELF_USER',
    name: 'Self User',
    description: 'Access to own profile and pay slips',
    level: 1,
    permissions: ['people.view_self', 'payroll.view_self'],
    restrictions: ['Own data only']
  },
  SELF_CONTRACTOR: {
    id: 'SELF_CONTRACTOR',
    name: 'Self Contractor',
    description: 'Contractor self-service access',
    level: 1,
    permissions: ['people.view_self', 'payroll.view_self_invoice'],
    restrictions: ['Own data only']
  }
};
