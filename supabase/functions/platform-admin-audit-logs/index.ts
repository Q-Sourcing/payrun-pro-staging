import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

type AuditLogRow = {
  id: string;
  integration_name: string | null;
  action: string | null;
  user_id: string | null;
  resource: string | null;
  details: unknown;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string | null;
  created_at: string | null;
  result: string | null;
};

function clampInt(value: string | null, def: number, min: number, max: number) {
  const n = value ? Number.parseInt(value, 10) : def;
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const auth = await requirePlatformAdmin(supabaseAdmin, req);
    if (!auth.ok) return auth.response;

    if (req.method !== "GET") {
      return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(req.url);
    const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
    const offset = clampInt(url.searchParams.get("offset"), 0, 0, 50_000);

    const action = url.searchParams.get("action");
    const userId = url.searchParams.get("user_id");
    const resource = url.searchParams.get("resource");
    const result = url.searchParams.get("result");
    const from = url.searchParams.get("from"); // ISO
    const to = url.searchParams.get("to"); // ISO

    let q = supabaseAdmin
      .from("audit_logs")
      .select(
        "id, integration_name, action, user_id, resource, details, ip_address, user_agent, timestamp, created_at, result",
        { count: "exact" },
      )
      .order("timestamp", { ascending: false });

    if (action) q = q.ilike("action", `%${action}%`);
    if (resource) q = q.ilike("resource", `%${resource}%`);
    if (userId) q = q.eq("user_id", userId);
    if (result) q = q.eq("result", result);
    if (from) q = q.gte("timestamp", from);
    if (to) q = q.lte("timestamp", to);

    const { data, error, count } = await q.range(offset, offset + limit - 1).returns<AuditLogRow[]>();

    if (error) {
      return jsonResponse({ success: false, message: "Failed to load audit logs", error }, { status: 500 });
    }

    return jsonResponse(
      {
        success: true,
        logs: data ?? [],
        page: { limit, offset, count: count ?? null },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("platform-admin-audit-logs error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});








