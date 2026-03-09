import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Users,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type UserStatus = "active" | "inactive";

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  department: string | null;
  status: UserStatus;
  created_at: string;
}

interface OrgRole {
  code: string;
  name: string;
  description: string | null;
}

interface RoleWithPermissions extends OrgRole {
  permissions: string[];
}

const MANAGED_ROLES: ReadonlyArray<{ code: "admin" | "hr" | "manager" | "employee"; name: string; description: string }> = [
  {
    code: "admin",
    name: "Admin",
    description: "Organization-wide administration and user management.",
  },
  {
    code: "hr",
    name: "HR",
    description: "People and assignment management responsibilities.",
  },
  {
    code: "manager",
    name: "Manager",
    description: "Team and project-level management access.",
  },
  {
    code: "employee",
    name: "Employee",
    description: "Self-service access to own account and payroll records.",
  },
];

const ROLE_TO_RBAC_CODE: Record<string, string> = {
  admin: "ORG_ADMIN",
  hr: "ORG_HR_ADMIN",
  manager: "PROJECT_MANAGER",
  employee: "SELF_USER",
};

const userSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  role: z.enum(["admin", "hr", "manager", "employee"]),
  department: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});
type UserFormValues = z.infer<typeof userSchema>;

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

async function callManageUsers(method: string, body?: unknown, params?: Record<string, string>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = new URL(EDGE_FN_URL);
  if (params) Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return res.json();
}

function UserFormDialog({
  open,
  onClose,
  user,
  onSaved,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  user?: ManagedUser | null;
  onSaved: () => void;
  roles: OrgRole[];
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      password: "",
      phone: user?.phone ?? "",
      role: (user?.role as UserFormValues["role"]) ?? "employee",
      department: user?.department ?? "",
      status: user?.status ?? "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      password: "",
      phone: user?.phone ?? "",
      role: (user?.role as UserFormValues["role"]) ?? (roles[0]?.code as UserFormValues["role"] | undefined) ?? "employee",
      department: user?.department ?? "",
      status: user?.status ?? "active",
    });
  }, [open, user, roles, form]);

  async function onSubmit(values: UserFormValues) {
    if (!isEdit && !values.password) {
      form.setError("password", { message: "Password is required for new users." });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...(isEdit ? { id: user!.id } : {}),
        full_name: values.full_name,
        email: values.email,
        password: isEdit ? undefined : values.password,
        phone: values.phone || null,
        department: values.department || null,
        role: values.role,
        status: values.status,
      };

      const result = await callManageUsers(isEdit ? "PATCH" : "POST", payload);
      if (!result.success) throw new Error(result.message || "Failed to save user.");

      toast({
        title: isEdit ? "User updated" : "User created",
        description: result.message || (isEdit ? "Changes saved." : "Account created."),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the user's details, role, and status."
              : "Create a user account directly. They can log in immediately with the email and password set here."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@company.com" disabled={isEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Minimum 8 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+256..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Payroll" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.code} value={role.code}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  user,
  onClose,
  onDeleted,
}: {
  open: boolean;
  user: ManagedUser | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!user) return;
    setLoading(true);
    try {
      const result = await callManageUsers("DELETE", { id: user.id });
      if (!result.success) throw new Error(result.message || "Failed to delete user.");
      toast({ title: "User deleted", description: `${user.full_name} has been removed.` });
      onDeleted();
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>{user?.full_name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewUserDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: ManagedUser | null;
  onClose: () => void;
}) {
  if (!user) return null;
  const roleName = MANAGED_ROLES.find((role) => role.code === user.role)?.name ?? user.role;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Profile</DialogTitle>
          <DialogDescription>User profile details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user.full_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{roleName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{user.status}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Department</span>
            <span className="font-medium">{user.department || "—"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesPermissionsSection({ roles }: { roles: RoleWithPermissions[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Roles & Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles found for this organization.</p>
        ) : (
          roles.map((role) => (
            <div key={role.code} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{role.name}</p>
                <span className="text-xs text-muted-foreground">{role.code}</span>
              </div>
              {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
              <div className="flex flex-wrap gap-2">
                {role.permissions.length > 0 ? (
                  role.permissions.map((perm) => (
                    <Badge key={`${role.code}-${perm}`} variant="outline" className="text-[10px]">
                      {perm}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No permissions mapped.</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function UsersManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callManageUsers("GET");
      if (!result.success) throw new Error(result.message || "Failed to load users");
      setUsers(result.users ?? []);
    } catch (err: unknown) {
      toast({
        title: "Failed to load users",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRoles = useCallback(async () => {
    const rbacCodes = MANAGED_ROLES.map((role) => ROLE_TO_RBAC_CODE[role.code]);
    const { data: roleRows, error: roleError } = await supabase
      .from("rbac_roles")
      .select("code, name, description")
      .in("code", rbacCodes)
      .order("name");

    if (roleError) {
      toast({
        title: "Failed to load roles",
        description: roleError.message,
        variant: "destructive",
      });
      return;
    }

    const roleCodes = (roleRows || []).map((r) => r.code);
    const { data: rolePermissions } = await supabase
      .from("rbac_role_permissions")
      .select("role_code, permission_key")
      .in("role_code", roleCodes.length ? roleCodes : [""]);

    const permissionsByRole = new Map<string, string[]>();
    for (const row of rolePermissions || []) {
      const current = permissionsByRole.get(row.role_code) || [];
      permissionsByRole.set(row.role_code, [...current, row.permission_key]);
    }

    const roleByCode = new Map((roleRows || []).map((role) => [role.code, role]));
    setRoles(
      MANAGED_ROLES.map((uiRole) => {
        const rbacCode = ROLE_TO_RBAC_CODE[uiRole.code];
        const rbacRole = roleByCode.get(rbacCode);
        return {
          code: uiRole.code,
          name: uiRole.name,
          description: rbacRole?.description ?? uiRole.description,
          permissions: permissionsByRole.get(rbacCode) || [],
        };
      })
    );
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const roleOptions: OrgRole[] = useMemo(
    () => MANAGED_ROLES.map((role) => ({ code: role.code, name: role.name, description: role.description })),
    []
  );

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    roles: roles.length,
  };

  async function setUserStatus(user: ManagedUser, nextStatus: UserStatus) {
    if (user.status === nextStatus) return;
    try {
      const result = await callManageUsers("PATCH", { id: user.id, status: nextStatus });
      if (!result.success) throw new Error(result.message || "Failed to update status");
      toast({
        title: "User updated",
        description: `${user.full_name} is now ${nextStatus}.`,
      });
      fetchUsers();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users and keep role permissions aligned across the platform.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, icon: Users },
          { label: "Active", value: stats.active, icon: UserCheck },
          { label: "Inactive", value: stats.inactive, icon: UserX },
          { label: "Roles", value: stats.roles, icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or department…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh users">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading users…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Users className="h-10 w-10 opacity-30" />
                  <p className="text-sm">
                    {search || roleFilter !== "all" || statusFilter !== "all"
                      ? "No users match your filters."
                      : 'No users yet. Click "Create User" to add one.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const roleName = roleOptions.find((r) => r.code === user.role)?.name || user.role;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.phone ?? <span className="opacity-40">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.department ?? <span className="text-muted-foreground opacity-40">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">{roleName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {user.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setViewUser(user)}>
                            <Eye className="mr-2 h-4 w-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={user.status === "active"}
                                  onClick={() => setUserStatus(user, "active")}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={user.status === "inactive"}
                                  onClick={() => setUserStatus(user, "inactive")}
                                >
                                  <UserX className="mr-2 h-4 w-4" /> Deactivate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteUser(user)}
                                >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UserFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={fetchUsers}
        roles={roleOptions}
      />
      <ViewUserDialog
        open={!!viewUser}
        user={viewUser}
        onClose={() => setViewUser(null)}
      />
      <UserFormDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={fetchUsers}
        roles={roleOptions}
      />
      <DeleteConfirmDialog
        open={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={fetchUsers}
      />
    </div>
  );
}
