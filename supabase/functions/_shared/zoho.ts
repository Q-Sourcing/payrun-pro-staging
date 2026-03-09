import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export const ZOHO_INTEGRATION_NAME = "zoho_people";
const DEFAULT_SCOPE = "ZOHOPEOPLE.forms.READ,ZOHOPEOPLE.forms.CREATE,ZOHOPEOPLE.forms.UPDATE";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

export type ZohoTokenRow = {
  id: string;
  organization_id: string | null;
  integration_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string | null;
  api_domain: string | null;
  scope: string | null;
  connected_by: string | null;
  metadata: Record<string, unknown> | null;
};

export type ZohoConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  accountsBaseUrl: string;
  peopleBaseUrl: string;
  employeeViewName: string;
  employeeFormLink: string;
};

export function getZohoConfig(): ZohoConfig {
  const clientId = Deno.env.get("ZOHO_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET") ?? "";
  const redirectUri = Deno.env.get("ZOHO_REDIRECT_URI") ?? "";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Zoho env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REDIRECT_URI");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope: Deno.env.get("ZOHO_SCOPE") ?? DEFAULT_SCOPE,
    accountsBaseUrl: Deno.env.get("ZOHO_ACCOUNTS_BASE_URL") ?? "https://accounts.zoho.com",
    peopleBaseUrl: Deno.env.get("ZOHO_PEOPLE_BASE_URL") ?? "https://people.zoho.com",
    employeeViewName: Deno.env.get("ZOHO_EMPLOYEE_VIEW_NAME") ?? "P_EmployeeView",
    employeeFormLink: Deno.env.get("ZOHO_EMPLOYEE_FORM_LINK") ?? "employee",
  };
}

function encodeBase64Url(input: Uint8Array): string {
  const binary = String.fromCharCode(...input);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4 || 4)) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function createSignedState(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get("ZOHO_STATE_SECRET") ?? getZohoConfig().clientSecret;
  const raw = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSha256(secret, raw);
  return `${raw}.${signature}`;
}

export async function verifySignedState(state: string): Promise<Record<string, unknown> | null> {
  const [raw, signature] = state.split(".");
  if (!raw || !signature) return null;

  const secret = Deno.env.get("ZOHO_STATE_SECRET") ?? getZohoConfig().clientSecret;
  const expected = await hmacSha256(secret, raw);
  if (expected !== signature) return null;

  try {
    const decoded = new TextDecoder().decode(decodeBase64Url(raw));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildAuthorizationUrl(state: string): string {
  const config = getZohoConfig();
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

async function exchangeToken(params: URLSearchParams) {
  const config = getZohoConfig();
  const response = await fetch(`${config.accountsBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error || data?.error_description || "Failed to exchange Zoho token");
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

export async function exchangeAuthorizationCode(code: string) {
  const config = getZohoConfig();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  return exchangeToken(params);
}

export async function refreshAccessToken(refreshToken: string) {
  const config = getZohoConfig();
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  return exchangeToken(params);
}

export async function getZohoTokenRow(supabaseAdmin: SupabaseClient, organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("integration_name", ZOHO_INTEGRATION_NAME)
    .maybeSingle();

  if (error) throw error;
  return data as ZohoTokenRow | null;
}

export async function upsertZohoTokens(
  supabaseAdmin: SupabaseClient,
  {
    organizationId,
    userId,
    accessToken,
    refreshToken,
    expiresInSeconds,
    apiDomain,
    scope,
  }: {
    organizationId: string;
    userId?: string | null;
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
    apiDomain?: string | null;
    scope?: string | null;
  },
) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const payload = {
    organization_id: organizationId,
    integration_name: ZOHO_INTEGRATION_NAME,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    token_type: "Bearer",
    api_domain: apiDomain ?? getZohoConfig().peopleBaseUrl,
    scope: scope ?? getZohoConfig().scope,
    connected_by: userId ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("integration_tokens")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("integration_name", ZOHO_INTEGRATION_NAME)
    .limit(1);

  if (existingError) throw existingError;

  if ((existingRows?.length ?? 0) > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("integration_tokens")
      .update(payload)
      .eq("organization_id", organizationId)
      .eq("integration_name", ZOHO_INTEGRATION_NAME);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabaseAdmin.from("integration_tokens").insert(payload);

  if (insertError) throw insertError;
}

export async function getValidZohoAccessToken(supabaseAdmin: SupabaseClient, organizationId: string) {
  const current = await getZohoTokenRow(supabaseAdmin, organizationId);
  if (!current) {
    throw new Error("Zoho People is not connected for this organization");
  }

  const expiresAt = new Date(current.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return {
      accessToken: current.access_token,
      apiDomain: current.api_domain || getZohoConfig().peopleBaseUrl,
      tokenRow: current,
    };
  }

  const refreshed = await refreshAccessToken(current.refresh_token);

  await upsertZohoTokens(supabaseAdmin, {
    organizationId,
    userId: current.connected_by,
    accessToken: refreshed.access_token,
    refreshToken: current.refresh_token,
    expiresInSeconds: refreshed.expires_in,
    apiDomain: refreshed.api_domain ?? current.api_domain,
    scope: refreshed.scope ?? current.scope,
  });

  return {
    accessToken: refreshed.access_token,
    apiDomain: refreshed.api_domain || current.api_domain || getZohoConfig().peopleBaseUrl,
    tokenRow: {
      ...current,
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      api_domain: refreshed.api_domain ?? current.api_domain,
      scope: refreshed.scope ?? current.scope,
    },
  };
}

export async function zohoFetch(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Some Zoho endpoints return plain text. Keep raw text.
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "response" in data
        ? JSON.stringify(data)
        : typeof data === "string"
          ? data
          : "Zoho request failed";
    throw new Error(message);
  }

  return data;
}

export function getRecordValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

export function buildZohoEmployeePayload(input: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ""),
  );
}

export function formatCallbackHtml(message: string, isError = false) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zoho People Connection</title>
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
        <h1>Zoho People Connection</h1>
        <p class="status">${isError ? "Connection failed" : "Connection successful"}</p>
        <p>${message}</p>
        <p>You can close this tab and return to Q-Payroll.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function requireOrgIntegrationAccess(
  supabaseAdmin: SupabaseClient,
  req: Request,
  organizationId: string,
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Authorization header required");
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid authentication token");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const allowedRoles = new Set(["super_admin", "admin", "org_admin", "organization_admin"]);
  const orgMatches = profile?.organization_id === organizationId;
  const roleMatches = allowedRoles.has(String(profile?.role || ""));

  if (!orgMatches || !roleMatches) {
    throw new Error("You do not have permission to manage Zoho integration for this organization");
  }

  return { user: user as User };
}
