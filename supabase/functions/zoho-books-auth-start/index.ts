import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import { createServiceRoleClient, handleCorsPreflight, jsonResponse } from "../_shared/platform-admin-auth.ts";
import { buildBooksAuthorizationUrl, createBooksSignedState, requireCompanyIntegrationAccess } from "../_shared/zoho-books.ts";

const PayloadSchema = z.object({
  companyId: z.string().uuid(),
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

    const { companyId } = parsed.data;
    const supabaseAdmin = createServiceRoleClient();
    const { user } = await requireCompanyIntegrationAccess(supabaseAdmin, req, companyId);

    const state = await createBooksSignedState({
      companyId,
      userId: user.id,
      ts: Date.now(),
      nonce: crypto.randomUUID(),
    });

    return jsonResponse(
      { success: true, authUrl: buildBooksAuthorizationUrl(state) },
      { status: 200 },
    );
  } catch (error) {
    console.error("zoho-books-auth-start error:", error);
    return jsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Failed to start Zoho Books auth" },
      { status: 500 },
    );
  }
});
