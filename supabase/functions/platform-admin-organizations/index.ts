import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

type OrgRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type CompanyRow = {
  id: string;
  organization_id: string;
  name: string;
  country_id: string | null;
  currency: string | null;
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

    if (req.method !== "GET") {
      return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("id, name, description, active, created_at, updated_at")
        .eq("id", id)
        .maybeSingle<OrgRow>();

      if (orgError) {
        return jsonResponse({ success: false, message: "Failed to load organization", error: orgError }, { status: 500 });
      }
      if (!org) {
        return jsonResponse({ success: false, message: "Organization not found" }, { status: 404 });
      }

      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id, organization_id, name, country_id, currency, created_at, updated_at")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .returns<CompanyRow[]>();

      if (companiesError) {
        return jsonResponse({ success: false, message: "Failed to load companies", error: companiesError }, { status: 500 });
      }

      return jsonResponse({ success: true, organization: org, companies: companies ?? [] }, { status: 200 });
    }

    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, description, active, created_at, updated_at")
      .order("created_at", { ascending: false })
      .returns<OrgRow[]>();

    if (orgsError) {
      return jsonResponse({ success: false, message: "Failed to load organizations", error: orgsError }, { status: 500 });
    }

    // Best-effort: compute companies count without doing N+1 queries
    const { data: companyRefs, error: companyRefsError } = await supabaseAdmin
      .from("companies")
      .select("id, organization_id")
      .returns<Array<{ id: string; organization_id: string }>>();

    if (companyRefsError) {
      return jsonResponse({ success: false, message: "Failed to load company references", error: companyRefsError }, { status: 500 });
    }

    const counts = new Map<string, number>();
    for (const row of companyRefs ?? []) {
      counts.set(row.organization_id, (counts.get(row.organization_id) ?? 0) + 1);
    }

    const organizations = (orgs ?? []).map((o) => ({
      ...o,
      companies_count: counts.get(o.id) ?? 0,
    }));

    return jsonResponse({ success: true, organizations }, { status: 200 });
  } catch (err) {
    console.error("platform-admin-organizations error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});



