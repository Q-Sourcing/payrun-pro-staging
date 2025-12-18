import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrg } from "@/lib/tenant/OrgContext";
import {
  addOrgUser,
  createAccessGrant,
  deleteAccessGrant,
  getOrgLicense,
  listAccessGrants,
  listCompanies,
  listOrgRoles,
  listOrgUsersPage,
  setLicenseAssignment,
  setOrgUserRole,
  setOrgUserStatus,
  setUserCompanyMembership,
  updateAccessGrant,
  type OrgUser,
  type OrgRole,
  type AccessGrant,
  type Company,
} from "@/lib/api/adminAccess";
import { isPermissionKey, permissionCatalog, permissionDescription, permissionLabel, roleCategories, roleCategory, roleDescription, roleLabel } from "@/lib/obacDisplay";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type GrantDraft = {
  permission: keyof typeof permissionCatalog | "";
  effect: "allow" | "deny";
  scope: "org" | "company";
  company_id: string;
  target_type: "none" | "user" | "role";
  target_user_id: string;
  target_role_id: string;
};

export function AdminAccessSection() {
  const { organizationId } = useOrg();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [grantDraft, setGrantDraft] = useState<GrantDraft>({
    permission: "",
    effect: "allow",
    scope: "org",
    company_id: "",
    target_type: "none",
    target_user_id: "",
    target_role_id: "",
  });
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);

  const orgId = organizationId;

  const { data: roles } = useQuery<OrgRole[]>({
    queryKey: ["org-roles", orgId],
    queryFn: () => listOrgRoles(orgId!),
    enabled: !!orgId,
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["org-companies", orgId],
    queryFn: () => listCompanies(orgId!),
    enabled: !!orgId,
  });

  // Compact summary only (scalable management is on /admin/orgs/:orgId/users)
  const { data: usersPage, isLoading } = useQuery({
    queryKey: ["org-users-summary", orgId],
    queryFn: () => listOrgUsersPage(orgId!, { limit: 5, offset: 0 }),
    enabled: !!orgId,
  });
  const users = usersPage?.users ?? [];

  const { data: license } = useQuery({
    queryKey: ["org-license", orgId],
    queryFn: () => getOrgLicense(orgId!),
    enabled: !!orgId,
  });

  const { data: grants } = useQuery<AccessGrant[]>({
    queryKey: ["org-grants", orgId],
    queryFn: () => listAccessGrants(orgId!),
    enabled: !!orgId,
  });

  const companyIdToName = useMemo(() => {
    const map = new Map<string, string>();
    (companies ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [companies]);

  const inviteMutation = useMutation({
    mutationFn: () => addOrgUser(orgId!, email.trim()),
    onSuccess: async () => {
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["org-users-summary", orgId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ orgUserId, status }: { orgUserId: string; status: string }) =>
      setOrgUserStatus(orgUserId, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-users-summary", orgId] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ orgUserId, roleId, add }: { orgUserId: string; roleId: string; add: boolean }) =>
      setOrgUserRole(orgUserId, roleId, add),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-users-summary", orgId] });
    },
  });

  const companyMutation = useMutation({
    mutationFn: ({ userId, companyId, add }: { userId: string; companyId: string; add: boolean }) =>
      setUserCompanyMembership(userId, companyId, add),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-users-summary", orgId] });
    },
  });

  const licenseMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      setLicenseAssignment(orgId!, userId, active),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-users-summary", orgId] });
    },
  });

  const grantMutation = useMutation({
    mutationFn: async () => {
      const companyId = grantDraft.scope === "company" ? grantDraft.company_id : null;
      const userId = grantDraft.target_type === "user" ? grantDraft.target_user_id : null;
      const roleId = grantDraft.target_type === "role" ? grantDraft.target_role_id : null;
      if (!grantDraft.permission) throw new Error("Permission required");

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
          org_id: orgId!,
          scope_type: "action",
          scope_key: grantDraft.permission,
          effect: grantDraft.effect,
          company_id: companyId,
          user_id: userId,
          role_id: roleId,
        });
      }
    },
    onSuccess: async () => {
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
      await qc.invalidateQueries({ queryKey: ["org-grants", orgId] });
    },
  });

  const deleteGrantMutation = useMutation({
    mutationFn: (id: string) => deleteAccessGrant(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-grants", orgId] });
    },
  });

  const licenseUsage = useMemo(() => {
    const total = license?.seat_limit ?? 0;
    const assigned = (users ?? []).filter((u) => u.license_assigned).length;
    return { total, assigned };
  }, [license, users]);

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>Select an organization to manage admin settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Org Users</CardTitle>
          <CardDescription>Summary of users in this organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={() => inviteMutation.mutate()} disabled={!email.trim() || inviteMutation.isPending}>
              {inviteMutation.isPending ? "Adding..." : "Add"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = `/admin/orgs/${orgId}/users`;
              }}
            >
              Manage all users
            </Button>
          </div>
          <Separator />
          {isLoading && <div className="text-sm text-muted-foreground">Loading users...</div>}
          {!isLoading && (
            <div className="space-y-2">
              {(users ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{u.full_name || u.email || "User"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={u.status === "active" ? "secondary" : "outline"}
                      className={u.status === "invited" ? "text-amber-700 border-amber-200 bg-amber-50" : undefined}
                    >
                      {u.status === "active" ? "Active" : u.status === "invited" ? "Invited" : "Disabled"}
                    </Badge>
                    <Badge variant={u.license_assigned ? "secondary" : "outline"}>
                      {u.license_assigned ? "Assigned" : "Not Assigned"}
                    </Badge>
                  </div>
                </div>
              ))}
              {(users ?? []).length === 0 && <div className="text-sm text-muted-foreground">No org users yet.</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Licenses</CardTitle>
          <CardDescription>Seat limits and allocation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Seat limit: {license?.seat_limit ?? 0}</div>
          <div>Assigned: {licenseUsage.assigned}</div>
          <div className="text-xs text-muted-foreground">Allocations are toggled per user above.</div>
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
                onChange={(e) => setGrantDraft((d) => ({ ...d, permission: e.target.value as any }))}
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
                  setGrantDraft((d) => ({
                    ...d,
                    scope: e.target.value as "org" | "company",
                    company_id: "",
                  }))
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
                {(companies ?? []).map((c) => (
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
                onChange={(e) =>
                  setGrantDraft((d) => ({
                    ...d,
                    target_type: e.target.value as any,
                    target_user_id: "",
                    target_role_id: "",
                  }))
                }
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
                  {(users ?? []).map((u) => (
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
          <Button
            onClick={() => grantMutation.mutate()}
            disabled={
              !grantDraft.permission ||
              (grantDraft.scope === "company" && !grantDraft.company_id) ||
              (grantDraft.target_type === "user" && !grantDraft.target_user_id) ||
              (grantDraft.target_type === "role" && !grantDraft.target_role_id) ||
              grantMutation.isPending
            }
            variant="secondary"
          >
            {grantMutation.isPending ? "Saving..." : editingGrantId ? "Save Changes" : "Add Permission"}
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
                    const appliedUser = g.user_id ? (users ?? []).find((u) => u.user_id === g.user_id) ?? null : null;
                    const appliedRole = g.role_id ? (roles ?? []).find((r) => r.id === g.role_id) ?? null : null;

                    const permissionText = g.scope_type === "action" ? permissionLabel(g.scope_key) : "Special Rule";
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
                              onClick={() => deleteGrantMutation.mutate(g.id)}
                              disabled={deleteGrantMutation.isPending}
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

      <Card>
        <CardHeader>
          <CardTitle>Effective Permissions</CardTitle>
          <CardDescription>Shows roles and grants per user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(users ?? []).map((u) => (
            <div key={u.id} className="rounded-md border p-2">
              <div className="font-medium">{u.full_name || u.email || "User"}</div>
              <div className="text-xs text-muted-foreground">{u.email ?? ""}</div>
              <div className="text-xs text-muted-foreground">
                Roles: {(u.roles ?? []).map((r) => roleLabel(r)).join(", ") || "None"}
              </div>
              <div className="text-xs text-muted-foreground">
                Special permissions:{" "}
                {(grants ?? [])
                  .filter((g) => g.user_id === u.user_id)
                  .map((g) => `${g.effect === "allow" ? "Allow" : "Deny"} ${permissionLabel(g.scope_key)}`)
                  .join(", ") || "None"}
              </div>
            </div>
          ))}
          {(users ?? []).length === 0 && <div className="text-muted-foreground text-sm">No users to show.</div>}
        </CardContent>
      </Card>
    </div>
  );
}


