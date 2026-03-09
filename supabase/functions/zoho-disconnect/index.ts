import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import { createServiceRoleClient, handleCorsPreflight, jsonResponse } from "../_shared/platform-admin-auth.ts";
import { ZOHO_INTEGRATION_NAME, requireOrgIntegrationAccess } from "../_shared/zoho.ts";

const PayloadSchema = z.object({
  organizationId: z.string().uuid(),
});

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { organizationId } = parsed.data;
    const supabaseAdmin = createServiceRoleClient();
    await requireOrgIntegrationAccess(supabaseAdmin, req, organizationId);

    const now = new Date().toISOString();
    await (supabaseAdmin as any)
      .from("sync_configurations")
      .update({ enabled: false, updated_at: now })
      .eq("organization_id", organizationId)
      .eq("integration_name", ZOHO_INTEGRATION_NAME);

    const { error } = await supabaseAdmin
      .from("integration_tokens")
      .delete()
      .eq("organization_id", organizationId)
      .eq("integration_name", ZOHO_INTEGRATION_NAME);

    if (error) throw error;

    return jsonResponse({ success: true, message: "Zoho People disconnected successfully" }, { status: 200 });
  } catch (error) {
    console.error("zoho-disconnect error:", error);
    return jsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Failed to disconnect Zoho People" },
      { status: 500 },
    );
  }
});
