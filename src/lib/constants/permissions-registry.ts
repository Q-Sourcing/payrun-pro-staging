export interface PermissionDef {
  key: string;
  description: string;
}

export interface ModuleDef {
  id: string;
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Maps to rbac_permissions.category */
  category: string;
  permissions: PermissionDef[];
  /** Permission keys available at "view" level for module-access grants */
  viewPermissions?: string[];
  /** Permission keys available at "full" level for module-access grants */
  fullPermissions?: string[];
}

export const SYSTEM_MODULES_REGISTRY: ModuleDef[] = [
  {
    id: "employees",
    label: "Employees",
    icon: "Users",
    category: "Employees",
    permissions: [
      { key: "people.view",           description: "View employee list and profiles" },
      { key: "people.create",         description: "Add new employees" },
      { key: "people.edit",           description: "Edit employee records" },
      { key: "people.delete",         description: "Remove employees from the system" },
      { key: "people.view_sensitive", description: "View sensitive fields (salary, ID numbers)" },
      { key: "people.assign_project", description: "Assign employees to projects" },
      { key: "people.view_self",      description: "View own employee profile (self-service)" },
    ],
    viewPermissions: ["people.view"],
    fullPermissions: ["people.view", "people.create", "people.edit", "people.assign_project"],
  },
  {
    id: "payroll",
    label: "Pay Runs",
    icon: "DollarSign",
    category: "Payroll Processing",
    permissions: [
      { key: "payroll.view",        description: "View pay run summaries" },
      { key: "payroll.prepare",     description: "Prepare payroll calculations" },
      { key: "payroll.submit",      description: "Submit payroll for approval" },
      { key: "payroll.approve",     description: "Approve payroll runs" },
      { key: "payroll.rollback",    description: "Roll back a payroll run" },
      { key: "payroll.export_bank", description: "Export bank payment schedule" },
      { key: "payroll.view_self",   description: "View own payslips (self-service)" },
    ],
    viewPermissions: ["payroll.view"],
    fullPermissions: ["payroll.view", "payroll.prepare", "payroll.submit", "payroll.approve"],
  },
  {
    id: "pay_groups",
    label: "Pay Groups",
    icon: "FolderKanban",
    category: "Pay Groups",
    permissions: [
      { key: "paygroups.view",   description: "View pay groups" },
      { key: "paygroups.manage", description: "Create and modify pay groups" },
    ],
    viewPermissions: ["paygroups.view"],
    fullPermissions: ["paygroups.view", "paygroups.manage"],
  },
  {
    id: "projects",
    label: "Projects",
    icon: "FolderKanban",
    category: "Projects",
    permissions: [
      { key: "projects.view",   description: "View project list and details" },
      { key: "projects.manage", description: "Create and edit projects" },
    ],
    viewPermissions: ["projects.view"],
    fullPermissions: ["projects.view", "projects.manage"],
  },
  {
    id: "earnings_deductions",
    label: "Earnings & Deductions",
    icon: "Calculator",
    category: "Earnings & Deductions",
    permissions: [
      { key: "earnings.view",   description: "View earnings and deductions" },
      { key: "earnings.manage", description: "Create and edit earnings and deductions" },
    ],
    viewPermissions: ["earnings.view"],
    fullPermissions: ["earnings.view", "earnings.manage"],
  },
  {
    id: "contracts",
    label: "Contracts",
    icon: "FileText",
    category: "Contracts",
    permissions: [
      { key: "contracts.view",   description: "View employee contracts" },
      { key: "contracts.manage", description: "Create and manage contracts" },
    ],
    viewPermissions: ["contracts.view"],
    fullPermissions: ["contracts.view", "contracts.manage"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "BarChart3",
    category: "Reports",
    permissions: [
      { key: "reports.view",         description: "View payroll and HR reports" },
      { key: "finance.view_reports", description: "View financial and statutory reports" },
      { key: "reports.export",       description: "Export reports to PDF/Excel" },
    ],
    viewPermissions: ["reports.view"],
    fullPermissions: ["reports.view", "finance.view_reports", "reports.export"],
  },
  {
    id: "ehs",
    label: "EHS",
    icon: "ShieldAlert",
    category: "EHS",
    permissions: [
      { key: "ehs.view_dashboard",    description: "View EHS dashboard" },
      { key: "ehs.manage_incidents",  description: "Create and manage incidents" },
      { key: "ehs.manage_hazards",    description: "Create and manage hazard assessments" },
      { key: "ehs.manage_training",   description: "Manage safety training records" },
      { key: "ehs.manage_compliance", description: "Manage compliance and audits" },
    ],
    viewPermissions: ["ehs.view_dashboard"],
    fullPermissions: ["ehs.view_dashboard", "ehs.manage_incidents", "ehs.manage_hazards"],
  },
  {
    id: "settings",
    label: "System Settings",
    icon: "Settings",
    category: "System Settings",
    permissions: [
      { key: "admin.manage_users",      description: "Manage system users and invites" },
      { key: "admin.assign_roles",      description: "Assign and revoke roles" },
      { key: "admin.activity_logs.view",description: "View audit and activity logs" },
      { key: "admin.manage_settings",   description: "Manage organization settings" },
    ],
    viewPermissions: [],
    fullPermissions: ["admin.manage_users", "admin.assign_roles", "admin.activity_logs.view"],
  },
  {
    id: "user_management",
    label: "User Management",
    icon: "UserCog",
    category: "User Management",
    permissions: [
      { key: "users.view",         description: "View system users" },
      { key: "users.invite",       description: "Send invitations to new users" },
      { key: "users.edit",         description: "Edit user profiles and status" },
      { key: "users.deactivate",   description: "Deactivate user accounts" },
    ],
    viewPermissions: ["users.view"],
    fullPermissions: ["users.view", "users.invite", "users.edit"],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: "Clock",
    category: "Attendance",
    permissions: [
      { key: "attendance.view",   description: "View attendance records" },
      { key: "attendance.manage", description: "Record and edit attendance" },
      { key: "attendance.approve",description: "Approve attendance corrections" },
    ],
    viewPermissions: ["attendance.view"],
    fullPermissions: ["attendance.view", "attendance.manage", "attendance.approve"],
  },
];

/** Derive category list from registry — use instead of the old static array */
export const PERMISSION_CATEGORIES: string[] = [
  ...new Set(SYSTEM_MODULES_REGISTRY.map((m) => m.category)),
];

/** Module permission map for invite module-access grants */
export const MODULE_PERMISSION_MAP: Record<string, { view: string[]; full: string[] }> =
  Object.fromEntries(
    SYSTEM_MODULES_REGISTRY.map((m) => [
      m.id,
      { view: m.viewPermissions ?? [], full: m.fullPermissions ?? [] },
    ])
  );
