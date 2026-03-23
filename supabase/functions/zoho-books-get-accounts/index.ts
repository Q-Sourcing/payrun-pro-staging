import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import { createServiceRoleClient, handleCorsPreflight, jsonResponse } from "../_shared/platform-admin-auth.ts";
import { booksFetch, getValidBooksAccessToken, requireCompanyIntegrationAccess } from "../_shared/zoho-books.ts";

const PayloadSchema = z.object({
  companyId: z.string().uuid(),
  // Optional filter: 'asset', 'liability', 'equity', 'income', 'expense'
  accountType: z.string().optional(),
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
      return jsonResponse({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const { companyId, accountType } = parsed.data;
    const supabaseAdmin = createServiceRoleClient();
    await requireCompanyIntegrationAccess(supabaseAdmin, req, companyId);

    const { accessToken, booksBaseUrl, zohoBooksOrgId } = await getValidBooksAccessToken(supabaseAdmin, companyId);

    if (!zohoBooksOrgId) {
      return jsonResponse(
        { success: false, message: "Zoho Books organization ID not found. Please reconnect." },
        { status: 400 },
      );
    }

    // Fetch chart of accounts — paginate if needed (Zoho Books returns up to 200 per page)
    const params = new URLSearchParams({ per_page: "200" });
    if (accountType) params.set("account_type", accountType);

    const data = await booksFetch(
      `/chartofaccounts?${params.toString()}`,
      accessToken,
      zohoBooksOrgId,
      booksBaseUrl,
    ) as any;

    const accounts = (data?.chartofaccounts ?? []).map((acc: any) => ({
      id: acc.account_id,
      name: acc.account_name,
      code: acc.account_code ?? null,
      type: acc.account_type,
      currency: acc.currency_id ?? null,
      isActive: acc.is_active ?? true,
    }));

    return jsonResponse({ success: true, accounts }, { status: 200 });
  } catch (error) {
    console.error("zoho-books-get-accounts error:", error);
    return jsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch chart of accounts" },
      { status: 500 },
    );
  }
});
