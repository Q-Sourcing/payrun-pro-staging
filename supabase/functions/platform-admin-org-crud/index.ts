import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  active: z.boolean().optional(),
});

const UpdateOrgSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  active: z.boolean().optional(),
});

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const auth = await requirePlatformAdmin(supabaseAdmin, req);
    if (!auth.ok) return auth.response;

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const parsed = CreateOrgSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }

      const payload = parsed.data;
      const { data, error } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: payload.name,
          description: payload.description ?? null,
          active: payload.active ?? true,
        })
        .select("id, name, description, active, created_at, updated_at")
        .maybeSingle();

      if (error) {
        return jsonResponse({ success: false, message: "Failed to create organization", error }, { status: 500 });
      }
      return jsonResponse({ success: true, organization: data }, { status: 200 });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const parsed = UpdateOrgSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }

      const { id, ...rest } = parsed.data;
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (rest.name !== undefined) updatePayload.name = rest.name;
      if (rest.description !== undefined) updatePayload.description = rest.description;
      if (rest.active !== undefined) updatePayload.active = rest.active;

      const { data, error } = await supabaseAdmin
        .from("organizations")
        .update(updatePayload)
        .eq("id", id)
        .select("id, name, description, active, created_at, updated_at")
        .maybeSingle();

      if (error) {
        return jsonResponse({ success: false, message: "Failed to update organization", error }, { status: 500 });
      }
      return jsonResponse({ success: true, organization: data }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("platform-admin-org-crud error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});



