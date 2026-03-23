import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createServiceRoleClient, handleCorsPreflight } from "../_shared/platform-admin-auth.ts";
import {
  exchangeBooksAuthorizationCode,
  formatBooksCallbackHtml,
  upsertBooksTokens,
  verifyBooksSignedState,
  booksFetch,
  getZohoBooksConfig,
} from "../_shared/zoho-books.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    if (errorParam) {
      return new Response(formatBooksCallbackHtml(`Zoho returned an error: ${errorParam}`, true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!code || !state) {
      return new Response(formatBooksCallbackHtml("Missing authorization code or state.", true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const parsedState = await verifyBooksSignedState(state);
    if (!parsedState?.companyId || !parsedState?.userId) {
      return new Response(formatBooksCallbackHtml("Invalid or expired state. Please try again.", true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const timestamp = Number(parsedState.ts || 0);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 15 * 60_000) {
      return new Response(formatBooksCallbackHtml("The connection request expired. Please try again.", true), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const tokenResponse = await exchangeBooksAuthorizationCode(code);
    const supabaseAdmin = createServiceRoleClient();
    const companyId = String(parsedState.companyId);
    const userId = String(parsedState.userId);
    const config = getZohoBooksConfig();

    // Fetch the Zoho Books organizations this token has access to
    // We pick the first one — if they have multiple Books orgs, we'll handle that in settings later
    let zohoBooksOrgId: string | null = null;
    let zohoBooksOrgName: string | null = null;

    try {
      const orgsResponse = await fetch(
        `${tokenResponse.api_domain ?? config.booksBaseUrl}/books/v3/organizations`,
        {
          headers: { Authorization: `Zoho-oauthtoken ${tokenResponse.access_token}` },
        },
      ) as any;
      const orgsData = await orgsResponse.json().catch(() => null);
      const orgs = orgsData?.organizations ?? [];
      if (orgs.length > 0) {
        zohoBooksOrgId = orgs[0].organization_id;
        zohoBooksOrgName = orgs[0].name;
      }
    } catch (e) {
      console.warn("Could not fetch Zoho Books organizations:", e);
    }

    await upsertBooksTokens(supabaseAdmin, {
      companyId,
      userId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? "",
      expiresInSeconds: tokenResponse.expires_in,
      apiDomain: tokenResponse.api_domain ?? config.booksBaseUrl,
      scope: tokenResponse.scope ?? config.scope,
      zohoBooksOrgId,
      zohoBooksOrgName,
    });

    const orgLabel = zohoBooksOrgName ? ` (${zohoBooksOrgName})` : "";
    return new Response(
      formatBooksCallbackHtml(`Zoho Books${orgLabel} was connected successfully for this company.`),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (error) {
    console.error("zoho-books-auth-callback error:", error);
    return new Response(
      formatBooksCallbackHtml(
        error instanceof Error ? error.message : "Failed to complete Zoho Books connection",
        true,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
});
