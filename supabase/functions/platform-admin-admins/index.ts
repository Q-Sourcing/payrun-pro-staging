import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { z } from "https://esm.sh/zod@3.22.4";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

const UpsertAdminSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200).optional().nullable(),
  role: z.enum(["super_admin", "support_admin", "compliance", "billing"]).optional(),
  allowed: z.boolean().optional(),
});

type PlatformAdminRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  allowed: boolean;
  created_at: string | null;
  updated_at: string | null;
};

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const auth = await requirePlatformAdmin(supabaseAdmin, req);
    if (!auth.ok) return auth.response;

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("platform_admins")
        .select("id, auth_user_id, email, full_name, role, allowed, created_at, updated_at")
        .order("created_at", { ascending: false })
        .returns<PlatformAdminRow[]>();

      if (error) {
        return jsonResponse({ success: false, message: "Failed to load platform admins", error }, { status: 500 });
      }
      return jsonResponse({ success: true, admins: data ?? [] }, { status: 200 });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const parsed = UpsertAdminSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }

      const payload = parsed.data;
      const upsertPayload = {
        email: payload.email.toLowerCase(),
        full_name: payload.full_name ?? null,
        role: payload.role ?? "support_admin",
        allowed: payload.allowed ?? true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("platform_admins")
        .upsert(upsertPayload, { onConflict: "email" })
        .select("id, auth_user_id, email, full_name, role, allowed, created_at, updated_at")
        .maybeSingle<PlatformAdminRow>();

      if (error) {
        return jsonResponse({ success: false, message: "Failed to upsert platform admin", error }, { status: 500 });
      }
      return jsonResponse({ success: true, admin: data }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("platform-admin-admins error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});



