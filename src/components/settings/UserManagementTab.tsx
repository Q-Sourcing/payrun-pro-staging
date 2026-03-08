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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  RefreshCw,
  Mail,
  Send,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";

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
  status: "active" | "inactive" | "pending";
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  phone: string | null;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

// ─── Validation schemas ───────────────────────────────────────────────────────
const inviteSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  email: z.string().email("Invalid email address").max(255),
  role: z.enum(["admin", "hr", "manager", "employee"]),
  phone: z.string().max(30).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
});

const editSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(50).trim(),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  role: z.enum(["admin", "hr", "manager", "employee"]),
  phone: z.string().max(30).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;
type EditFormValues = z.infer<typeof editSchema>;

// ─── Role badge config ────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin:    { label: "Admin",    variant: "destructive" },
  hr:       { label: "HR",       variant: "default" },
  manager:  { label: "Manager",  variant: "secondary" },
  employee: { label: "Employee", variant: "outline" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending:   { label: "Pending",   variant: "secondary" },
  accepted:  { label: "Accepted",  variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
  expired:   { label: "Expired",   variant: "destructive" },
};

const MANAGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;

async function callManageUsers(method: string, body?: unknown, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = new URL(MANAGE_FN_URL);
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

async function callInviteUser(action: string, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const method = action === "list" ? "GET" : "POST";
  const url = `${INVITE_FN_URL}?action=${action}`;
  const res = await fetch(url, {
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

// ─── Invite User Dialog ───────────────────────────────────────────────────────
function InviteUserDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { full_name: "", email: "", role: "employee", phone: "", department: "" },
  });

  useEffect(() => { if (open) form.reset(); }, [open]);

  async function onSubmit(values: InviteFormValues) {
    setLoading(true);
    try {
      const result = await callInviteUser("invite", {
        ...values,
        phone: values.phone || null,
        department: values.department || null,
      });
      if (!result.success) throw new Error(result.message);
      toast({
        title: "Invitation sent!",
        description: `An invitation email has been sent to ${values.email}.`,
      });
      onSent();
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Failed to send invitation",
        description: err instanceof Error ? err.message : "Unknown error occurred.",
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
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Invite New User
          </DialogTitle>
          <DialogDescription>
            An invitation email will be sent. The user will create their own password via the link.
            Invitations expire after 48 hours.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem className="col-span-2">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
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

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
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
            { label: "Username",   value: user.username || "—" },
            { label: "Full Name",  value: user.full_name },
            { label: "Email",      value: user.email },
            { label: "Role",       value: ROLE_CONFIG[user.role]?.label ?? user.role },
            { label: "Department", value: user.department || "—" },
            { label: "Phone",      value: user.phone || "—" },
            { label: "Status",     value: user.status },
            { label: "Created",    value: new Date(user.created_at).toLocaleDateString() },
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
      status: (user?.status === "active" || user?.status === "inactive") ? user.status : "active",
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
        status: (user.status === "active" || user.status === "inactive") ? user.status : "active",
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
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

// ─── Invitations Table ────────────────────────────────────────────────────────
function InvitationsTable() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callInviteUser("list");
      if (!result.success) throw new Error(result.message);
      // Auto-mark expired ones locally
      const now = new Date();
      const withExpiry = (result.invitations ?? []).map((inv: Invitation) => ({
        ...inv,
        status: inv.status === 'pending' && new Date(inv.expires_at) < now ? 'expired' : inv.status,
      }));
      setInvitations(withExpiry);
    } catch (err: unknown) {
      toast({ title: "Failed to load invitations", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  async function handleResend(invitation: Invitation) {
    setActionLoading(invitation.id);
    try {
      const result = await callInviteUser("resend", { invitation_id: invitation.id });
      if (!result.success) throw new Error(result.message);
      toast({ title: "Invitation resent", description: `A new invitation email has been sent to ${invitation.email}.` });
      fetchInvitations();
    } catch (err: unknown) {
      toast({ title: "Failed to resend", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(invitation: Invitation) {
    setActionLoading(invitation.id + "-cancel");
    try {
      const result = await callInviteUser("cancel", { invitation_id: invitation.id });
      if (!result.success) throw new Error(result.message);
      toast({ title: "Invitation cancelled", description: `Invitation for ${invitation.email} has been cancelled.` });
      fetchInvitations();
    } catch (err: unknown) {
      toast({ title: "Failed to cancel", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const expiredCount = invitations.filter(i => i.status === 'expired').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading invitations…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {pendingCount} Pending
        </span>
        {expiredCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
            <XCircle className="h-3.5 w-3.5" /> {expiredCount} Expired
          </span>
        )}
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={fetchInvitations}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invitations yet</p>
          <p className="text-sm mt-1">Use "Invite User" to send your first invitation.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const isExpired = inv.status === 'expired' || (inv.status === 'pending' && new Date(inv.expires_at) < new Date());
                  const statusKey = isExpired ? 'expired' : inv.status;
                  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
                  const canAct = inv.status === 'pending' || inv.status === 'expired';

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_CONFIG[inv.role]?.variant ?? "outline"}>
                          {ROLE_CONFIG[inv.role]?.label ?? inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : inv.status === 'accepted' ? (
                          <span className="text-primary flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Accepted
                          </span>
                        ) : (
                          formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })
                        )}
                      </TableCell>
                      <TableCell>
                        {canAct && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleResend(inv)}
                                disabled={actionLoading === inv.id}
                              >
                                {actionLoading === inv.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Resend Invitation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleCancel(inv)}
                                disabled={actionLoading === inv.id + "-cancel"}
                              >
                                {actionLoading === inv.id + "-cancel" ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Ban className="h-4 w-4 mr-2" />
                                )}
                                Cancel Invitation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UserManagementTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
  const [inviteOpen, setInviteOpen] = useState(false);
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

  // Refresh users list whenever switching to the Users tab (picks up newly accepted invites)
  useEffect(() => {
    if (activeTab === "users") fetchUsers();
  }, [activeTab, fetchUsers]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Invite and manage system users and their access roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Invite User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: stats.total,  icon: Users },
          { label: "Active",  value: stats.active, icon: UserCheck },
          { label: "Admins",  value: stats.admins, icon: ShieldCheck },
          { label: "HR",      value: stats.hr,     icon: Users },
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

      {/* Tabs: Users / Invitations */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" /> Invitations
          </TabsTrigger>
        </TabsList>

        {/* ── Users tab ── */}
        <TabsContent value="users" className="space-y-4">
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
                    {search || roleFilter !== "all"
                      ? "Try adjusting your filters."
                      : "Invite your first user to get started."}
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
                          <Badge variant={
                            user.status === "active" ? "default" :
                            user.status === "pending" ? "secondary" : "outline"
                          }>
                            {user.status === "active" ? "Active" :
                             user.status === "pending" ? "Pending" : "Inactive"}
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
                              <DropdownMenuItem onClick={() => setViewUser(user)}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
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
        </TabsContent>

        {/* ── Invitations tab ── */}
        <TabsContent value="invitations">
          <InvitationsTable />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSent={() => { fetchUsers(); }} />
      <ViewUserDialog user={viewUser} onClose={() => setViewUser(null)} />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} />
      <DeleteConfirmDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={fetchUsers} />
    </div>
  );
}
