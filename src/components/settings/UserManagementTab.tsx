import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  UserPlus, Search, MoreHorizontal, Edit, Trash2, Eye, Users, ShieldCheck,
  UserCheck, Loader2, RefreshCw, Mail, Send, Ban, Clock, CheckCircle2, XCircle,
  Power, PowerOff,
} from "lucide-react";
import { InviteUserDialog, useOrgRoles } from "@/components/settings/InviteUserDialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgRole { code: string; name: string; description: string | null; }

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
  /** true when the account was created via an accepted invitation */
  via_invite?: boolean;
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
const editSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(50).trim(),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  role: z.string().min(1, "Role is required"),
  phone: z.string().max(30).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type EditFormValues = z.infer<typeof editSchema>;

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  className?: string
}> = {
  pending:   { label: "Pending",   variant: "secondary" },
  accepted:  { label: "Accepted",  variant: "outline", className: "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" },
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

// ─── Role select component ────────────────────────────────────────────────────
function RoleSelect({
  value, onChange, roles, placeholder = "Select role",
}: {
  value: string;
  onChange: (v: string) => void;
  roles: OrgRole[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.code} value={r.code}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// InviteUserDialog is imported from @/components/settings/InviteUserDialog

// ─── View User Dialog ─────────────────────────────────────────────────────────
function ViewUserDialog({ user, roles, onClose }: { user: ManagedUser | null; roles: OrgRole[]; onClose: () => void }) {
  if (!user) return null;
  const roleName = roles.find(r => r.code === user.role)?.name ?? user.role;
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { label: "Username",   value: user.username || "—" },
            { label: "Full Name",  value: user.full_name },
            { label: "Email",      value: user.email },
            { label: "Role",       value: roleName },
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
function EditUserDialog({
  user, roles, onClose, onSaved,
}: {
  user: ManagedUser | null; roles: OrgRole[];
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      username: user?.username ?? "",
      full_name: user?.full_name ?? "",
      role: user?.role ?? roles[0]?.code ?? "",
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
        role: user.role,
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
          <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Edit User</DialogTitle>
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
                  <FormControl>
                    <RoleSelect value={field.value} onChange={field.onChange} roles={roles} />
                  </FormControl>
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
function InvitationsTable({ roles }: { roles: OrgRole[] }) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteInviteTarget, setDeleteInviteTarget] = useState<Invitation | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callInviteUser("list");
      if (!result.success) throw new Error(result.message);
      const now = new Date();
      const withExpiry = (result.invitations ?? []).map((inv: Invitation) => ({
        ...inv,
        status: inv.status === "pending" && new Date(inv.expires_at) < now ? "expired" : inv.status,
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

  async function handleDeleteInvitation(invitation: Invitation) {
    setActionLoading(invitation.id + "-delete");
    try {
      const { error } = await supabase.from("user_management_invitations").delete().eq("id", invitation.id);
      if (error) throw error;
      toast({ title: "Invitation deleted", description: `Invitation for ${invitation.email} has been permanently deleted.` });
      fetchInvitations();
    } catch (err: unknown) {
      toast({ title: "Failed to delete", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setActionLoading(null);
      setDeleteInviteTarget(null);
    }
  }

  const pendingCount = invitations.filter(i => i.status === "pending").length;
  const expiredCount = invitations.filter(i => i.status === "expired").length;

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
                  const isExpired = inv.status === "expired" || (inv.status === "pending" && new Date(inv.expires_at) < new Date());
                  const statusKey = isExpired ? "expired" : inv.status;
                  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
                  const canAct = inv.status === "pending" || inv.status === "expired";
                  const roleName = roles.find(r => r.code === inv.role)?.name ?? inv.role;

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{roleName}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : inv.status === "accepted" ? (
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
                              <DropdownMenuItem onClick={() => handleResend(inv)} disabled={actionLoading === inv.id}>
                                {actionLoading === inv.id
                                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  : <Send className="h-4 w-4 mr-2" />}
                                Resend Invitation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleCancel(inv)}
                                disabled={actionLoading === inv.id + "-cancel"}
                              >
                                {actionLoading === inv.id + "-cancel"
                                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  : <Ban className="h-4 w-4 mr-2" />}
                                Cancel Invitation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteInviteTarget(inv)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Invitation
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

      {/* Delete Invitation Confirmation */}
      <Dialog open={!!deleteInviteTarget} onOpenChange={(open) => !open && setDeleteInviteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the invitation for{" "}
              <span className="font-semibold">{deleteInviteTarget?.email}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteInviteTarget(null)} disabled={actionLoading === deleteInviteTarget?.id + "-delete"}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading === deleteInviteTarget?.id + "-delete"}
              onClick={() => deleteInviteTarget && handleDeleteInvitation(deleteInviteTarget)}
            >
              {actionLoading === deleteInviteTarget?.id + "-delete"
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</>
                : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UserManagementTab() {
  const { toast } = useToast();
  const { roles, loading: rolesLoading } = useOrgRoles();
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
      const [result, { data: acceptedInvites }] = await Promise.all([
        callManageUsers("GET"),
        supabase
          .from("user_management_invitations")
          .select("email, full_name, role, department, phone, created_at")
          .eq("status", "accepted"),
      ]);
      if (!result.success) throw new Error(result.message);

      const apiUsers: ManagedUser[] = result.users ?? [];
      const apiEmails = new Set(apiUsers.map((u: ManagedUser) => u.email.toLowerCase()));

      // Mark existing users that came via invite
      const markedUsers: ManagedUser[] = apiUsers.map((u: ManagedUser) => ({
        ...u,
        via_invite: (acceptedInvites ?? []).some(
          (inv) => inv.email.toLowerCase() === u.email.toLowerCase()
        ),
      }));

      // Add accepted invites whose accounts aren't yet in the manage-users list
      const extraFromInvites: ManagedUser[] = (acceptedInvites ?? [])
        .filter((inv) => !apiEmails.has(inv.email.toLowerCase()))
        .map((inv) => ({
          id: `invite-${inv.email}`,
          username: null,
          full_name: inv.full_name,
          email: inv.email,
          role: inv.role ?? "",
          phone: inv.phone ?? null,
          department: inv.department ?? null,
          status: "active" as const,
          created_at: inv.created_at,
          via_invite: true,
        }));

      setUsers([...markedUsers, ...extraFromInvites]);
    } catch (err: unknown) {
      toast({ title: "Failed to load users", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
  }, [activeTab, fetchUsers]);

  const handleToggleStatus = async (user: ManagedUser, newStatus: "active" | "inactive") => {
    try {
      const result = await callManageUsers("PATCH", { id: user.id, status: newStatus });
      if (!result.success) throw new Error(result.message);
      toast({
        title: newStatus === "active" ? "User activated" : "User deactivated",
        description: `${user.full_name} is now ${newStatus}.`,
      });
      fetchUsers();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update user status.",
        variant: "destructive",
      });
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    roles: roles.length,
    pending: users.filter((u) => u.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Invite and manage system users. Roles are pulled live from{" "}
            <strong>Roles &amp; Permissions</strong> and carry their assigned permissions automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2" disabled={rolesLoading}>
            <UserPlus className="h-4 w-4" /> Invite User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: stats.total,   icon: Users },
          { label: "Active",  value: stats.active,  icon: UserCheck },
          { label: "Pending", value: stats.pending, icon: Clock },
          { label: "Roles",   value: stats.roles,   icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or username…"
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
                    {roles.map((r) => (
                      <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading users…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Users className="h-10 w-10 opacity-30" />
                  <p className="text-sm">
                    {search || roleFilter !== "all" ? "No users match your filters." : "No users yet. Use \"Invite User\" to add one."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => {
                      const roleName = roles.find(r => r.code === user.role)?.name ?? user.role;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              {user.full_name}
                              {user.via_invite && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700 dark:text-blue-400">
                                  Via Invite
                                </Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{roleName}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.department ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.status === "active" ? "outline" : "secondary"}
                              className={user.status === "active" ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30" : ""}
                            >
                              {user.status === "active" ? "Active" : user.status === "pending" ? "Pending" : "Inactive"}
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
                                <DropdownMenuItem onClick={() => setViewUser(user)}>
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status === "active" ? (
                                  <DropdownMenuItem
                                    className="text-destructive/80 focus:text-destructive"
                                    onClick={() => handleToggleStatus(user, "inactive")}
                                  >
                                    <PowerOff className="mr-2 h-4 w-4" /> Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-primary focus:text-primary"
                                    onClick={() => handleToggleStatus(user, "active")}
                                  >
                                    <Power className="mr-2 h-4 w-4" /> Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteUser(user)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
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

        {/* ── Invitations Tab ── */}
        <TabsContent value="invitations">
          <InvitationsTable roles={roles} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={fetchUsers}
        roles={roles}
      />
      <ViewUserDialog user={viewUser} roles={roles} onClose={() => setViewUser(null)} />
      <EditUserDialog
        user={editUser}
        roles={roles}
        onClose={() => setEditUser(null)}
        onSaved={fetchUsers}
      />
      <DeleteConfirmDialog
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={fetchUsers}
      />
    </div>
  );
}
