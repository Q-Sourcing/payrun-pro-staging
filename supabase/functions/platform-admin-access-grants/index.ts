import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

const CreateSchema = z.object({
  org_id: z.string().uuid(),
  scope_type: z.string().min(1),
  scope_key: z.string().min(1),
  effect: z.enum(["allow", "deny"]),
  user_id: z.string().uuid().optional().nullable(),
  role_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  scope_type: z.string().min(1).optional(),
  scope_key: z.string().min(1).optional(),
  effect: z.enum(["allow", "deny"]).optional(),
  user_id: z.string().uuid().optional().nullable(),
  role_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
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
      const { data, error } = await supabaseAdmin
        .from("access_grants")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ success: false, message: "Failed to load access grants", error }, { status: 500 });
      return jsonResponse({ success: true, grants: data ?? [] }, { status: 200 });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const parsed = CreateSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }
      const payload = parsed.data;
      const { error } = await supabaseAdmin.from("access_grants").insert({
        org_id: payload.org_id,
        scope_type: payload.scope_type,
        scope_key: payload.scope_key,
        effect: payload.effect,
        user_id: payload.user_id ?? null,
        role_id: payload.role_id ?? null,
        company_id: payload.company_id ?? null,
        reason: payload.reason ?? null,
      });
      if (error) return jsonResponse({ success: false, message: "Failed to create access grant", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const parsed = UpdateSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }
      const payload = parsed.data;
      const update: Record<string, unknown> = {};
      if (payload.scope_type !== undefined) update.scope_type = payload.scope_type;
      if (payload.scope_key !== undefined) update.scope_key = payload.scope_key;
      if (payload.effect !== undefined) update.effect = payload.effect;
      if (payload.user_id !== undefined) update.user_id = payload.user_id;
      if (payload.role_id !== undefined) update.role_id = payload.role_id;
      if (payload.company_id !== undefined) update.company_id = payload.company_id;
      if (payload.reason !== undefined) update.reason = payload.reason;

      const { error } = await supabaseAdmin.from("access_grants").update(update).eq("id", payload.id);
      if (error) return jsonResponse({ success: false, message: "Failed to update access grant", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return jsonResponse({ success: false, message: "id required" }, { status: 400 });
      const { error } = await supabaseAdmin.from("access_grants").delete().eq("id", id);
      if (error) return jsonResponse({ success: false, message: "Failed to delete access grant", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("platform-admin-access-grants error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});








