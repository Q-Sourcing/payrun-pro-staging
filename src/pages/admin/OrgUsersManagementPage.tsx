import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

import {
  addOrgUser,
  getOrganization,
  listCompanies,
  listOrgRoles,
  listOrgUsersPage,
  removeOrgUser,
  setLicenseAssignment,
  setOrgUserRole,
  setOrgUserStatus,
  setUserCompanyMembership,
  updateOrgUserProfile,
  type Company,
  type OrgRole,
  type OrgUser,
} from "@/lib/api/adminAccess";
import { roleCategories, roleCategory, roleDescription, roleLabel } from "@/lib/obacDisplay";

export default function OrgUsersManagementPage() {
  const qc = useQueryClient();
  const params = useParams();
  const { toast } = useToast();
  const orgId = (params.orgId ?? "") as string;

  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [roleKey, setRoleKey] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [license, setLicense] = useState<"" | "assigned" | "unassigned">("");
  const [status, setStatus] = useState<"" | "active" | "disabled">("");

  const pageSize = 25;

  const { data: org } = useQuery({
    queryKey: ["admin-org", orgId],
    queryFn: () => getOrganization(orgId),
    enabled: !!orgId,
  });

  const { data: roles } = useQuery<OrgRole[]>({
    queryKey: ["admin-org-roles", orgId],
    queryFn: () => listOrgRoles(orgId),
    enabled: !!orgId,
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["admin-org-companies", orgId],
    queryFn: () => listCompanies(orgId),
    enabled: !!orgId,
  });

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ["admin-org-users-page", orgId, pageIndex, search, roleKey, companyId, license, status],
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
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });

  const companyIdToName = useMemo(() => {
    const map = new Map<string, string>();
    (companies ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [companies]);

  const total = usersPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Drawer & Modal State
  const [drawerUser, setDrawerUser] = useState<OrgUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Add Existing State
  const [addEmail, setAddEmail] = useState("");

  // Create New State
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("employee");
  const [isCreating, setIsCreating] = useState(false);

  // Edit State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

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

  const handleCreateUser = async () => {
    if (!newEmail || !newFirstName || !newLastName) return;

    setIsCreating(true);
    try {
      // Call the org-scoped invite function
      const { data, error } = await supabase.functions.invoke('invite-org-user', {
        body: {
          email: newEmail,
          firstName: newFirstName,
          lastName: newLastName,
          orgId: orgId,
          companyIds: [], // Default to no companies, can be updated later
          roles: ['EMPLOYEE'], // Default role, can be updated later
          sendInvite: true
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message || "Failed to invite user");

      toast({
        title: "User invited",
        description: `Successfully invited ${newEmail} to the organization.`,
      });

      setNewEmail("");
      setNewFirstName("");
      setNewLastName("");
      setAddOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to invite user.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!orgId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Select an organization.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users – {org?.name ?? "Organization"}</h1>
        <p className="text-sm text-muted-foreground">Manage users, roles, companies, and licenses</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAddOpen(true)}>Add User</Button>
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
              {(companies ?? []).map((c) => (
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
                  (usersPage?.users ?? []).map((u: OrgUser) => {
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

      {/* Add user modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Add User</div>
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>✕</Button>
            </div>

            <Tabs defaultValue="existing" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Add Existing User</TabsTrigger>
                <TabsTrigger value="create">Create New User</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="mt-4 space-y-4">
                <div className="text-sm text-muted-foreground">Add an existing user to this organization by email.</div>
                <div className="flex gap-2">
                  <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@company.com" />
                  <Button
                    disabled={!addEmail.trim()}
                    onClick={async () => {
                      try {
                        await addOrgUser(orgId, addEmail.trim());
                        toast({ title: "User added", description: "User successfully added to organization." });
                        setAddEmail("");
                        setAddOpen(false);
                        await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
                      } catch (e: any) {
                        toast({ title: "Error", description: e.message || "Failed to add user", variant: "destructive" });
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="create" className="mt-4 space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Create a new user account and invite them to this organization via email.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fname">First Name</Label>
                    <Input id="fname" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lname">Last Name</Label>
                    <Input id="lname" value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane.doe@company.com" />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    disabled={!newEmail || !newFirstName || !newLastName || isCreating}
                    onClick={handleCreateUser}
                  >
                    {isCreating ? "Creating..." : "Create & Invite"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

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
                        await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
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
                      <div className="text-xs text-muted-foreground">
                        {drawerUser.status === "active" ? "Active" : "Disabled"}
                      </div>
                    </div>
                    <Switch
                      checked={drawerUser.status === "active"}
                      onCheckedChange={async (checked) => {
                        await setOrgUserStatus(drawerUser.id, checked ? "active" : "disabled");
                        setDrawerUser({ ...drawerUser, status: checked ? "active" : "disabled" });
                        await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">License</div>
                      <div className="text-xs text-muted-foreground">
                        {drawerUser.license_assigned ? "Assigned" : "Not Assigned"}
                      </div>
                    </div>
                    <Switch
                      checked={!!drawerUser.license_assigned}
                      onCheckedChange={async (checked) => {
                        await setLicenseAssignment(orgId, drawerUser.user_id, checked);
                        setDrawerUser({ ...drawerUser, license_assigned: checked });
                        await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
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
                                  await setOrgUserRole(drawerUser.id, r.id, !selected);
                                  const nextRoles = selected
                                    ? (drawerUser.roles ?? []).filter((k) => k !== r.key)
                                    : [...(drawerUser.roles ?? []), r.key];
                                  setDrawerUser({ ...drawerUser, roles: nextRoles });
                                  await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
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
                  {(companies ?? []).map((c) => {
                    const checked = drawerUser.companies?.includes(c.id) ?? false;
                    return (
                      <label key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="text-sm">{c.name}</div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={async (e) => {
                            await setUserCompanyMembership(drawerUser.user_id, c.id, e.target.checked);
                            const nextCompanies = e.target.checked
                              ? [...(drawerUser.companies ?? []), c.id]
                              : (drawerUser.companies ?? []).filter((x) => x !== c.id);
                            setDrawerUser({ ...drawerUser, companies: nextCompanies });
                            await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
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
                    await qc.invalidateQueries({ queryKey: ["admin-org-users-page", orgId] });
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



