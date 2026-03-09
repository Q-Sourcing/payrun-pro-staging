import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Plus, Pencil, Trash2, Search, Lock, Users, CheckSquare, Settings2, AlertTriangle,
} from "lucide-react";
import {
  listRoles, createRole, deleteRole, listPermissions,
  listRolePermissions, setRolePermissions,
  type Role, type Permission,
} from "@/lib/api/rbac";
import { useOrg } from "@/lib/tenant/OrgContext";
import { toast } from "sonner";

// System roles that cannot be deleted
const PROTECTED_ROLES = ["PLATFORM_SUPER_ADMIN", "PLATFORM_AUDITOR", "ADMIN"];

// ─── Category badge colours (using semantic opacity variants for theme compatibility)
const CATEGORY_COLORS: Record<string, string> = {
  "User Management":       "bg-primary/10 text-primary border-primary/20",
  "Roles & Permissions":   "bg-secondary/60 text-secondary-foreground border-secondary",
  "Employees":             "bg-primary/5 text-primary border-primary/10",
  "Pay Groups":            "bg-muted text-muted-foreground border-border",
  "Earnings & Deductions": "bg-accent/30 text-accent-foreground border-accent/30",
  "Payroll Processing":    "bg-destructive/10 text-destructive border-destructive/20",
  "Contracts":             "bg-primary/10 text-primary border-primary/20",
  "Reports":               "bg-secondary/50 text-secondary-foreground border-secondary/50",
  "System Settings":       "bg-muted/80 text-muted-foreground border-border",
  "Attendance":            "bg-primary/5 text-primary border-primary/10",
};

// ─── Main Component ────────────────────────────────────────────────────────────
export function RolesPermissionsModule() {
  const { organizationId } = useOrg();
  const orgId = organizationId ?? "00000000-0000-0000-0000-000000000001";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["rbac-roles"],
    queryFn: listRoles,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["rbac-permissions"],
    queryFn: listPermissions,
  });

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const s = search.toLowerCase();
    return roles.filter(r =>
      r.name.toLowerCase().includes(s) ||
      r.code.toLowerCase().includes(s)
    );
  }, [roles, search]);

  // Business roles only (ORGANIZATION tier, not PLATFORM)
  const businessRoles = useMemo(
    () => filteredRoles.filter(r => r.tier !== "PLATFORM"),
    [filteredRoles]
  );

  const permsByCategory = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [permissions]);

  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteRole(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac-roles"] });
      toast.success("Role deleted");
      setDeleteTarget(null);
      if (selectedRole?.code === deleteTarget?.code) setSelectedRole(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete role"),
  });

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setActiveTab("permissions");
  };

  return (
    <div className="space-y-4">
      {/* Workflow hint */}
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Workflow:</strong> Create a role in the{" "}
          <strong>Roles</strong> tab → click{" "}
          <span className="inline-flex items-center gap-1"><Settings2 className="h-3 w-3" />Assign Permissions</span>{" "}
          → switch to the <strong>Permissions</strong> tab to configure access.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="roles" className="flex-1 gap-2">
            <Users className="h-4 w-4" /> Roles
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{businessRoles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex-1 gap-2" disabled={!selectedRole}>
            <CheckSquare className="h-4 w-4" />
            {selectedRole ? `Permissions — ${selectedRole.name}` : "Permissions"}
          </TabsTrigger>
        </TabsList>

        {/* ── ROLES TAB ── */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Role
            </Button>
          </div>

          {rolesLoading ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Loading roles…</div>
          ) : (
            <div className="grid gap-2">
              {businessRoles.map((role) => (
                <RoleCard
                  key={role.code}
                  role={role}
                  orgId={orgId}
                  isProtected={PROTECTED_ROLES.includes(role.code)}
                  onAssignPermissions={() => handleSelectRole(role)}
                  onDelete={() => setDeleteTarget(role)}
                />
              ))}
              {businessRoles.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">No roles found.</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── PERMISSIONS TAB ── */}
        <TabsContent value="permissions" className="mt-4">
          {selectedRole ? (
            <PermissionsEditor
              role={selectedRole}
              orgId={orgId}
              permsByCategory={permsByCategory}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["role-permissions", selectedRole.code] });
                toast.success(`Permissions saved for ${selectedRole.name}`);
              }}
            />
          ) : (
            <div className="text-center py-16 text-sm text-muted-foreground">
              Select a role from the Roles tab to assign permissions.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        orgId={orgId}
        existingCodes={roles.map(r => r.code)}
        onSaved={(newRole) => {
          qc.invalidateQueries({ queryKey: ["rbac-roles"] });
          setIsCreateOpen(false);
          // Prompt user to go configure permissions
          toast.success(`Role "${newRole.name}" created. Now assign permissions.`);
          setSelectedRole(newRole as Role);
          setActiveTab("permissions");
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              All permission assignments will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.code)}
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Role Card ─────────────────────────────────────────────────────────────────
function RoleCard({
  role, orgId, isProtected, onAssignPermissions, onDelete,
}: {
  role: Role; orgId: string; isProtected: boolean;
  onAssignPermissions: () => void; onDelete: () => void;
}) {
  const { data: assignedPerms = [] } = useQuery({
    queryKey: ["role-permissions", role.code, orgId],
    queryFn: () => listRolePermissions(role.code, orgId),
  });

  return (
    <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/20 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-md bg-muted/50 shrink-0">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{role.name}</span>
            {isProtected && (
              <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50">
                <Lock className="h-2.5 w-2.5" /> Protected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {role.description || "No description"}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <code className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
              {role.code}
            </code>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">
              {assignedPerms.length} permission{assignedPerms.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onAssignPermissions}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Assign Permissions
        </Button>
        {!isProtected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Permissions Editor (Permissions Tab content) ──────────────────────────────
function PermissionsEditor({
  role, orgId, permsByCategory, onSaved,
}: {
  role: Role; orgId: string;
  permsByCategory: Record<string, Permission[]>;
  onSaved: () => void;
}) {
  const { data: currentPerms = [], isLoading } = useQuery({
    queryKey: ["role-permissions", role.code, orgId],
    queryFn: () => listRolePermissions(role.code, orgId),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(currentPerms));
  }, [currentPerms]);

  const mutation = useMutation({
    mutationFn: (keys: string[]) => setRolePermissions(role.code, orgId, keys),
    onSuccess: onSaved,
    onError: (err: any) => toast.error(err.message || "Failed to save permissions"),
  });

  const isProtected = PROTECTED_ROLES.includes(role.code);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleCategory = (perms: Permission[]) => {
    const allSelected = perms.every(p => selected.has(p.key));
    setSelected(prev => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allSelected) next.delete(p.key); else next.add(p.key);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(
    Object.values(permsByCategory).flat().map(p => p.key)
  ));
  const clearAll = () => setSelected(new Set());

  const totalPerms = Object.values(permsByCategory).flat().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            Permissions for <span className="text-primary">{role.name}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selected.size} of {totalPerms} permissions selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearAll} className="text-xs h-7">
            Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">
            Select All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <ScrollArea className="h-[480px] pr-3">
          <div className="space-y-5 pb-2">
            {Object.entries(permsByCategory).map(([category, perms]) => {
              const allSel = perms.every(p => selected.has(p.key));
              const someSel = perms.some(p => selected.has(p.key));
              const colorClass = CATEGORY_COLORS[category] ?? "bg-muted/50 text-muted-foreground border-border";

              return (
                <div key={category} className="rounded-lg border overflow-hidden">
                  {/* Category header */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b ${colorClass}`}
                    onClick={() => toggleCategory(perms)}
                  >
                    <Checkbox
                      checked={allSel}
                      className="h-3.5 w-3.5"
                      onCheckedChange={() => toggleCategory(perms)}
                      aria-label={`Toggle all ${category}`}
                    />
                    <span className="text-xs font-semibold flex-1">{category}</span>
                    <span className="text-[10px] opacity-70">
                      {perms.filter(p => selected.has(p.key)).length}/{perms.length}
                    </span>
                  </div>

                  {/* Permission rows */}
                  <div className="divide-y">
                    {perms.map(p => (
                      <div
                        key={p.key}
                        className="flex items-start gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggle(p.key)}
                      >
                        <Checkbox
                          checked={selected.has(p.key)}
                          className="h-3.5 w-3.5 mt-0.5 shrink-0"
                          onCheckedChange={() => toggle(p.key)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight">{p.description}</p>
                          <code className="text-[10px] text-muted-foreground">{p.key}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          onClick={() => mutation.mutate([...selected])}
          disabled={mutation.isPending}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          {mutation.isPending ? "Saving…" : "Save Role Permissions"}
        </Button>
      </div>
    </div>
  );
}

// ─── Create Role Dialog (role only, no permissions) ────────────────────────────
function CreateRoleDialog({
  open, onOpenChange, orgId, existingCodes, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  orgId: string; existingCodes: string[];
  onSaved: (role: { code: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codePreview = name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 30);
  const codeConflict = existingCodes.includes(codePreview);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Role name is required"); return; }
    if (codeConflict) { toast.error("A role with this code already exists"); return; }

    setIsSubmitting(true);
    try {
      await createRole({
        code: codePreview,
        name: name.trim(),
        description: description.trim(),
        tier: "ORGANIZATION",
        org_id: orgId,
      });
      onSaved({ code: codePreview, name: name.trim() });
      setName("");
      setDescription("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create New Role
          </DialogTitle>
          <DialogDescription>
            Define the role name and description. After creation you'll be taken to
            the Permissions tab to assign what this role can access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role Name <span className="text-destructive">*</span></Label>
            <Input
              id="role-name"
              placeholder="e.g. Payroll Officer"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Auto-generated Code</Label>
            <div className={`px-3 py-2 rounded-md border text-sm font-mono ${codeConflict ? "border-destructive bg-destructive/5 text-destructive" : "bg-muted text-muted-foreground"}`}>
              {codePreview || "…"}
              {codeConflict && <span className="ml-2 text-xs font-sans">— already exists</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-desc">Description</Label>
            <Textarea
              id="role-desc"
              placeholder="What does this role do?"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || codeConflict}>
            {isSubmitting ? "Creating…" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
