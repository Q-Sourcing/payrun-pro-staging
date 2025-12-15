import { callEdgeFunction } from "@/api/edge";

export type Org = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function createOrg(payload: { name: string; description?: string | null; active?: boolean }) {
  const res = await callEdgeFunction<{ success: boolean; organization: Org }>("platform-admin-org-crud", {
    method: "POST",
    body: payload,
  });
  return res.organization;
}

export async function updateOrg(payload: { id: string; name?: string; description?: string | null; active?: boolean }) {
  const res = await callEdgeFunction<{ success: boolean; organization: Org }>("platform-admin-org-crud", {
    method: "PATCH",
    body: payload,
  });
  return res.organization;
}



