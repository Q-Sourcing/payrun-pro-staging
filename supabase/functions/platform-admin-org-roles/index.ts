import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const auth = await requirePlatformAdmin(supabaseAdmin, req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");
    if (!orgId) {
      return jsonResponse({ success: false, message: "org_id required" }, { status: 400 });
    }

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("org_roles")
        .select("id, org_id, key, name, description, system_defined, created_at")
        .eq("org_id", orgId)
        .order("system_defined", { ascending: false });

      if (error) {
        return jsonResponse({ success: false, message: "Failed to load org roles", error }, { status: 500 });
      }
      return jsonResponse({ success: true, roles: data ?? [] }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("platform-admin-org-roles error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});








