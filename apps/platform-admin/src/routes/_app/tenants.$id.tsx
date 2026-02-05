import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchTenant } from "@/api/tenants";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  listOrgRoles,
  listOrgUsersPage,
  getOrgLicense,
  updateOrgLicense,
  listAccessGrants,
  createAccessGrant,
  updateAccessGrant,
  deleteAccessGrant,
  type OrgRole,
  type AccessGrant,
} from "@/api/orgAdmin";
import { isPermissionKey, permissionCatalog, permissionDescription, permissionLabel, roleLabel } from "@/lib/obacDisplay";

export const Route = createFileRoute("/_app/tenants/$id")({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { id } = useParams({ from: "/_app/tenants/$id" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => fetchTenant(id),
  });

  const { data: roles } = useQuery<OrgRole[]>({
    queryKey: ["org-roles", id],
    queryFn: () => listOrgRoles(id),
    enabled: !!id,
  });

  // For this org detail page we keep a compact summary only.
  const { data: orgUsersPage, isLoading: loadingUsers } = useQuery({
    queryKey: ["org-users-summary", id],
    queryFn: () => listOrgUsersPage(id, { limit: 5, offset: 0 }),
    enabled: !!id,
  });

  // Grants may need a list of users to target. Keep this capped.
  const { data: orgUsersForGrants } = useQuery({
    queryKey: ["org-users-grants", id],
    queryFn: async () => {
      const res = await listOrgUsersPage(id, { limit: 200, offset: 0 });
      return res.users;
    },
    enabled: !!id,
  });

  const { data: orgLicense } = useQuery({
    queryKey: ["org-license", id],
    queryFn: () => getOrgLicense(id),
    enabled: !!id,
  });

  const { data: grants } = useQuery<AccessGrant[]>({
    queryKey: ["org-grants", id],
    queryFn: () => listAccessGrants(id),
    enabled: !!id,
  });

  const org = data?.organization;
  const companies = useMemo(() => data?.companies ?? [], [data?.companies]);
  const companyIdToName = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [companies]);

  const [licenseLimit, setLicenseLimit] = useState<string>("");
  const [savingLicense, setSavingLicense] = useState(false);
  const [grantDraft, setGrantDraft] = useState({
    permission: "" as keyof typeof permissionCatalog | "",
    effect: "allow" as "allow" | "deny",
    scope: "org" as "org" | "company",
    company_id: "" as string,
    target_type: "none" as "none" | "user" | "role",
    target_user_id: "" as string,
    target_role_id: "" as string,
  });
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);

  useEffect(() => {
    if (orgLicense?.seat_limit !== undefined) {
      setLicenseLimit(String(orgLicense.seat_limit));
    }
  }, [orgLicense]);

  const licenseUsage = useMemo(() => {
    const total = orgLicense?.seat_limit ?? 0;
    const assigned = (orgUsersPage?.users ?? []).filter((u) => u.license_assigned).length;
    return { total, assigned };
  }, [orgLicense, orgUsersPage]);

  const handleSaveLicense = async () => {
    const parsed = parseInt(licenseLimit, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    try {
      setSavingLicense(true);
      await updateOrgLicense(id, parsed);
      await qc.invalidateQueries({ queryKey: ["org-license", id] });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLicense(false);
    }
  };

  const primaryRole = (roleKeys: string[] | undefined) => {
    const keys = roleKeys ?? [];
    const precedence = [
      "ORG_OWNER",
      "ORG_ADMIN",
      "ORG_PAYROLL_ADMIN",
      "ORG_FINANCE_APPROVER",
      "ORG_HR",
      "ORG_PROJECT_MANAGER",
      "ORG_VIEWER",
    ];
    return precedence.find((p) => keys.includes(p)) ?? keys[0] ?? null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tenant (Organization) Details</h1>
          <p className="text-sm text-muted-foreground">Manage users, access and licensing for this organization.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled>
            Suspend
          </Button>
          <Button variant="destructive" disabled>
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{org?.name ?? "Loading..."}</CardTitle>
          <CardDescription>Organization record + companies under this org.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {isLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tenant...
            </div>
          )}
          {!isLoading && (
            <ul className="space-y-1">
              <li>Active: {org?.active ? "Yes" : "No"}</li>
              <li>Description: {org?.description ?? "--"}</li>
              <li>
                Created at:{" "}
                {org?.created_at
                  ? new Date(org.created_at).toLocaleString()
                  : "--"}
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>Companies belonging to this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading companies...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm">
                      No companies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.currency ?? "--"}</TableCell>
                      <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "--"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License</CardTitle>
          <CardDescription>Seat limits and usage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Input
              className="w-32"
              value={licenseLimit}
              onChange={(e) => setLicenseLimit(e.target.value)}
              placeholder="Seat limit"
            />
            <Button onClick={handleSaveLicense} disabled={savingLicense}>
              {savingLicense ? "Saving..." : "Save"}
            </Button>
          </div>
          <div>Seat limit: {orgLicense?.seat_limit ?? 0}</div>
          <div>Assigned: {licenseUsage.assigned}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Org Users</CardTitle>
          <CardDescription>Summary of users in this organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total users: <span className="font-medium text-foreground">{orgUsersPage?.total ?? 0}</span>
            </div>
            <Link to="/admin/orgs/$orgId/users" params={{ orgId: id }}>
              <Button variant="secondary">Manage all users</Button>
            </Link>
          </div>
          <Separator />
          {loadingUsers && <div className="text-sm text-muted-foreground">Loading users…</div>}
          {!loadingUsers && (
            <div className="space-y-2">
              {(orgUsersPage?.users ?? []).slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{u.full_name || u.email || "User"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? ""}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {primaryRole(u.roles) ? roleLabel(primaryRole(u.roles)) : "—"}
                  </div>
                </div>
              ))}
              {(orgUsersPage?.users ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">No users found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special Permissions & Restrictions</CardTitle>
          <CardDescription>Grant or restrict sensitive actions in a business-friendly way.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Permission</div>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={grantDraft.permission}
                onChange={(e) =>
                  setGrantDraft((d) => ({
                    ...d,
                    permission: (e.target.value as keyof typeof permissionCatalog | ""),
                  }))
                }
              >
                <option value="">Select a permission…</option>
                {Object.entries(permissionCatalog).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
              {grantDraft.permission && (
                <div className="text-xs text-muted-foreground">
                  {permissionDescription(grantDraft.permission)}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Effect</div>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={grantDraft.effect}
                onChange={(e) => setGrantDraft((d) => ({ ...d, effect: e.target.value as "allow" | "deny" }))}
              >
                <option value="allow">Allow</option>
                <option value="deny">Deny</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Scope</div>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={grantDraft.scope}
                onChange={(e) =>
                  setGrantDraft((d) => ({ ...d, scope: e.target.value as "org" | "company", company_id: "" }))
                }
              >
                <option value="org">Entire Organization</option>
                <option value="company">Specific Company</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Company</div>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                disabled={grantDraft.scope !== "company"}
                value={grantDraft.company_id}
                onChange={(e) => setGrantDraft((d) => ({ ...d, company_id: e.target.value }))}
              >
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Applies To</div>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={grantDraft.target_type}
                onChange={(e) => {
                  const v = e.target.value as "none" | "user" | "role";
                  setGrantDraft((d) => ({
                    ...d,
                    target_type: v,
                    target_user_id: "",
                    target_role_id: "",
                  }));
                }}
              >
                <option value="none">All eligible users</option>
                <option value="user">Specific user</option>
                <option value="role">Specific role</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">
                {grantDraft.target_type === "user" ? "User" : grantDraft.target_type === "role" ? "Role" : "Target"}
              </div>
              {grantDraft.target_type === "user" ? (
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={grantDraft.target_user_id}
                  onChange={(e) => setGrantDraft((d) => ({ ...d, target_user_id: e.target.value }))}
                >
                  <option value="">Select user…</option>
                  {(orgUsersForGrants ?? []).map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {(u.full_name || u.email || "User").trim()} {u.email ? `(${u.email})` : ""}
                    </option>
                  ))}
                </select>
              ) : grantDraft.target_type === "role" ? (
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={grantDraft.target_role_id}
                  onChange={(e) => setGrantDraft((d) => ({ ...d, target_role_id: e.target.value }))}
                >
                  <option value="">Select role…</option>
                  {(roles ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleLabel(r.key)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-9 rounded-md border bg-muted/30 px-2 text-sm flex items-center text-muted-foreground">
                  Applies to all eligible users
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={
                !grantDraft.permission ||
                (grantDraft.scope === "company" && !grantDraft.company_id) ||
                (grantDraft.target_type === "user" && !grantDraft.target_user_id) ||
                (grantDraft.target_type === "role" && !grantDraft.target_role_id)
              }
              onClick={async () => {
                const companyId = grantDraft.scope === "company" ? grantDraft.company_id : null;
                const userId = grantDraft.target_type === "user" ? grantDraft.target_user_id : null;
                const roleId = grantDraft.target_type === "role" ? grantDraft.target_role_id : null;

                if (!grantDraft.permission) return;

                if (editingGrantId) {
                  await updateAccessGrant({
                    id: editingGrantId,
                    scope_type: "action",
                    scope_key: grantDraft.permission,
                    effect: grantDraft.effect,
                    company_id: companyId,
                    user_id: userId,
                    role_id: roleId,
                  });
                } else {
                  await createAccessGrant({
                    org_id: id,
                    scope_type: "action",
                    scope_key: grantDraft.permission,
                    effect: grantDraft.effect,
                    company_id: companyId,
                    user_id: userId,
                    role_id: roleId,
                  });
                }

                setEditingGrantId(null);
                setGrantDraft({
                  permission: "",
                  effect: "allow",
                  scope: "org",
                  company_id: "",
                  target_type: "none",
                  target_user_id: "",
                  target_role_id: "",
                });
                await qc.invalidateQueries({ queryKey: ["org-grants", id] });
              }}
            >
              {editingGrantId ? "Save Changes" : "Add Permission"}
            </Button>
            {editingGrantId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingGrantId(null);
                  setGrantDraft({
                    permission: "",
                    effect: "allow",
                    scope: "org",
                    company_id: "",
                    target_type: "none",
                    target_user_id: "",
                    target_role_id: "",
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
          <Separator />

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Effect</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grants ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No special permissions configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  (grants ?? []).map((g) => {
                    const companyName = g.company_id ? companyIdToName.get(g.company_id) ?? null : null;
                    const appliedUser =
                      g.user_id ? (orgUsersForGrants ?? []).find((u) => u.user_id === g.user_id) ?? null : null;
                    const appliedRole = g.role_id ? (roles ?? []).find((r) => r.id === g.role_id) ?? null : null;

                    const permissionText =
                      g.scope_type === "action" ? permissionLabel(g.scope_key) : "Special Rule";
                    const scopeText = companyName ? companyName : "Entire Organization";
                    const appliesToText = appliedUser
                      ? `${appliedUser.full_name || appliedUser.email || "User"}`
                      : appliedRole
                        ? roleLabel(appliedRole.key)
                        : "All eligible users";

                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{permissionText}</TableCell>
                        <TableCell>
                          <Badge variant={g.effect === "allow" ? "secondary" : "destructive"}>
                            {g.effect === "allow" ? "Allow" : "Deny"}
                          </Badge>
                        </TableCell>
                        <TableCell>{scopeText}</TableCell>
                        <TableCell>{appliesToText}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGrantId(g.id);
                                setGrantDraft({
                                  permission:
                                    g.scope_type === "action" && isPermissionKey(g.scope_key)
                                      ? g.scope_key
                                      : "",
                                  effect: g.effect,
                                  scope: g.company_id ? "company" : "org",
                                  company_id: g.company_id ?? "",
                                  target_type: g.user_id ? "user" : g.role_id ? "role" : "none",
                                  target_user_id: g.user_id ?? "",
                                  target_role_id: g.role_id ?? "",
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await deleteAccessGrant(g.id);
                                await qc.invalidateQueries({ queryKey: ["org-grants", id] });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








