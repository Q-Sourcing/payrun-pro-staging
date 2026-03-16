/**
 * useRbacPermissions
 * Fetches the effective permissions for the currently-logged-in user by
 * reading their rbac_assignments → rbac_role_permissions.
 * Returns a helper `can(permissionKey)` that resolves instantly from cache.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RbacPermissionsState {
  permissions: Set<string>;
  roleCode: string | null;
  roleName: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  can: (permissionKey: string) => boolean;
}

export function useRbacPermissions(): RbacPermissionsState {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setIsLoading(false); return; }

        // Fetch user's role assignment (most recent active assignment)
        const { data: assignments } = await supabase
          .from("rbac_assignments")
          .select("role_code")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!assignments || cancelled) { setIsLoading(false); return; }

        const code = assignments.role_code;
        setRoleCode(code);

        // Platform super admin gets everything
        if (code === "PLATFORM_SUPER_ADMIN") {
          setPermissions(new Set(["*"]));
          setRoleName("Platform Super Admin");
          setIsLoading(false);
          return;
        }

        // Fetch role name
        const { data: roleRow } = await supabase
          .from("rbac_roles")
          .select("name")
          .eq("code", code)
          .maybeSingle();
        if (!cancelled && roleRow) setRoleName(roleRow.name);

        // Fetch permissions for this role (no org_id filter — global role perms)
        const { data: rolePerms } = await supabase
          .from("rbac_role_permissions")
          .select("permission_key")
          .eq("role_code", code);

        if (!cancelled) {
          const keys = (rolePerms ?? []).map((r: any) => r.permission_key);
          setPermissions(new Set(keys));
        }
      } catch (err) {
        console.error("useRbacPermissions error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const can = useCallback(
    (key: string) => permissions.has("*") || permissions.has(key),
    [permissions]
  );

  const isAdmin = roleCode === "PLATFORM_SUPER_ADMIN" || roleCode === "ADMIN";

  return { permissions, roleCode, roleName, isLoading, isAdmin, can };
}
