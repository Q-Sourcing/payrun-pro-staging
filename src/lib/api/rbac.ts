import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/lib/types/roles";

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

export async function listRoles() {
    const { data, error } = await supabase
        .from("rbac_roles")
        .select("*")
        .order("tier", { ascending: false });
    if (error) throw error;
    return data as Role[];
}

export async function listPermissions() {
    const { data, error } = await supabase
        .from("rbac_permissions")
        .select("*")
        .order("category");
    if (error) throw error;
    return data as Permission[];
}

export async function listGrants(orgId: string) {
    // Grants are scoped to objects within the org
    const { data, error } = await supabase
        .from("rbac_grants")
        .select("*")
        .eq("scope_id", orgId); // This might need refinement based on how scope_id is used for COMPANY/PROJECT

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
    // This is a complex query that mirrors the has_permission logic but returns the list
    // For the UI, we might just query the auth metadata if it's for the current user,
    // or a custom RPC if we want it for any user.
    const { data, error } = await supabase.rpc('get_user_effective_permissions' as any, { p_user_id: userId, p_org_id: orgId });
    if (error) throw error;
    return data;
}
