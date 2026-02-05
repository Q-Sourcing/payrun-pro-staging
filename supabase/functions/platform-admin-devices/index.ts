import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { z } from "https://esm.sh/zod@3.22.4";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

const UpdateDeviceSchema = z.object({
  device_id: z.string().min(1),
  approved: z.boolean(),
});

type DeviceRow = {
  id: string;
  admin_id: string;
  device_id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  approved: boolean;
  created_at: string | null;
  updated_at: string | null;
  platform_admins?: {
    email: string;
    full_name: string | null;
    role: string;
  } | null;
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
        .from("platform_admin_devices")
        .select(
          "id, admin_id, device_id, device_name, browser, os, approved, created_at, updated_at, platform_admins:admin_id (email, full_name, role)",
        )
        .order("created_at", { ascending: false })
        .returns<DeviceRow[]>();

      if (error) {
        return jsonResponse({ success: false, message: "Failed to load devices", error }, { status: 500 });
      }
      return jsonResponse({ success: true, devices: data ?? [] }, { status: 200 });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const parsed = UpdateDeviceSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }

      const { device_id, approved } = parsed.data;
      const { data, error } = await supabaseAdmin
        .from("platform_admin_devices")
        .update({ approved, updated_at: new Date().toISOString() })
        .eq("device_id", device_id)
        .select(
          "id, admin_id, device_id, device_name, browser, os, approved, created_at, updated_at, platform_admins:admin_id (email, full_name, role)",
        )
        .maybeSingle<DeviceRow>();

      if (error) {
        return jsonResponse({ success: false, message: "Failed to update device", error }, { status: 500 });
      }
      return jsonResponse({ success: true, device: data }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("platform-admin-devices error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});








