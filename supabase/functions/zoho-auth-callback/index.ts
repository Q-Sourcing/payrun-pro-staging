import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createServiceRoleClient, handleCorsPreflight } from "../_shared/platform-admin-auth.ts";
import {
  ZOHO_INTEGRATION_NAME,
  exchangeAuthorizationCode,
  formatCallbackHtml,
  getZohoTokenRow,
  getZohoConfig,
  upsertZohoTokens,
  verifySignedState,
} from "../_shared/zoho.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(formatCallbackHtml(`Zoho returned an error: ${error}`, true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!code || !state) {
      return new Response(formatCallbackHtml("Missing authorization code or state.", true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const parsedState = await verifySignedState(state);
    if (!parsedState?.organizationId || !parsedState?.userId) {
      return new Response(formatCallbackHtml("Invalid or expired state.", true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const timestamp = Number(parsedState.ts || 0);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 15 * 60_000) {
      return new Response(formatCallbackHtml("The Zoho connection request expired. Please try again.", true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const tokenResponse = await exchangeAuthorizationCode(code);
    const supabaseAdmin = createServiceRoleClient();
    const organizationId = String(parsedState.organizationId);
    const userId = String(parsedState.userId);
    const existingTokens = await getZohoTokenRow(supabaseAdmin, organizationId);

    await upsertZohoTokens(supabaseAdmin, {
      organizationId,
      userId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || existingTokens?.refresh_token || "",
      expiresInSeconds: tokenResponse.expires_in,
      apiDomain: tokenResponse.api_domain ?? getZohoConfig().peopleBaseUrl,
      scope: tokenResponse.scope ?? getZohoConfig().scope,
    });

    const syncConfigPayload = {
      organization_id: organizationId,
      integration_name: ZOHO_INTEGRATION_NAME,
      name: "Zoho People Employee Sync",
      enabled: true,
      frequency: "manual",
      direction: "bidirectional",
      data_mapping: {
        employeeId: "EmployeeID",
        email: "EmailID",
        personalEmail: "Other_Email",
        workPhone: "Work_phone",
        mobile: "Mobile",
      },
      filters: {},
      retry_attempts: 3,
      timeout: 30000,
      updated_at: new Date().toISOString(),
    };

    const { data: existingConfig } = await (supabaseAdmin as any)
      .from("sync_configurations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("integration_name", ZOHO_INTEGRATION_NAME)
      .eq("name", "Zoho People Employee Sync")
      .maybeSingle();

    if (existingConfig?.id) {
      await (supabaseAdmin as any)
        .from("sync_configurations")
        .update(syncConfigPayload)
        .eq("id", existingConfig.id);
    } else {
      await (supabaseAdmin as any).from("sync_configurations").insert(syncConfigPayload);
    }

    return new Response(
      formatCallbackHtml("Zoho People was connected successfully for this organization."),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  } catch (error) {
    console.error("zoho-auth-callback error:", error);
    return new Response(
      formatCallbackHtml(error instanceof Error ? error.message : "Failed to complete Zoho connection", true),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
});
