export type RoleKey =
  | "ORG_OWNER"
  | "ORG_ADMIN"
  | "ORG_HR"
  | "ORG_PAYROLL_ADMIN"
  | "ORG_FINANCE_APPROVER"
  | "ORG_PROJECT_MANAGER"
  | "ORG_HEAD_OFFICE_PAYROLL"
  | "ORG_VIEWER";

export type RoleCategory =
  | "Administration"
  | "HR & People"
  | "Payroll"
  | "Finance"
  | "Projects"
  | "Other";

export type PermissionKey = "approve_payroll" | "export_bank_schedule" | "pii.read";

export const roleCategories: RoleCategory[] = [
  "Administration",
  "HR & People",
  "Payroll",
  "Finance",
  "Projects",
  "Other",
];

export const roleCatalog: Record<RoleKey, { label: string; category: RoleCategory; description: string }> = {
  ORG_OWNER: {
    label: "Organization Owner",
    category: "Administration",
    description: "Full control of organization settings and access.",
  },
  ORG_ADMIN: {
    label: "Organization Administrator",
    category: "Administration",
    description: "Administer users, roles, companies and licenses within the organization.",
  },
  ORG_HR: {
    label: "Human Resources",
    category: "HR & People",
    description: "Access to HR modules, with optional restrictions via special permissions.",
  },
  ORG_PAYROLL_ADMIN: {
    label: "Payroll Administrator",
    category: "Payroll",
    description: "Manage payroll operations; sensitive actions still require explicit permissions.",
  },
  ORG_HEAD_OFFICE_PAYROLL: {
    label: "Head Office Payroll",
    category: "Payroll",
    description: "Secure payroll operations for head office only (permission-gated).",
  },
  ORG_FINANCE_APPROVER: {
    label: "Finance Approver",
    category: "Finance",
    description: "Approve financial and payroll outputs; sensitive actions require explicit permissions.",
  },
  ORG_PROJECT_MANAGER: {
    label: "Project Manager",
    category: "Projects",
    description: "Manage Manpower, Expatriate, and IPPMS projects within scoped access.",
  },
  ORG_VIEWER: {
    label: "Read-only Viewer",
    category: "Other",
    description: "Read-only access to allowed modules.",
  },
};

export const permissionCatalog: Record<PermissionKey, { label: string; description: string }> = {
  approve_payroll: {
    label: "Approve Payroll",
    description: "Approve payroll runs and finalize approval workflows.",
  },
  export_bank_schedule: {
    label: "Export Bank File",
    description: "Export bank schedules/files for payroll payment processing.",
  },
  "pii.read": {
    label: "View Employee Bank Details",
    description: "View sensitive personal/bank information for employees.",
  },
};

export function isRoleKey(key: string): key is RoleKey {
  return key in roleCatalog;
}

export function isPermissionKey(key: string): key is PermissionKey {
  return key in permissionCatalog;
}

export function roleLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return isRoleKey(key) ? roleCatalog[key].label : "Custom Role";
}

export function roleDescription(key: string | null | undefined): string {
  if (!key) return "";
  return isRoleKey(key) ? roleCatalog[key].description : "";
}

export function roleCategory(key: string | null | undefined): RoleCategory {
  return key && isRoleKey(key) ? roleCatalog[key].category : "Other";
}

export function permissionLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return isPermissionKey(key) ? permissionCatalog[key].label : "Custom Permission";
}

export function permissionDescription(key: string | null | undefined): string {
  if (!key) return "";
  return isPermissionKey(key) ? permissionCatalog[key].description : "";
}


