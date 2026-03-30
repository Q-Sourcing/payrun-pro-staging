import { supabase } from "@/integrations/supabase/client";

export type Role = {
    code: string;
    name: string;
    description: string | null;
    tier: 'PLATFORM' | 'ORGANIZATION' | 'COMPANY' | 'PROJECT' | 'SELF';
    org_id: string | null;
    created_at: string;
};

export type Permission = {
    key: string;
    category: string;
    description: string | null;
    created_at: string;
};

export type Assignment = {
    id: string;
    user_id: string;
    role_code: string;
    scope_type: 'GLOBAL' | 'ORGANIZATION' | 'COMPANY' | 'PROJECT' | 'SELF';
    scope_id: string | null;
    assigned_by: string | null;
    created_at: string;
    org_id: string | null;
};

export type Grant = {
    id: string;
    user_id: string | null;
    role_code: string | null;
    permission_key: string;
    scope_type: 'ORGANIZATION' | 'COMPANY' | 'PROJECT';
    scope_id: string;
    effect: 'ALLOW' | 'DENY';
    reason: string | null;
    created_by: string | null;
    created_at: string;
    valid_until: string | null;
};

export type RBACUser = {
    id: string;
    email: string | null;
    full_name: string | null;
    organization_id: string | null;
};

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles() {
    const { data, error } = await supabase
        .from("rbac_roles")
        .select("*")
        .order("tier", { ascending: false });
    if (error) throw error;
    return data as Role[];
}

export async function createRole(payload: {
    code: string;
    name: string;
    description: string;
    tier: string;
    org_id: string;
}) {
    const { error } = await supabase
        .from("rbac_roles")
        .insert(payload as any);
    if (error) throw error;
}

export async function deleteRole(code: string) {
    const { error } = await supabase
        .from("rbac_roles")
        .delete()
        .eq("code", code);
    if (error) throw error;
}

// ─── Role Permissions ─────────────────────────────────────────────────────────

export async function listRolePermissions(roleCode: string, orgId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from("rbac_role_permissions")
        .select("permission_key")
        .eq("role_code", roleCode)
        .eq("org_id", orgId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.permission_key);
}

export async function setRolePermissions(roleCode: string, orgId: string, permissionKeys: string[]) {
    const { error: delErr } = await supabase
        .from("rbac_role_permissions")
        .delete()
        .eq("role_code", roleCode)
        .eq("org_id", orgId);
    if (delErr) throw delErr;

    if (permissionKeys.length > 0) {
        const rows = permissionKeys.map(k => ({ role_code: roleCode, permission_key: k, org_id: orgId }));
        const { error: insErr } = await supabase
            .from("rbac_role_permissions")
            .insert(rows as any[]);
        if (insErr) throw insErr;
    }
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function listPermissions() {
    const { data, error } = await supabase
        .from("rbac_permissions")
        .select("*")
        .order("category");
    if (error) throw error;
    return data as Permission[];
}

export async function createPermission(payload: {
    key: string;
    category: string;
    description: string;
}) {
    const { error } = await supabase
        .from("rbac_permissions")
        .insert(payload as any);
    if (error) throw error;
}

export async function updatePermission(
    key: string,
    payload: { category: string; description: string }
) {
    const { error } = await supabase
        .from("rbac_permissions")
        .update(payload as any)
        .eq("key", key);
    if (error) throw error;
}

export async function deletePermission(key: string) {
    const { error } = await supabase
        .from("rbac_permissions")
        .delete()
        .eq("key", key);
    if (error) throw error;
}

// ─── Grants ───────────────────────────────────────────────────────────────────

export async function listGrants(orgId: string) {
    const { data, error } = await supabase
        .from("rbac_grants")
        .select("*")
        .eq("scope_id", orgId);
    if (error) throw error;
    return data as unknown as Grant[];
}

export async function createGrant(payload: Omit<Grant, 'id' | 'created_at' | 'created_by'>) {
    const { error } = await supabase
        .from("rbac_grants")
        .insert(payload);
    if (error) throw error;
}

export async function deleteGrant(id: string) {
    const { error } = await supabase
        .from("rbac_grants")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

// ─── User Module Grants (for invite/edit dialogs) ────────────────────────────

/**
 * Permission keys for each module at each access level.
 * Mirrors MODULE_PERMISSION_MAP in the invite-user edge function.
 */
export const MODULE_PERMISSION_MAP: Record<string, { view: string[]; full: string[] }> = {
  employees:           { view: ['people.view'], full: ['people.view', 'people.create', 'people.edit', 'people.assign_project'] },
  payroll:             { view: ['payroll.view'], full: ['payroll.view', 'payroll.prepare', 'payroll.submit', 'payroll.approve'] },
  pay_groups:          { view: ['paygroups.view'], full: ['paygroups.view', 'paygroups.manage'] },
  projects:            { view: ['projects.view'], full: ['projects.view', 'projects.manage'] },
  earnings_deductions: { view: ['earnings.view'], full: ['earnings.view', 'earnings.manage'] },
  contracts:           { view: ['contracts.view'], full: ['contracts.view', 'contracts.manage'] },
  reports:             { view: ['reports.view'], full: ['reports.view', 'finance.view_reports', 'reports.export'] },
  ehs:                 { view: ['ehs.view_dashboard'], full: ['ehs.view_dashboard', 'ehs.manage_incidents', 'ehs.manage_hazards'] },
  settings:            { view: [], full: ['admin.manage_users', 'admin.assign_roles', 'admin.activity_logs.view'] },
  user_management:     { view: ['users.view'], full: ['users.view', 'users.invite', 'users.edit'] },
  attendance:          { view: ['attendance.view'], full: ['attendance.view', 'attendance.manage', 'attendance.approve'] },
};

/**
 * Fetch a user's current ALLOW grants at org scope (for displaying module access).
 */
export async function getUserModuleGrants(userId: string, orgId: string): Promise<Grant[]> {
    const { data, error } = await supabase
        .from("rbac_grants")
        .select("*")
        .eq("user_id", userId)
        .eq("scope_type", "ORGANIZATION")
        .eq("scope_id", orgId)
        .eq("effect", "ALLOW");
    if (error) throw error;
    return (data ?? []) as unknown as Grant[];
}

/**
 * Derives a { moduleId: 'view'|'full'|'none' } map from a list of ALLOW grants.
 * Used to pre-populate the ModuleAccessSection when editing a user.
 */
export function grantsToModuleAccess(
    grants: Grant[]
): Record<string, 'view' | 'full' | 'none'> {
    const grantedKeys = new Set(grants.map((g) => g.permission_key));
    const result: Record<string, 'view' | 'full' | 'none'> = {};
    for (const [moduleId, { view, full }] of Object.entries(MODULE_PERMISSION_MAP)) {
        const hasAll = full.length > 0 && full.every((k) => grantedKeys.has(k));
        const hasView = view.length > 0 && view.every((k) => grantedKeys.has(k));
        result[moduleId] = hasAll ? 'full' : hasView ? 'view' : 'none';
    }
    return result;
}

/**
 * Replace all ALLOW grants for a user at org scope with the provided module access map.
 * Deletes existing org-scope ALLOW grants, then inserts new ones.
 */
export async function setUserModuleGrants(
    userId: string,
    orgId: string,
    moduleAccess: Record<string, 'view' | 'full' | 'none'>
): Promise<void> {
    // Remove existing ALLOW grants at this scope
    const { error: delErr } = await supabase
        .from("rbac_grants")
        .delete()
        .eq("user_id", userId)
        .eq("scope_type", "ORGANIZATION")
        .eq("scope_id", orgId)
        .eq("effect", "ALLOW");
    if (delErr) throw delErr;

    // Insert new grants
    const rows: Array<{
        user_id: string;
        permission_key: string;
        scope_type: string;
        scope_id: string;
        effect: string;
    }> = [];

    for (const [moduleId, level] of Object.entries(moduleAccess)) {
        if (level === 'none') continue;
        const perms = MODULE_PERMISSION_MAP[moduleId]?.[level] ?? [];
        for (const permKey of perms) {
            rows.push({
                user_id: userId,
                permission_key: permKey,
                scope_type: 'ORGANIZATION',
                scope_id: orgId,
                effect: 'ALLOW',
            });
        }
    }

    if (rows.length > 0) {
        const { error: insErr } = await supabase
            .from("rbac_grants")
            .upsert(rows as any[], { onConflict: 'user_id,permission_key,scope_type,scope_id' });
        if (insErr) throw insErr;
    }
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function listAuditLogs(orgId: string) {
    const { data, error } = await supabase
        .from("security_audit_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
}

export async function getEffectivePermissions(userId: string, orgId: string) {
    const { data, error } = await supabase.rpc('get_user_effective_permissions' as any, { p_user_id: userId, p_org_id: orgId });
    if (error) throw error;
    return data;
}
