/**
 * permissions.ts — Pure-function permission checks
 *
 * Replaces the old RBACService singleton. Every function takes UserContext
 * as its first argument. No global state, no static cache.
 */

import type { UserContext, ScopeType } from './claims';

// ── Types (re-exported for convenience) ──────────────────────────────────────

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
  | 'SELF_CONTRACTOR';

export type Permission = string;
export type Scope = ScopeType;

// ── Permission checks ────────────────────────────────────────────────────────

/** Check if user has a specific permission (any scope). */
export function hasPermission(ctx: UserContext | null, permission: Permission): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin) return true;
  return ctx.permissions.includes(permission);
}

/** Check if user has a permission within a specific scope. */
export function hasScopedPermission(
  ctx: UserContext | null,
  permission: Permission,
  scopeType: Scope,
  scopeId?: string | null,
): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin) return true;
  if (!ctx.permissions.includes(permission)) return false;

  return ctx.roles.some((assignment) => {
    const isPlatformRole = assignment.org_id === '00000000-0000-0000-0000-000000000000';
    const matchesCurrentOrg = assignment.org_id === ctx.organizationId;
    if (!isPlatformRole && !matchesCurrentOrg) return false;

    if (assignment.scope_type === 'GLOBAL') return true;
    if (assignment.scope_type === scopeType && (assignment.scope_id === scopeId || !scopeId)) return true;
    if (assignment.scope_type === 'ORGANIZATION' && ['COMPANY', 'PROJECT'].includes(scopeType)) return true;
    if (assignment.scope_type === 'COMPANY' && scopeType === 'PROJECT') return true;

    return false;
  });
}

/** Check if user has ANY of the specified permissions. */
export function hasAnyPermission(ctx: UserContext | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(ctx, p));
}

/** Check if user has ALL of the specified permissions. */
export function hasAllPermissions(ctx: UserContext | null, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(ctx, p));
}

// ── Role checks ──────────────────────────────────────────────────────────────

export function isPlatformAdmin(ctx: UserContext | null): boolean {
  return !!ctx?.isPlatformAdmin;
}

export function isOrgAdmin(ctx: UserContext | null): boolean {
  if (!ctx) return false;
  return ctx.isPlatformAdmin || ctx.roles.some((r) =>
    r.role === 'ORG_ADMIN' || r.role === 'ADMIN' || r.role === 'GM'
  );
}

export function hasRole(ctx: UserContext | null, roleCode: string): boolean {
  return !!ctx?.roles.some((r) => r.role === roleCode);
}

// ── Resource-based convenience helpers ───────────────────────────────────────

export function canAccessResource(ctx: UserContext | null, resource: string, action: string = 'view'): boolean {
  return hasPermission(ctx, `${resource}.${action}`);
}

export function canManageResource(ctx: UserContext | null, resource: string): boolean {
  return hasPermission(ctx, `${resource}.manage`) || isOrgAdmin(ctx);
}

export function canCreateResource(ctx: UserContext | null, resource: string): boolean {
  return hasPermission(ctx, `${resource}.create`);
}

export function canUpdateResource(ctx: UserContext | null, resource: string): boolean {
  return hasPermission(ctx, `${resource}.edit`) || hasPermission(ctx, `${resource}.update`);
}

export function canDeleteResource(ctx: UserContext | null, resource: string): boolean {
  return hasPermission(ctx, `${resource}.delete`);
}

// ── Role assignment ──────────────────────────────────────────────────────────

export function canAssignRole(ctx: UserContext | null, targetRole: Role): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin) return true;
  if (isOrgAdmin(ctx)) {
    return (
      targetRole.startsWith('ORG_') ||
      targetRole.startsWith('COMPANY_') ||
      targetRole.startsWith('PROJECT_') ||
      targetRole.startsWith('SELF_')
    );
  }
  return false;
}

// ── Organization checks ──────────────────────────────────────────────────────

export function canAccessOrganization(ctx: UserContext | null, organizationId: string): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin) return true;
  return ctx.organizationId === organizationId;
}

// ── UI display helpers ───────────────────────────────────────────────────────

export function getRoleDisplayName(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function getPermissionGroups(): Record<string, Permission[]> {
  return {
    People: ['people.view', 'people.create', 'people.edit', 'people.view_sensitive', 'people.assign_project'],
    Payroll: [
      'payroll.prepare', 'payroll.submit', 'payroll.approve',
      'payroll.rollback', 'payroll.export_bank', 'payroll.export_mobile_money',
    ],
    Finance: ['finance.view_reports', 'finance.view_bank_details'],
    Admin: ['admin.manage_users', 'admin.assign_roles', 'admin.impersonate'],
  };
}
