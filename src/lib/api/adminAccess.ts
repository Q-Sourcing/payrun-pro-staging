import { supabase } from "@/integrations/supabase/client";

export type OrgRole = {
  id: string;
  org_id: string;
  key: string;
  name: string;
  description: string | null;
};

export type OrgUser = {
  id: string;
  org_id: string;
  user_id: string;
  status: string;
  created_at: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  roles?: string[];
  companies?: string[];
  license_assigned?: boolean;
};

export type OrgUsersPage = {
  users: OrgUser[];
  total: number;
};

export type Company = {
  id: string;
  name: string;
  organization_id: string;
};

export type Organization = {
  id: string;
  name: string;
  description?: string | null;
};

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase.from("organizations").select("id, name, description").eq("id", orgId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export type OrgLicense = {
  org_id: string;
  seat_limit: number;
  features: Record<string, unknown>;
  effective_from: string;
  created_at: string;
  updated_at: string;
};

export type LicenseAssignment = {
  id: string;
  org_id: string;
  user_id: string;
  active: boolean;
  seat_type: string;
};

export type AccessGrant = {
  id: string;
  org_id: string;
  company_id: string | null;
  user_id: string | null;
  role_id: string | null;
  scope_type: string;
  scope_key: string;
  effect: "allow" | "deny";
  reason: string | null;
  created_at: string;
  created_by: string | null;
};

export async function listOrgRoles(orgId: string): Promise<OrgRole[]> {
  const { data, error } = await supabase
    .from("org_roles")
    .select("id, org_id, key, name, description, organization:organizations(name), organization:organizations(name)")
    .eq("org_id", orgId)
    .order("system_defined", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listOrgUsers(orgId: string): Promise<OrgUser[]> {
  const res = await listOrgUsersPage(orgId, { limit: 200, offset: 0 });
  return res.users;
}

export async function listOrgUsersPage(
  orgId: string,
  opts: {
    limit?: number;
    offset?: number;
    search?: string;
    role_key?: string;
    company_id?: string;
    license?: "assigned" | "unassigned";
    status?: "active" | "disabled" | "invited";
  } = {},
): Promise<OrgUsersPage> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const search = opts.search?.trim();

  let userIdFilter: string[] | null = null;
  let orgUserIdFilter: string[] | null = null;

  if (search) {
    const term = `%${search}%`;
    const { data: profileIds, error: pErr } = await supabase
      .from("user_profiles")
      .select("id")
      .or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`);
    if (pErr) throw pErr;
    userIdFilter = (profileIds ?? []).map((p) => p.id);
    if (userIdFilter.length === 0) return { users: [], total: 0 };
  }

  if (opts.company_id) {
    const { data: memberships, error: mErr } = await supabase
      .from("user_company_memberships")
      .select("user_id")
      .eq("company_id", opts.company_id);
    if (mErr) throw mErr;
    const ids = Array.from(new Set((memberships ?? []).map((m) => m.user_id)));
    userIdFilter = userIdFilter ? userIdFilter.filter((id) => ids.includes(id)) : ids;
    if (userIdFilter.length === 0) return { users: [], total: 0 };
  }

  if (opts.license) {
    const { data: seats, error: sErr } = await supabase
      .from("org_license_assignments")
      .select("user_id, active")
      .eq("org_id", orgId);
    if (sErr) throw sErr;
    const assigned = Array.from(new Set((seats ?? []).filter((s) => (s.active ?? true) === true).map((s) => s.user_id)));
    if (opts.license === "assigned") {
      userIdFilter = userIdFilter ? userIdFilter.filter((id) => assigned.includes(id)) : assigned;
    } else {
      userIdFilter = userIdFilter ? userIdFilter.filter((id) => !assigned.includes(id)) : null;
    }
    if (userIdFilter && userIdFilter.length === 0) return { users: [], total: 0 };
  }

  if (opts.role_key) {
    const { data: roleRow, error: rErr } = await supabase
      .from("org_roles")
      .select("id")
      .eq("org_id", orgId)
      .eq("key", opts.role_key)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!roleRow) return { users: [], total: 0 };

    const { data: our, error: ourErr } = await supabase
      .from("org_user_roles")
      .select("org_user_id")
      .eq("role_id", roleRow.id);
    if (ourErr) throw ourErr;
    orgUserIdFilter = Array.from(new Set((our ?? []).map((x) => x.org_user_id)));
    if (orgUserIdFilter.length === 0) return { users: [], total: 0 };
  }

  let q = supabase
    .from("org_users")
    .select("id, org_id, user_id, status, created_at", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (opts.status) q = q.eq("status", opts.status);
  if (userIdFilter) q = q.in("user_id", userIdFilter);
  if (orgUserIdFilter) q = q.in("id", orgUserIdFilter);

  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) throw error;

  const users = data ?? [];
  const ids = users.map((u) => u.user_id);
  if (ids.length === 0) return { users: [], total: count ?? 0 };

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, first_name, last_name")
    .in("id", ids);

  const { data: roles } = await supabase
    .from("org_user_roles")
    .select("org_user_id, org_roles(key)")
    .in("org_user_id", users.map((u) => u.id));

  const { data: memberships } = await supabase
    .from("user_company_memberships")
    .select("user_id, company_id")
    .in("user_id", ids);

  const { data: licenseAssignments } = await supabase
    .from("org_license_assignments")
    .select("user_id, active, org_id")
    .eq("org_id", orgId);

  const rolesByOrgUser: Record<string, string[]> = {};
  (roles ?? []).forEach((r: any) => {
    if (!rolesByOrgUser[r.org_user_id]) rolesByOrgUser[r.org_user_id] = [];
    rolesByOrgUser[r.org_user_id].push(r.org_roles?.key);
  });

  const companiesByUser: Record<string, string[]> = {};
  (memberships ?? []).forEach((m) => {
    if (!companiesByUser[m.user_id]) companiesByUser[m.user_id] = [];
    companiesByUser[m.user_id].push(m.company_id);
  });

  const licenseByUser: Record<string, boolean> = {};
  (licenseAssignments ?? []).forEach((l) => {
    licenseByUser[l.user_id] = l.active ?? true;
  });

  return {
    total: count ?? 0,
    users: users.map((u) => {
      const p = (profiles ?? []).find((p) => p.id === u.user_id);
      return {
        ...u,
        email: p?.email ?? null,
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        full_name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || null,
        roles: rolesByOrgUser[u.id] ?? [],
        companies: companiesByUser[u.user_id] ?? [],
        license_assigned: licenseByUser[u.user_id] ?? false,
      };
    }),
  };
}

export async function updateOrgUserProfile(orgUserId: string, firstName: string | null, lastName: string | null) {
  const { data: ou, error: ouErr } = await supabase
    .from("org_users")
    .select("user_id")
    .eq("id", orgUserId)
    .maybeSingle();
  if (ouErr) throw ouErr;
  if (!ou) throw new Error("Org user not found");

  const update: Record<string, any> = {};
  if (firstName !== undefined) update.first_name = firstName;
  if (lastName !== undefined) update.last_name = lastName;
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from("user_profiles")
    .update(update)
    .eq("id", ou.user_id);
  if (error) throw error;
}

export async function addOrgUser(orgId: string, email: string, status: string = "active") {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("User not found");

  const { error } = await supabase
    .from("org_users")
    .insert({ org_id: orgId, user_id: profile.id, status });
  if (error) throw error;
}

export async function setOrgUserStatus(orgUserId: string, status: string) {
  const { error } = await supabase.from("org_users").update({ status }).eq("id", orgUserId);
  if (error) throw error;
}

export async function listCompanies(orgId: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, organization_id")
    .eq("organization_id", orgId);
  if (error) throw error;
  return data ?? [];
}

export async function setUserCompanyMembership(userId: string, companyId: string, add: boolean) {
  if (add) {
    const { error } = await supabase
      .from("user_company_memberships")
      .upsert({ user_id: userId, company_id: companyId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_company_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("company_id", companyId);
    if (error) throw error;
  }
}

export async function setOrgUserRole(orgUserId: string, roleId: string, add: boolean) {
  if (add) {
    const { error } = await supabase
      .from("org_user_roles")
      .upsert({ org_user_id: orgUserId, role_id: roleId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("org_user_roles")
      .delete()
      .eq("org_user_id", orgUserId)
      .eq("role_id", roleId);
    if (error) throw error;
  }
  await syncLegacyRole(orgUserId);
}

export async function removeOrgUser(orgUserId: string) {
  const { data: ou, error: ouErr } = await supabase
    .from("org_users")
    .select("org_id, user_id")
    .eq("id", orgUserId)
    .maybeSingle();
  if (ouErr) throw ouErr;
  if (!ou) throw new Error("Org user not found");

  await supabase.from("org_license_assignments").delete().eq("org_id", ou.org_id).eq("user_id", ou.user_id);
  const { error } = await supabase.from("org_users").delete().eq("id", orgUserId);
  if (error) throw error;
}

export async function getOrgLicense(orgId: string): Promise<OrgLicense | null> {
  const { data, error } = await supabase.from("org_licenses").select("*").eq("org_id", orgId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function setLicenseAssignment(orgId: string, userId: string, active: boolean, seat_type: string = "default") {
  const { error } = await supabase
    .from("org_license_assignments")
    .upsert({ org_id: orgId, user_id: userId, active, seat_type });
  if (error) throw error;
}

export async function listAccessGrants(orgId: string): Promise<AccessGrant[]> {
  const { data, error } = await supabase
    .from("access_grants")
    .select("*")
    .eq("org_id", orgId);
  if (error) throw error;
  return data ?? [];
}

export async function createAccessGrant(payload: {
  org_id: string;
  scope_type: string;
  scope_key: string;
  effect: "allow" | "deny";
  user_id?: string | null;
  role_id?: string | null;
  company_id?: string | null;
  reason?: string | null;
}) {
  const { error } = await supabase.from("access_grants").insert({
    org_id: payload.org_id,
    scope_type: payload.scope_type,
    scope_key: payload.scope_key,
    effect: payload.effect,
    user_id: payload.user_id ?? null,
    role_id: payload.role_id ?? null,
    company_id: payload.company_id ?? null,
    reason: payload.reason ?? null,
  });
  if (error) throw error;
}

export async function updateAccessGrant(payload: {
  id: string;
  scope_type?: string;
  scope_key?: string;
  effect?: "allow" | "deny";
  user_id?: string | null;
  role_id?: string | null;
  company_id?: string | null;
  reason?: string | null;
}) {
  const update: Record<string, unknown> = {};
  if (payload.scope_type !== undefined) update.scope_type = payload.scope_type;
  if (payload.scope_key !== undefined) update.scope_key = payload.scope_key;
  if (payload.effect !== undefined) update.effect = payload.effect;
  if (payload.user_id !== undefined) update.user_id = payload.user_id;
  if (payload.role_id !== undefined) update.role_id = payload.role_id;
  if (payload.company_id !== undefined) update.company_id = payload.company_id;
  if (payload.reason !== undefined) update.reason = payload.reason;

  const { error } = await supabase.from("access_grants").update(update).eq("id", payload.id);
  if (error) throw error;
}

export async function deleteAccessGrant(id: string) {
  const { error } = await supabase.from("access_grants").delete().eq("id", id);
  if (error) throw error;
}

async function syncLegacyRole(orgUserId: string) {
  // Best-effort compat: keep user_profiles.role aligned to the first org role key
  const { data: orgUser, error: orgUserErr } = await supabase
    .from("org_users")
    .select("user_id")
    .eq("id", orgUserId)
    .maybeSingle();
  if (orgUserErr || !orgUser) return;

  const { data: roles } = await supabase
    .from("org_user_roles")
    .select("org_roles(key)")
    .eq("org_user_id", orgUserId);
  const primaryRole = roles?.[0]?.org_roles?.key ?? null;

  await supabase
    .from("user_profiles")
    .update({ role: primaryRole })
    .eq("id", orgUser.user_id);
}



