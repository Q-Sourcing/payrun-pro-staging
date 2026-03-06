import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CallerContext = {
  id: string;
  email: string | null;
  role: string;
  orgId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) || "" };
}

async function getCallerContext(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json(401, { success: false, message: "Authorization header required" }) };

  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: json(401, { success: false, message: "Invalid authentication token" }) };
  }

  const caller = authData.user;
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, organization_id")
    .eq("id", caller.id)
    .maybeSingle();

  const callerRole = String(profile?.role || "").toLowerCase();
  const orgId = profile?.organization_id ?? null;

  const { data: platformAdmin } = await supabaseAdmin
    .from("platform_admins")
    .select("allowed")
    .eq("email", caller.email || "")
    .maybeSingle();

  const SUPER_ADMIN_EMAILS = ["nalungukevin@gmail.com"];
  const isWhitelisted = SUPER_ADMIN_EMAILS.includes(caller.email || "");
  const isPlatformAdmin = !!platformAdmin?.allowed;

  const isAdmin =
    ["super_admin", "admin", "org_admin", "organization_admin", "hr"].includes(callerRole) ||
    isPlatformAdmin ||
    isWhitelisted;

  const isSuperAdmin = ["super_admin", "org_admin"].includes(callerRole) || isPlatformAdmin || isWhitelisted;

  const context: CallerContext = {
    id: caller.id,
    email: caller.email || null,
    role: callerRole,
    orgId,
    isAdmin,
    isSuperAdmin,
  };

  return { context };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return json(500, { success: false, message: "Missing service role key" });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const auth = await getCallerContext(req, supabaseAdmin);
    if (auth.error) return auth.error;
    const caller = auth.context!;

    if (!caller.isAdmin) {
      return json(403, { success: false, message: "Insufficient permissions. Admin role required." });
    }
    if (!caller.orgId && !caller.isSuperAdmin) {
      return json(400, { success: false, message: "Could not resolve caller organization." });
    }

    // LIST USERS
    if (req.method === "GET") {
      const orgId = caller.orgId;
      if (!orgId) return json(400, { success: false, message: "Organization context is required." });

      const { data: orgUsers, error: orgUsersError } = await supabaseAdmin
        .from("org_users")
        .select("id, user_id, status, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (orgUsersError) return json(500, { success: false, message: orgUsersError.message });

      const userIds = (orgUsers || []).map((row) => row.user_id);
      if (userIds.length === 0) return json(200, { success: true, users: [] });

      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      const { data: managementProfiles } = await supabaseAdmin
        .from("user_management_profiles")
        .select("user_id, phone, department, status")
        .in("user_id", userIds);

      const { data: assignments } = await supabaseAdmin
        .from("rbac_assignments")
        .select("user_id, role_code")
        .eq("org_id", orgId)
        .in("user_id", userIds);

      const profileById = new Map((profiles || []).map((p) => [p.id, p]));
      const managementByUserId = new Map((managementProfiles || []).map((p) => [p.user_id, p]));
      const roleByUserId = new Map<string, string>();
      for (const assignment of assignments || []) {
        if (!roleByUserId.has(assignment.user_id)) roleByUserId.set(assignment.user_id, assignment.role_code);
      }

      const users = (orgUsers || []).map((row) => {
        const profile = profileById.get(row.user_id);
        const management = managementByUserId.get(row.user_id);
        const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
        const status = management?.status || (row.status === "active" ? "active" : "inactive");
        return {
          id: row.user_id,
          full_name: fullName || profile?.email || "Unnamed User",
          email: profile?.email || "",
          role: roleByUserId.get(row.user_id) || "SELF_USER",
          phone: management?.phone || null,
          department: management?.department || null,
          status: status === "active" ? "active" : "inactive",
          created_at: row.created_at,
        };
      });

      return json(200, { success: true, users });
    }

    // CREATE USER (DIRECT - NO INVITATION)
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const fullName = String(body.full_name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const roleCode = String(body.role_code || body.role || "").trim();
      const phone = body.phone ? String(body.phone) : null;
      const department = body.department ? String(body.department) : null;
      const status = String(body.status || "active").toLowerCase() === "active" ? "active" : "inactive";

      if (!caller.orgId) return json(400, { success: false, message: "Organization context is required." });
      if (!fullName || !email || !password || !roleCode) {
        return json(400, { success: false, message: "full_name, email, password and role_code are required." });
      }
      if (password.length < 8) {
        return json(400, { success: false, message: "Password must be at least 8 characters." });
      }

      const { data: roleRow, error: roleError } = await supabaseAdmin
        .from("rbac_roles")
        .select("code")
        .eq("org_id", caller.orgId)
        .eq("code", roleCode)
        .maybeSingle();
      if (roleError) return json(500, { success: false, message: roleError.message });
      if (!roleRow) return json(400, { success: false, message: `Role '${roleCode}' is not available in this organization.` });

      const { firstName, lastName } = splitFullName(fullName);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || null,
          last_name: lastName || null,
          organization_id: caller.orgId,
        },
      });
      if (createError || !created.user) {
        return json(400, { success: false, message: createError?.message || "Failed to create auth user." });
      }

      const userId = created.user.id;
      const now = new Date().toISOString();
      await supabaseAdmin.from("user_profiles").upsert({
        id: userId,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        organization_id: caller.orgId,
        role: roleCode,
        updated_at: now,
      });

      await supabaseAdmin.from("org_users").upsert(
        { org_id: caller.orgId, user_id: userId, status },
        { onConflict: "org_id,user_id" },
      );

      await supabaseAdmin.from("user_management_profiles").upsert(
        { user_id: userId, phone, department, status, updated_at: now },
        { onConflict: "user_id" },
      );

      await supabaseAdmin
        .from("rbac_assignments")
        .delete()
        .eq("org_id", caller.orgId)
        .eq("user_id", userId);

      await supabaseAdmin.from("rbac_assignments").insert({
        user_id: userId,
        role_code: roleCode,
        org_id: caller.orgId,
        scope_type: "organization",
        scope_id: caller.orgId,
      });

      return json(200, { success: true, message: "User created successfully.", user_id: userId });
    }

    // UPDATE USER
    if (req.method === "PATCH" || req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const userId = String(body.id || "").trim();
      const fullName = body.full_name !== undefined ? String(body.full_name).trim() : undefined;
      const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
      const roleCode = body.role_code !== undefined ? String(body.role_code).trim() : undefined;
      const phone = body.phone !== undefined ? (body.phone ? String(body.phone) : null) : undefined;
      const department = body.department !== undefined ? (body.department ? String(body.department) : null) : undefined;
      const status = body.status !== undefined ? (String(body.status).toLowerCase() === "active" ? "active" : "inactive") : undefined;

      if (!userId) return json(400, { success: false, message: "id is required." });
      if (!caller.orgId) return json(400, { success: false, message: "Organization context is required." });

      const { data: orgMembership } = await supabaseAdmin
        .from("org_users")
        .select("id")
        .eq("org_id", caller.orgId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!orgMembership) return json(404, { success: false, message: "User not found in your organization." });

      if (email) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
        if (authUpdateError) return json(400, { success: false, message: authUpdateError.message });
      }

      const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (email !== undefined) profileUpdate.email = email;
      if (fullName !== undefined) {
        const { firstName, lastName } = splitFullName(fullName);
        profileUpdate.first_name = firstName || null;
        profileUpdate.last_name = lastName || null;
      }
      if (roleCode !== undefined) profileUpdate.role = roleCode;

      if (Object.keys(profileUpdate).length > 1) {
        const { error: profileError } = await supabaseAdmin.from("user_profiles").update(profileUpdate).eq("id", userId);
        if (profileError) return json(400, { success: false, message: profileError.message });
      }

      if (phone !== undefined || department !== undefined || status !== undefined) {
        const upsertPayload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
        if (phone !== undefined) upsertPayload.phone = phone;
        if (department !== undefined) upsertPayload.department = department;
        if (status !== undefined) upsertPayload.status = status;
        const { error: mgmtError } = await supabaseAdmin
          .from("user_management_profiles")
          .upsert(upsertPayload, { onConflict: "user_id" });
        if (mgmtError) return json(400, { success: false, message: mgmtError.message });
      }

      if (status !== undefined) {
        const { error: orgStatusError } = await supabaseAdmin
          .from("org_users")
          .update({ status })
          .eq("org_id", caller.orgId)
          .eq("user_id", userId);
        if (orgStatusError) return json(400, { success: false, message: orgStatusError.message });
      }

      if (roleCode !== undefined) {
        const { data: roleRow, error: roleError } = await supabaseAdmin
          .from("rbac_roles")
          .select("code")
          .eq("org_id", caller.orgId)
          .eq("code", roleCode)
          .maybeSingle();
        if (roleError) return json(500, { success: false, message: roleError.message });
        if (!roleRow) return json(400, { success: false, message: `Role '${roleCode}' is not available in this organization.` });

        await supabaseAdmin
          .from("rbac_assignments")
          .delete()
          .eq("org_id", caller.orgId)
          .eq("user_id", userId);

        const { error: assignmentError } = await supabaseAdmin.from("rbac_assignments").insert({
          user_id: userId,
          role_code: roleCode,
          org_id: caller.orgId,
          scope_type: "organization",
          scope_id: caller.orgId,
        });
        if (assignmentError) return json(400, { success: false, message: assignmentError.message });
      }

      return json(200, { success: true, message: "User updated successfully." });
    }

    // DELETE / DEACTIVATE USER
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const body = await req.json().catch(() => ({}));
      const userId = String(body.id || url.searchParams.get("id") || "").trim();
      const hardDelete = Boolean(body.hard_delete);
      if (!userId) return json(400, { success: false, message: "id is required." });

      if (userId === caller.id) return json(400, { success: false, message: "Cannot delete your own account." });
      if (hardDelete && !caller.isSuperAdmin) {
        return json(403, { success: false, message: "Only super admins can perform hard delete." });
      }

      if (hardDelete) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) return json(400, { success: false, message: deleteError.message });
        return json(200, { success: true, message: "User deleted successfully." });
      }

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (banError) return json(400, { success: false, message: banError.message });

      if (caller.orgId) {
        await supabaseAdmin.from("org_users").update({ status: "inactive" }).eq("org_id", caller.orgId).eq("user_id", userId);
      }
      await supabaseAdmin
        .from("user_management_profiles")
        .upsert({ user_id: userId, status: "inactive", updated_at: new Date().toISOString() }, { onConflict: "user_id" });

      return json(200, { success: true, message: "User deactivated successfully." });
    }

    return json(405, { success: false, message: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json(500, { success: false, message });
  }
});

