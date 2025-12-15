import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function handleCorsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }
  return null;
}

export function createServiceRoleClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type PlatformAdminRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  allowed: boolean;
};

export async function requirePlatformAdmin(supabaseAdmin: ReturnType<typeof createServiceRoleClient>, req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      ok: false as const,
      response: jsonResponse({ success: false, message: "Authorization header required" }, { status: 401 }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      ok: false as const,
      response: jsonResponse({ success: false, message: "Invalid authentication token" }, { status: 401 }),
    };
  }

  const email = user.email ?? null;
  if (!email) {
    return {
      ok: false as const,
      response: jsonResponse({ success: false, message: "User email is missing" }, { status: 401 }),
    };
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("platform_admins")
    .select("id, auth_user_id, email, full_name, role, allowed")
    .eq("email", email)
    .maybeSingle<PlatformAdminRow>();

  if (adminError) {
    return {
      ok: false as const,
      response: jsonResponse({ success: false, message: "Failed to verify platform admin", error: adminError }, { status: 500 }),
    };
  }

  if (!admin) {
    return {
      ok: false as const,
      response: jsonResponse({ success: false, message: "Not authorized as platform admin" }, { status: 403 }),
    };
  }

  if (!admin.allowed) {
    return {
      ok: false as const,
      response: jsonResponse({ success: false, message: "Platform admin account disabled" }, { status: 403 }),
    };
  }

  // Best-effort: link auth user to platform admin record if missing.
  if (!admin.auth_user_id) {
    await supabaseAdmin.from("platform_admins").update({ auth_user_id: user.id }).eq("id", admin.id);
  }

  return { ok: true as const, user, admin };
}


