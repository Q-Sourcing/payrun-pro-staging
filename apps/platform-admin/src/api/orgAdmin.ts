import { callEdgeFunction } from "@/api/edge";

export type OrgRole = {
  id: string;
  org_id: string;
  key: string;
  name: string;
  description: string | null;
  system_defined?: boolean;
  created_at?: string | null;
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

export type AddOrgUserResult = {
  org_user_id: string;
  user_id: string;
};

export type OrgLicense = {
  org_id: string;
  seat_limit: number;
  features: Record<string, unknown>;
  effective_from?: string;
  created_at?: string;
  updated_at?: string;
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
  const res = await callEdgeFunction<{ success: boolean; roles: OrgRole[] }>("platform-admin-org-roles", {
    method: "GET",
    query: { org_id: orgId },
  });
  return res.roles ?? [];
}

export async function getOrgLicense(orgId: string): Promise<OrgLicense | null> {
  const res = await callEdgeFunction<{ success: boolean; license: OrgLicense | null }>("platform-admin-org-license", {
    method: "GET",
    query: { org_id: orgId },
  });
  return res.license ?? null;
}

export async function updateOrgLicense(orgId: string, seat_limit: number, features: Record<string, unknown> = {}) {
  await callEdgeFunction("platform-admin-org-license", {
    method: "POST",
    body: { org_id: orgId, seat_limit, features },
  });
}

export async function listOrgUsers(orgId: string): Promise<OrgUser[]> {
  const res = await callEdgeFunction<{ success: boolean; users: OrgUser[] }>("platform-admin-org-users", {
    method: "POST",
    body: { action: "list", org_id: orgId },
  });
  return res.users ?? [];
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
  const res = await callEdgeFunction<{ success: boolean; users: OrgUser[]; total: number }>("platform-admin-org-users", {
    method: "POST",
    body: { action: "list", org_id: orgId, ...opts },
  });
  return { users: res.users ?? [], total: res.total ?? 0 };
}

export async function addOrgUser(orgId: string, email: string, status: string = "active"): Promise<AddOrgUserResult | null> {
  const res = await callEdgeFunction<{ success: boolean; org_user_id?: string; user_id?: string }>("platform-admin-org-users", {
    method: "POST",
    body: { action: "add_user", org_id: orgId, email, status },
  });

  if (res?.org_user_id && res?.user_id) {
    return { org_user_id: res.org_user_id, user_id: res.user_id };
  }
  return null;
}

export async function updateOrgUserProfile(orgUserId: string, firstName: string | null, lastName: string | null) {
  await callEdgeFunction("platform-admin-org-users", {
    method: "POST",
    body: { action: "update_profile", org_user_id: orgUserId, first_name: firstName, last_name: lastName },
  });
}

export async function setOrgUserStatus(orgUserId: string, status: string) {
  await callEdgeFunction("platform-admin-org-users", {
    method: "POST",
    body: { action: "set_status", org_user_id: orgUserId, status },
  });
}

export async function toggleOrgUserRole(orgUserId: string, roleId: string, add: boolean) {
  await callEdgeFunction("platform-admin-org-users", {
    method: "POST",
    body: { action: "set_role", org_user_id: orgUserId, role_id: roleId, add },
  });
}

export async function toggleUserCompany(userId: string, companyId: string, add: boolean) {
  await callEdgeFunction("platform-admin-org-users", {
    method: "POST",
    body: { action: "set_company", user_id: userId, company_id: companyId, add },
  });
}

export async function toggleLicense(orgId: string, userId: string, active: boolean) {
  await callEdgeFunction("platform-admin-org-users", {
    method: "POST",
    body: { action: "set_license", org_id: orgId, user_id: userId, active },
  });
}

export async function removeOrgUser(orgUserId: string) {
  await callEdgeFunction("platform-admin-org-users", {
    method: "POST",
    body: { action: "remove_user", org_user_id: orgUserId },
  });
}

export async function listAccessGrants(orgId: string): Promise<AccessGrant[]> {
  const res = await callEdgeFunction<{ success: boolean; grants: AccessGrant[] }>("platform-admin-access-grants", {
    method: "GET",
    query: { org_id: orgId },
  });
  return res.grants ?? [];
}

export async function createAccessGrant(input: {
  org_id: string;
  scope_type: string;
  scope_key: string;
  effect: "allow" | "deny";
  user_id?: string | null;
  role_id?: string | null;
  company_id?: string | null;
  reason?: string | null;
}) {
  await callEdgeFunction("platform-admin-access-grants", {
    method: "POST",
    body: {
      ...input,
      user_id: input.user_id ?? null,
      role_id: input.role_id ?? null,
      company_id: input.company_id ?? null,
    },
  });
}

export async function updateAccessGrant(input: {
  id: string;
  scope_type?: string;
  scope_key?: string;
  effect?: "allow" | "deny";
  user_id?: string | null;
  role_id?: string | null;
  company_id?: string | null;
  reason?: string | null;
}) {
  await callEdgeFunction("platform-admin-access-grants", {
    method: "PATCH",
    body: {
      ...input,
      user_id: input.user_id ?? null,
      role_id: input.role_id ?? null,
      company_id: input.company_id ?? null,
    },
  });
}

export async function deleteAccessGrant(id: string) {
  await callEdgeFunction("platform-admin-access-grants", {
    method: "DELETE",
    query: { id },
  });
}



