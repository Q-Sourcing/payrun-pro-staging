import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

const UpdateSchema = z.object({
  org_id: z.string().uuid(),
  seat_limit: z.number().int().min(0),
  features: z.record(z.any()).optional(),
});

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const auth = await requirePlatformAdmin(supabaseAdmin, req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");

    if (req.method === "GET") {
      if (!orgId) return jsonResponse({ success: false, message: "org_id required" }, { status: 400 });
      const { data, error } = await supabaseAdmin.from("org_licenses").select("*").eq("org_id", orgId).maybeSingle();
      if (error) return jsonResponse({ success: false, message: "Failed to load license", error }, { status: 500 });
      return jsonResponse({ success: true, license: data }, { status: 200 });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const parsed = UpdateSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }
      const payload = parsed.data;
      const { error } = await supabaseAdmin
        .from("org_licenses")
        .upsert({
          org_id: payload.org_id,
          seat_limit: payload.seat_limit,
          features: payload.features ?? {},
          updated_at: new Date().toISOString(),
        });
      if (error) return jsonResponse({ success: false, message: "Failed to update license", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("platform-admin-org-license error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});








