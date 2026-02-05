import { callEdgeFunction } from "@/api/edge";

export type PlatformAdmin = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: "super_admin" | "support_admin" | "compliance" | "billing" | string;
  allowed: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type PlatformAdminDevice = {
  id: string;
  admin_id: string;
  device_id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  approved: boolean;
  created_at: string | null;
  updated_at: string | null;
  platform_admins?: { email: string; full_name: string | null; role: string } | null;
};

export async function listPlatformAdmins(): Promise<PlatformAdmin[]> {
  const res = await callEdgeFunction<{ success: boolean; admins: PlatformAdmin[] }>("platform-admin-admins");
  return res.admins ?? [];
}

export async function upsertPlatformAdmin(payload: {
  email: string;
  full_name?: string | null;
  role?: "super_admin" | "support_admin" | "compliance" | "billing";
  allowed?: boolean;
}): Promise<PlatformAdmin | null> {
  const res = await callEdgeFunction<{ success: boolean; admin: PlatformAdmin | null }>("platform-admin-admins", {
    method: "POST",
    body: payload,
  });
  return res.admin ?? null;
}

export async function listPlatformAdminDevices(): Promise<PlatformAdminDevice[]> {
  const res = await callEdgeFunction<{ success: boolean; devices: PlatformAdminDevice[] }>("platform-admin-devices");
  return res.devices ?? [];
}

export async function setDeviceApproval(device_id: string, approved: boolean): Promise<PlatformAdminDevice | null> {
  const res = await callEdgeFunction<{ success: boolean; device: PlatformAdminDevice | null }>("platform-admin-devices", {
    method: "POST",
    body: { device_id, approved },
  });
  return res.device ?? null;
}








