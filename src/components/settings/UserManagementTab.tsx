import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Loader2,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = "admin" | "hr" | "manager" | "employee";

interface ManagedUser {
  id: string;
  username: string | null;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  department: string | null;
  status: "active" | "inactive";
  created_at: string;
}

// ─── Validation schemas ───────────────────────────────────────────────────────
const createSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(50).trim(),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  role: z.enum(["admin", "hr", "manager", "employee"]),
  phone: z.string().max(30).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

const editSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(50).trim(),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  role: z.enum(["admin", "hr", "manager", "employee"]),
  phone: z.string().max(30).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

// ─── Role badge config ────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  permissionSummary: string;
}> = {
  admin: {
    label: "Admin",
    variant: "destructive",
    permissionSummary: "Manage users, payroll workflows, and organization-level settings.",
  },
  hr: {
    label: "HR",
    variant: "default",
    permissionSummary: "Manage people records and assignments; no full admin controls.",
  },
  manager: {
    label: "Manager",
    variant: "secondary",
    permissionSummary: "Manage team/project operations and payroll preparation tasks.",
  },
  employee: {
    label: "Employee",
    variant: "outline",
    permissionSummary: "Self-service access to own profile and payroll information.",
  },
};
const MANAGED_ROLE_OPTIONS = (["admin", "hr", "manager", "employee"] as const).map((key) => ({
  value: key,
  ...ROLE_CONFIG[key],
}));

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

async function callManageUsers(method: string, body?: unknown, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = new URL(EDGE_FN_URL);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// ─── View User Dialog ─────────────────────────────────────────────────────────
function ViewUserDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { label: "Username", value: user.username || "—" },
            { label: "Full Name", value: user.full_name },
            { label: "Email", value: user.email },
            { label: "Role", value: ROLE_CONFIG[user.role]?.label ?? user.role },
            { label: "Department", value: user.department || "—" },
            { label: "Phone", value: user.phone || "—" },
            { label: "Status", value: user.status },
            { label: "Created", value: new Date(user.created_at).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium w-28">{label}</span>
              <span className="text-foreground">{value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create User Dialog ───────────────────────────────────────────────────────
function CreateUserDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { username: "", email: "", password: "", full_name: "", role: "employee", phone: "", department: "", status: "active" },
  });

  useEffect(() => { if (open) form.reset(); }, [open]);

  async function onSubmit(values: CreateFormValues) {
    setLoading(true);
    try {
      const result = await callManageUsers("POST", {
        ...values,
        phone: values.phone || null,
        department: values.department || null,
      });
      if (!result.success) throw new Error(result.message);
      toast({ title: "User created", description: `${values.full_name} has been added successfully.` });
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create user.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Create New User
          </DialogTitle>
          <DialogDescription>
            Fill in the details below. The user will use their email and password to log in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="jdoe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="email" placeholder="user@company.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Password <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MANAGED_ROLE_OPTIONS.map((roleOption) => (
                        <SelectItem key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_CONFIG[field.value]?.permissionSummary}
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl><Input placeholder="e.g. Finance" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────
function EditUserDialog({ user, onClose, onSaved }: { user: ManagedUser | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      username: user?.username ?? "",
      full_name: user?.full_name ?? "",
      role: (user?.role as UserRole) ?? "employee",
      phone: user?.phone ?? "",
      department: user?.department ?? "",
      status: user?.status ?? "active",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username ?? "",
        full_name: user.full_name,
        role: user.role as UserRole,
        phone: user.phone ?? "",
        department: user.department ?? "",
        status: user.status,
      });
    }
  }, [user]);

  async function onSubmit(values: EditFormValues) {
    if (!user) return;
    setLoading(true);
    try {
      const result = await callManageUsers("PATCH", {
        id: user.id,
        ...values,
        phone: values.phone || null,
        department: values.department || null,
      });
      if (!result.success) throw new Error(result.message);
      toast({ title: "User updated", description: `${values.full_name} has been updated.` });
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update user.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" /> Edit User
          </DialogTitle>
          <DialogDescription>Update the user's details and role.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{user?.email}</span>
              <span className="ml-2 text-xs">(cannot be changed here)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MANAGED_ROLE_OPTIONS.map((roleOption) => (
                        <SelectItem key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_CONFIG[field.value]?.permissionSummary}
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl><Input placeholder="e.g. Finance" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ user, onClose, onDeleted }: { user: ManagedUser | null; onClose: () => void; onDeleted: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!user) return;
    setLoading(true);
    try {
      const result = await callManageUsers("DELETE", undefined, { id: user.id });
      if (!result.success) throw new Error(result.message);
      toast({ title: "User deleted", description: `${user.full_name} has been removed.` });
      onDeleted();
      onClose();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete user.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>{user?.full_name}</strong>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UserManagementTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callManageUsers("GET");
      if (!result.success) throw new Error(result.message);
      setUsers(result.users ?? []);
    } catch (err: unknown) {
      toast({ title: "Failed to load users", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    admins: users.filter((u) => u.role === "admin").length,
    hr: users.filter((u) => u.role === "hr").length,
  };

  async function setUserStatus(user: ManagedUser, nextStatus: "active" | "inactive") {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage system users and their access roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Create User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Active", value: stats.active, icon: UserCheck },
          { label: "Admins", value: stats.admins, icon: ShieldCheck },
          { label: "HR", value: stats.hr, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading users…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1">
                {search || roleFilter !== "all" ? "Try adjusting your filters." : "Create your first user to get started."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.username || "—"}</TableCell>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_CONFIG[user.role]?.variant ?? "outline"}>
                        {ROLE_CONFIG[user.role]?.label ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setViewUser(user)}>
                            <Eye className="h-4 w-4 mr-2" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={user.status === "active"}
                            onClick={() => setUserStatus(user, "active")}
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={user.status === "inactive"}
                            onClick={() => setUserStatus(user, "inactive")}
                          >
                            <UserX className="h-4 w-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={fetchUsers} />
      <ViewUserDialog user={viewUser} onClose={() => setViewUser(null)} />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} />
      <DeleteConfirmDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={fetchUsers} />
    </div>
  );
}
