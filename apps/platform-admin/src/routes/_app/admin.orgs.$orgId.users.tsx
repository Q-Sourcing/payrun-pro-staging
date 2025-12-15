import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { fetchTenant } from "@/api/tenants";
import { createUser } from "@/api/users";
import {
  addOrgUser,
  createAccessGrant,
  listOrgRoles,
  listOrgUsersPage,
  removeOrgUser,
  setOrgUserStatus,
  toggleLicense,
  toggleOrgUserRole,
  toggleUserCompany,
  updateOrgUserProfile,
  type OrgRole,
  type OrgUser,
} from "@/api/orgAdmin";
import { permissionCatalog, permissionDescription, roleCategories, roleCategory, roleDescription, roleLabel, type PermissionKey } from "@/lib/obacDisplay";

export const Route = createFileRoute("/_app/admin/orgs/$orgId/users")({
  component: OrgUsersManagementPage,
});

function OrgUsersManagementPage() {
  const qc = useQueryClient();
  const { orgId } = useParams({ from: "/_app/admin/orgs/$orgId/users" });

  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [roleKey, setRoleKey] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [license, setLicense] = useState<"" | "assigned" | "unassigned">("");
  const [status, setStatus] = useState<"" | "active" | "disabled">("");

  const pageSize = 25;

  const { data: orgData } = useQuery({
    queryKey: ["tenant", orgId],
    queryFn: () => fetchTenant(orgId),
  });

  const { data: roles } = useQuery<OrgRole[]>({
    queryKey: ["org-roles", orgId],
    queryFn: () => listOrgRoles(orgId),
  });

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ["org-users-page", orgId, pageIndex, search, roleKey, companyId, license, status],
    queryFn: () =>
      listOrgUsersPage(orgId, {
        limit: pageSize,
        offset: pageIndex * pageSize,
        search: search.trim() || undefined,
        role_key: roleKey || undefined,
        company_id: companyId || undefined,
        license: license || undefined,
        status: status || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const companies = useMemo(() => orgData?.companies ?? [], [orgData?.companies]);
  const companyIdToName = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [companies]);

  const total = usersPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [drawerUser, setDrawerUser] = useState<OrgUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "create">("existing");
  const [addEmail, setAddEmail] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<Record<PermissionKey, boolean>>(() => {
    const init: Partial<Record<PermissionKey, boolean>> = {};
    (Object.keys(permissionCatalog) as PermissionKey[]).forEach((k) => {
      init[k] = false;
    });
    return init as Record<PermissionKey, boolean>;
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const resetAddForm = () => {
    setAddEmail("");
    setAddFirstName("");
    setAddLastName("");
    setAddPassword("");
    setShowPassword(false);
    setSelectedRoleId("");
    setSelectedPermissions(() => {
      const init: Partial<Record<PermissionKey, boolean>> = {};
      (Object.keys(permissionCatalog) as PermissionKey[]).forEach((k) => {
        init[k] = false;
      });
      return init as Record<PermissionKey, boolean>;
    });
  };

  const selectedPermissionsCount = useMemo(() => {
    return (Object.keys(selectedPermissions) as PermissionKey[]).filter((k) => !!selectedPermissions[k]).length;
  }, [selectedPermissions]);

  const setAllPermissions = (value: boolean) => {
    setSelectedPermissions((prev) => {
      const next: Partial<Record<PermissionKey, boolean>> = {};
      (Object.keys(prev) as PermissionKey[]).forEach((k) => {
        next[k] = value;
      });
      return next as Record<PermissionKey, boolean>;
    });
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let out = "";
    for (let i = 0; i < 14; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    setAddPassword(out);
  };

  const openDrawer = (u: OrgUser) => {
    setDrawerUser(u);
    setEditFirstName(u.first_name || "");
    setEditLastName(u.last_name || "");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerUser(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users – {orgData?.organization?.name ?? "Organization"}</h1>
        <p className="text-sm text-muted-foreground">Manage users, roles, companies, and licenses</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>Add User</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setAddMode("existing");
                    resetAddForm();
                    setAddOpen(true);
                  }}
                >
                  Add Existing User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setAddMode("create");
                    resetAddForm();
                    setAddOpen(true);
                  }}
                >
                  Create New User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1 min-w-[240px]">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }}
                placeholder="Search name or email"
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={roleKey}
              onChange={(e) => {
                setRoleKey(e.target.value);
                setPageIndex(0);
              }}
            >
              <option value="">All roles</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.key}>
                  {roleLabel(r.key)}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPageIndex(0);
              }}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={license}
              onChange={(e) => {
                setLicense(e.target.value as any);
                setPageIndex(0);
              }}
            >
              <option value="">Any license</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Not Assigned</option>
            </select>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPageIndex(0);
              }}
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <Separator />

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : (usersPage?.users ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (usersPage?.users ?? []).map((u) => {
                    const companyNames = (u.companies ?? [])
                      .map((cid) => companyIdToName.get(cid))
                      .filter(Boolean) as string[];
                    const companiesLabel = `${companyNames.length} ${companyNames.length === 1 ? "company" : "companies"}`;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.full_name || u.email || "User"}</div>
                          <div className="text-xs text-muted-foreground">{u.email ?? ""}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(u.roles ?? []).slice(0, 3).map((rk) => (
                              <Badge key={rk} variant="secondary">
                                {roleLabel(rk)}
                              </Badge>
                            ))}
                            {(u.roles ?? []).length > 3 && (
                              <Badge variant="outline">+{(u.roles ?? []).length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell title={companyNames.join(", ") || ""}>{companiesLabel}</TableCell>
                        <TableCell>
                          <Badge variant={u.license_assigned ? "secondary" : "outline"}>
                            {u.license_assigned ? "Assigned" : "Not Assigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === "active" ? "secondary" : "outline"}>
                            {u.status === "active" ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDrawer(u)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Showing {Math.min(total, pageIndex * pageSize + 1)}–{Math.min(total, (pageIndex + 1) * pageSize)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {pageIndex + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            resetAddForm();
          }
        }}
      >
        <DialogContent className={addMode === "create" ? "max-w-5xl" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle>{addMode === "create" ? "Add New User" : "Add Existing User"}</DialogTitle>
            <DialogDescription>
              {addMode === "existing"
                ? "Add an existing user to this organization by email."
                : "Create a new user, then add them to this organization."}
            </DialogDescription>
          </DialogHeader>

          {addMode === "existing" ? (
            <div className="space-y-4">
              <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@company.com" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="text-sm font-semibold">Basic Information</div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">First Name *</div>
                    <Input value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Last Name *</div>
                    <Input value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Email *</div>
                  <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="john@example.com" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Temporary Password</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                        placeholder="Leave blank to invite by email"
                        type={showPassword ? "text" : "password"}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" onClick={generatePassword}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    If blank, the user will be invited by email. If set, the user will be created with this password.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Role (Optional)</div>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                  >
                    <option value="">Select a role…</option>
                    {(roles ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {roleLabel(r.key)}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground">Used for reporting and display purposes only.</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Module Permissions</div>
                    <div className="text-xs text-muted-foreground">
                      Configure special payroll permissions for this user.
                    </div>
                  </div>
                  <Badge variant="secondary">{selectedPermissionsCount} selected</Badge>
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex gap-2">
                    <select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" disabled>
                      <option>Select template…</option>
                    </select>
                    <Button type="button" variant="secondary" disabled>
                      Apply Template
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setAllPermissions(true)}>
                    Select All
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setAllPermissions(false)}>
                    Clear All
                  </Button>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission</TableHead>
                        <TableHead className="text-center">Allow</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Object.keys(permissionCatalog) as PermissionKey[]).map((k) => {
                        return (
                          <TableRow key={k}>
                            <TableCell>
                              <div className="font-medium">{permissionCatalog[k].label}</div>
                              <div className="text-xs text-muted-foreground">{permissionDescription(k)}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={!!selectedPermissions[k]}
                                onChange={(e) =>
                                  setSelectedPermissions((prev) => ({
                                    ...prev,
                                    [k]: e.target.checked,
                                  }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAddOpen(false);
                resetAddForm();
              }}
            >
              Cancel
            </Button>
            {addMode === "existing" ? (
              <Button
                disabled={addSubmitting || !addEmail.trim()}
                onClick={async () => {
                  try {
                    setAddSubmitting(true);
                    await addOrgUser(orgId, addEmail.trim());
                    setAddOpen(false);
                    resetAddForm();
                    await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                  } catch (err) {
                    console.error(err);
                    alert(err instanceof Error ? err.message : "Failed to add user");
                  } finally {
                    setAddSubmitting(false);
                  }
                }}
              >
                Add User
              </Button>
            ) : (
              <Button
                disabled={
                  addSubmitting ||
                  !addEmail.trim() ||
                  !addFirstName.trim() ||
                  !addLastName.trim()
                }
                onClick={async () => {
                  try {
                    setAddSubmitting(true);

                    const fullName = [addFirstName.trim(), addLastName.trim()].filter(Boolean).join(" ");
                    const userRes = await createUser({
                      email: addEmail.trim(),
                      full_name: fullName,
                      role: "employee",
                      country: "Uganda",
                      password: addPassword.trim() || undefined,
                    });
                    if (!userRes.success || !userRes.user_id) {
                      throw new Error(userRes.error || userRes.message || "Failed to create user");
                    }

                    const orgUserRes = await addOrgUser(orgId, addEmail.trim(), addPassword.trim() ? "active" : "invited");

                    if (selectedRoleId && orgUserRes?.org_user_id) {
                      await toggleOrgUserRole(orgUserRes.org_user_id, selectedRoleId, true);
                    }

                    const grants = (Object.keys(selectedPermissions) as PermissionKey[]).filter(
                      (k) => !!selectedPermissions[k],
                    );

                    for (const scopeKey of grants) {
                      await createAccessGrant({
                        org_id: orgId,
                        scope_type: "action",
                        scope_key: scopeKey,
                        effect: "allow",
                        user_id: userRes.user_id,
                      });
                    }

                    setAddOpen(false);
                    resetAddForm();
                    await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                  } catch (err) {
                    console.error(err);
                    alert(err instanceof Error ? err.message : "Failed to create user");
                  } finally {
                    setAddSubmitting(false);
                  }
                }}
              >
                Create User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit drawer */}
      {drawerOpen && drawerUser && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-background shadow-xl">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{drawerUser.full_name || drawerUser.email || "User"}</div>
                  <div className="text-sm text-muted-foreground">{drawerUser.email ?? ""}</div>
                </div>
                <Button variant="ghost" onClick={closeDrawer}>
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-auto h-[calc(100%-72px)]">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update user''s personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">First Name</div>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="First Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Last Name</div>
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await updateOrgUserProfile(drawerUser.id, editFirstName || null, editLastName || null);
                        const updated = { ...drawerUser, first_name: editFirstName || null, last_name: editLastName || null, full_name: [editFirstName, editLastName].filter(Boolean).join(" ") };
                        setDrawerUser(updated);
                        await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status & License</CardTitle>
                  <CardDescription>Enable/disable the user and assign licensing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Status</div>
                      <div className="text-xs text-muted-foreground">{drawerUser.status === "active" ? "Active" : "Disabled"}</div>
                    </div>
                    <Switch
                      checked={drawerUser.status === "active"}
                      onCheckedChange={async (checked) => {
                        await setOrgUserStatus(drawerUser.id, checked ? "active" : "disabled");
                        const updated = { ...drawerUser, status: checked ? "active" : "disabled" };
                        setDrawerUser(updated);
                        await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">License</div>
                      <div className="text-xs text-muted-foreground">{drawerUser.license_assigned ? "Assigned" : "Not Assigned"}</div>
                    </div>
                    <Switch
                      checked={!!drawerUser.license_assigned}
                      onCheckedChange={async (checked) => {
                        await toggleLicense(orgId, drawerUser.user_id, checked);
                        const updated = { ...drawerUser, license_assigned: checked };
                        setDrawerUser(updated);
                        await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>Assign organization roles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {roleCategories.map((cat) => {
                    const rolesInCat = (roles ?? []).filter((r) => roleCategory(r.key) === cat);
                    if (rolesInCat.length === 0) return null;
                    return (
                      <details key={cat} className="rounded-md border px-3 py-2">
                        <summary className="cursor-pointer select-none text-sm font-medium">{cat}</summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {rolesInCat.map((r) => {
                            const selected = drawerUser.roles?.includes(r.key) ?? false;
                            return (
                              <Button
                                key={r.id}
                                size="sm"
                                variant={selected ? "default" : "secondary"}
                                title={roleDescription(r.key) || r.description || ""}
                                onClick={async () => {
                                  await toggleOrgUserRole(drawerUser.id, r.id, !selected);
                                  const nextRoles = selected
                                    ? (drawerUser.roles ?? []).filter((k) => k !== r.key)
                                    : [...(drawerUser.roles ?? []), r.key];
                                  setDrawerUser({ ...drawerUser, roles: nextRoles });
                                  await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                                }}
                              >
                                {roleLabel(r.key)}
                              </Button>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Company Membership</CardTitle>
                  <CardDescription>Assign the user to companies within the organization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {companies.map((c) => {
                    const checked = drawerUser.companies?.includes(c.id) ?? false;
                    return (
                      <label key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="text-sm">{c.name}</div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={async (e) => {
                            await toggleUserCompany(drawerUser.user_id, c.id, e.target.checked);
                            const nextCompanies = e.target.checked
                              ? [...(drawerUser.companies ?? []), c.id]
                              : (drawerUser.companies ?? []).filter((x) => x !== c.id);
                            setDrawerUser({ ...drawerUser, companies: nextCompanies });
                            await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                          }}
                        />
                      </label>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const ok = window.confirm("Remove this user from the organization? This cannot be undone.");
                    if (!ok) return;
                    await removeOrgUser(drawerUser.id);
                    closeDrawer();
                    await qc.invalidateQueries({ queryKey: ["org-users-page", orgId] });
                  }}
                >
                  Remove user
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



