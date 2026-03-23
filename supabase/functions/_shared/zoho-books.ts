import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { exchangeAuthorizationCode, refreshAccessToken, createSignedState, verifySignedState, zohoFetch } from "./zoho.ts";

export const ZOHO_BOOKS_INTEGRATION_NAME = "zoho_books";

// Zoho Books API scopes required
const BOOKS_SCOPE =
  "ZohoBooks.journals.CREATE,ZohoBooks.journals.READ,ZohoBooks.accountants.READ,ZohoBooks.settings.READ,ZohoBooks.contacts.READ";

export type ZohoBooksTokenRow = {
  id: string;
  company_id: string;
  integration_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  api_domain: string | null;
  scope: string | null;
  connected_by: string | null;
  metadata: {
    zoho_books_org_id?: string;
    zoho_books_org_name?: string;
  } | null;
};

export type ZohoBooksConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  accountsBaseUrl: string;
  booksBaseUrl: string;
};

export function getZohoBooksConfig(): ZohoBooksConfig {
  const clientId = Deno.env.get("ZOHO_BOOKS_CLIENT_ID") ?? Deno.env.get("ZOHO_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("ZOHO_BOOKS_CLIENT_SECRET") ?? Deno.env.get("ZOHO_CLIENT_SECRET") ?? "";
  const redirectUri = Deno.env.get("ZOHO_BOOKS_REDIRECT_URI") ?? "";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Zoho Books env vars: ZOHO_BOOKS_CLIENT_ID, ZOHO_BOOKS_CLIENT_SECRET, ZOHO_BOOKS_REDIRECT_URI");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope: Deno.env.get("ZOHO_BOOKS_SCOPE") ?? BOOKS_SCOPE,
    accountsBaseUrl: Deno.env.get("ZOHO_ACCOUNTS_BASE_URL") ?? "https://accounts.zoho.com",
    booksBaseUrl: Deno.env.get("ZOHO_BOOKS_BASE_URL") ?? "https://www.zohoapis.com/books/v3",
  };
}

export function buildBooksAuthorizationUrl(state: string): string {
  const config = getZohoBooksConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: config.scope,
    redirect_uri: config.redirectUri,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${config.accountsBaseUrl}/oauth/v2/auth?${params.toString()}`;
}

export async function createBooksSignedState(payload: Record<string, unknown>): Promise<string> {
  return createSignedState({ ...payload, integration: "zoho_books" });
}

export async function verifyBooksSignedState(state: string): Promise<Record<string, unknown> | null> {
  const parsed = await verifySignedState(state);
  if (!parsed || parsed.integration !== "zoho_books") return null;
  return parsed;
}

export async function exchangeBooksAuthorizationCode(code: string) {
  const config = getZohoBooksConfig();
  // Override env vars temporarily is not feasible in Deno — call the token endpoint directly
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(`${config.accountsBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Failed to exchange Zoho Books token");
  }

  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    api_domain?: string;
    token_type?: string;
    scope?: string;
  };
}

export async function refreshBooksAccessToken(refreshToken: string) {
  const config = getZohoBooksConfig();
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(`${config.accountsBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Failed to refresh Zoho Books token");
  }

  return data as {
    access_token: string;
    expires_in: number;
    api_domain?: string;
    scope?: string;
  };
}

export async function getBooksTokenRow(supabaseAdmin: SupabaseClient, companyId: string): Promise<ZohoBooksTokenRow | null> {
  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .select("*")
    .eq("company_id", companyId)
    .eq("integration_name", ZOHO_BOOKS_INTEGRATION_NAME)
    .maybeSingle();

  if (error) throw error;
  return data as ZohoBooksTokenRow | null;
}

export async function upsertBooksTokens(
  supabaseAdmin: SupabaseClient,
  {
    companyId,
    userId,
    accessToken,
    refreshToken,
    expiresInSeconds,
    apiDomain,
    scope,
    zohoBooksOrgId,
    zohoBooksOrgName,
  }: {
    companyId: string;
    userId?: string | null;
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
    apiDomain?: string | null;
    scope?: string | null;
    zohoBooksOrgId?: string | null;
    zohoBooksOrgName?: string | null;
  },
) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const config = getZohoBooksConfig();

  const metadata: Record<string, string> = {};
  if (zohoBooksOrgId) metadata.zoho_books_org_id = zohoBooksOrgId;
  if (zohoBooksOrgName) metadata.zoho_books_org_name = zohoBooksOrgName;

  const payload = {
    company_id: companyId,
    integration_name: ZOHO_BOOKS_INTEGRATION_NAME,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    token_type: "Bearer",
    api_domain: apiDomain ?? config.booksBaseUrl,
    scope: scope ?? config.scope,
    connected_by: userId ?? null,
    metadata,
    updated_at: new Date().toISOString(),
  };

  const existing = await getBooksTokenRow(supabaseAdmin, companyId);

  if (existing) {
    const { error } = await supabaseAdmin
      .from("integration_tokens")
      .update(payload)
      .eq("company_id", companyId)
      .eq("integration_name", ZOHO_BOOKS_INTEGRATION_NAME);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("integration_tokens").insert(payload);
    if (error) throw error;
  }
}

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export async function getValidBooksAccessToken(supabaseAdmin: SupabaseClient, companyId: string) {
  const current = await getBooksTokenRow(supabaseAdmin, companyId);
  if (!current) {
    throw new Error("Zoho Books is not connected for this company");
  }

  const expiresAt = new Date(current.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return {
      accessToken: current.access_token,
      booksBaseUrl: current.api_domain || getZohoBooksConfig().booksBaseUrl,
      zohoBooksOrgId: current.metadata?.zoho_books_org_id ?? null,
      tokenRow: current,
    };
  }

  const refreshed = await refreshBooksAccessToken(current.refresh_token);

  await upsertBooksTokens(supabaseAdmin, {
    companyId,
    userId: current.connected_by,
    accessToken: refreshed.access_token,
    refreshToken: current.refresh_token,
    expiresInSeconds: refreshed.expires_in,
    apiDomain: refreshed.api_domain ?? current.api_domain,
    scope: refreshed.scope ?? current.scope,
    zohoBooksOrgId: current.metadata?.zoho_books_org_id,
    zohoBooksOrgName: current.metadata?.zoho_books_org_name,
  });

  return {
    accessToken: refreshed.access_token,
    booksBaseUrl: refreshed.api_domain || current.api_domain || getZohoBooksConfig().booksBaseUrl,
    zohoBooksOrgId: current.metadata?.zoho_books_org_id ?? null,
    tokenRow: current,
  };
}

export async function booksFetch(
  path: string,
  accessToken: string,
  zohoBooksOrgId: string,
  booksBaseUrl: string,
  init?: RequestInit,
) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${booksBaseUrl}${path}${separator}organization_id=${zohoBooksOrgId}`;
  return zohoFetch(url, accessToken, init);
}

export async function requireCompanyIntegrationAccess(
  supabaseAdmin: SupabaseClient,
  req: Request,
  companyId: string,
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Authorization header required");

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Invalid authentication token");

  // Verify user belongs to the organization that owns this company
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("organization_id")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) throw new Error("Company not found");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const allowedRoles = new Set(["super_admin", "admin", "org_admin", "organization_admin"]);
  if (
    profile?.organization_id !== company.organization_id ||
    !allowedRoles.has(String(profile?.role || ""))
  ) {
    throw new Error("You do not have permission to manage Zoho Books for this company");
  }

  return { user };
}

export function formatBooksCallbackHtml(message: string, isError = false) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zoho Books Connection</title>
    <style>
      body { font-family: Arial, sans-serif; background: #0b1020; color: #fff; margin: 0; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { max-width: 520px; width: 100%; background: #131a2d; border: 1px solid #2f3a55; border-radius: 14px; padding: 24px; }
      h1 { margin-top: 0; font-size: 20px; }
      p { color: #c7d2e6; line-height: 1.5; }
      .status { color: ${isError ? "#fca5a5" : "#86efac"}; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Zoho Books Connection</h1>
        <p class="status">${isError ? "Connection failed" : "Connection successful"}</p>
        <p>${message}</p>
        <p>You can close this tab and return to PayrunPro.</p>
      </div>
    </div>
  </body>
</html>`;
}
