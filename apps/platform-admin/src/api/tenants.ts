import { callEdgeFunction } from "@/api/edge";

export type OrganizationTenant = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  companies_count: number;
  created_at: string | null;
};

export type Company = {
  id: string;
  organization_id: string;
  name: string;
  country_id: string | null;
  currency: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function fetchTenants(): Promise<OrganizationTenant[]> {
  const res = await callEdgeFunction<{ success: boolean; organizations: OrganizationTenant[] }>(
    "platform-admin-organizations",
  );
  return res.organizations ?? [];
}

export async function fetchTenant(id: string): Promise<{ organization: OrganizationTenant; companies: Company[] } | null> {
  const res = await callEdgeFunction<{ success: boolean; organization: OrganizationTenant; companies: Company[] }>(
    "platform-admin-organizations",
    { query: { id } },
  );
  return res.organization ? { organization: res.organization, companies: res.companies ?? [] } : null;
}



