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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Plus, Pencil, Trash2, Search, Lock, Users, CheckSquare,
  Settings2, AlertTriangle, KeyRound,
} from "lucide-react";
import {
  listRoles, createRole, deleteRole, listPermissions,
  listRolePermissions, setRolePermissions,
  createPermission, updatePermission, deletePermission,
  type Role, type Permission,
} from "@/lib/api/rbac";
import { useOrg } from "@/lib/tenant/OrgContext";
import { toast } from "sonner";

const PROTECTED_ROLES = ["PLATFORM_SUPER_ADMIN", "PLATFORM_AUDITOR", "ADMIN"];

const PERMISSION_CATEGORIES = [
  "User Management",
  "Roles & Permissions",
  "Employees",
  "Pay Groups",
  "Earnings & Deductions",
  "Payroll Processing",
  "Contracts",
  "Reports",
  "System Settings",
  "Attendance",
];

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
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "catalog">("roles");
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
      r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s)
    );
  }, [roles, search]);

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
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Workflow:</strong> Create a role in the{" "}
          <strong>Roles</strong> tab → click{" "}
          <span className="inline-flex items-center gap-1">
            <Settings2 className="h-3 w-3" />Assign Permissions
          </span>{" "}
          → switch to the <strong>Permissions</strong> tab to assign or manage permissions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="roles" className="flex-1 gap-2">
            <Users className="h-4 w-4" /> Roles
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{businessRoles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex-1 gap-2">
            <KeyRound className="h-4 w-4" /> Permissions
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{permissions.length}</Badge>
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

        {/* ── UNIFIED PERMISSIONS TAB ── */}
        <TabsContent value="permissions" className="mt-4 space-y-6">
          {/* Role Permission Assignment Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Assign Permissions to Role</h3>
            </div>
            <Select
              value={selectedRole?.code ?? ""}
              onValueChange={(code) => {
                const role = roles.find(r => r.code === code);
                setSelectedRole(role ?? null);
              }}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select a role to configure…" />
              </SelectTrigger>
              <SelectContent>
                {businessRoles.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-muted/10">
                Select a role above to assign permissions.
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t" />

          {/* Permission Catalog Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Permission Catalog</h3>
              <span className="text-xs text-muted-foreground">— Add, edit or remove permissions</span>
            </div>
            <PermissionCatalog
              permissions={permissions}
              permsByCategory={permsByCategory}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["rbac-permissions"] })}
            />
          </div>
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
          toast.success(`Role "${newRole.name}" created. Now assign permissions.`);
          setSelectedRole(newRole as Role);
          setActiveTab("permissions");
        }}
      />

      {/* Delete Role Confirmation */}
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
              <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0 border-warning/40 text-warning bg-warning/5">
                <Lock className="h-2.5 w-2.5" /> Protected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {role.description || "No description"}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <code className="text-[10px] text-muted-foreground bg-muted px-1 rounded">{role.code}</code>
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
          <Settings2 className="h-3.5 w-3.5" /> Assign Permissions
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

// ─── Permissions Editor ────────────────────────────────────────────────────────
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

  const selectAll = () => setSelected(new Set(Object.values(permsByCategory).flat().map(p => p.key)));
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
          <Button variant="outline" size="sm" onClick={clearAll} className="text-xs h-7">Clear All</Button>
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">Select All</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <ScrollArea className="h-[480px] pr-3">
          <div className="space-y-5 pb-2">
            {Object.entries(permsByCategory).map(([category, perms]) => {
              const allSel = perms.every(p => selected.has(p.key));
              const colorClass = CATEGORY_COLORS[category] ?? "bg-muted/50 text-muted-foreground border-border";
              return (
                <div key={category} className="rounded-lg border overflow-hidden">
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
        <Button onClick={() => mutation.mutate([...selected])} disabled={mutation.isPending} className="gap-2">
          <Shield className="h-4 w-4" />
          {mutation.isPending ? "Saving…" : "Save Role Permissions"}
        </Button>
      </div>
    </div>
  );
}

// ─── Permission Catalog ────────────────────────────────────────────────────────
function PermissionCatalog({
  permissions, permsByCategory, onRefresh,
}: {
  permissions: Permission[];
  permsByCategory: Record<string, Permission[]>;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Permission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);

  const filtered = useMemo(() => {
    if (!search) return permissions;
    const s = search.toLowerCase();
    return permissions.filter(p =>
      p.key.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s) ||
      (p.description ?? "").toLowerCase().includes(s)
    );
  }, [permissions, search]);

  const filteredByCategory = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [filtered]);

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deletePermission(key),
    onSuccess: () => {
      onRefresh();
      toast.success("Permission deleted");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete permission"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permissions…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Permission
        </Button>
      </div>

      <ScrollArea className="h-[500px] pr-3">
        <div className="space-y-4 pb-2">
          {Object.entries(filteredByCategory).map(([category, perms]) => {
            const colorClass = CATEGORY_COLORS[category] ?? "bg-muted/50 text-muted-foreground border-border";
            return (
              <div key={category} className="rounded-lg border overflow-hidden">
                <div className={`flex items-center gap-2 px-3 py-2 border-b ${colorClass}`}>
                  <KeyRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-semibold flex-1">{category}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{perms.length}</Badge>
                </div>
                <div className="divide-y">
                  {perms.map(p => (
                    <div
                      key={p.key}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20 group transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                          {p.key}
                        </code>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {p.description || "No description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditTarget(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">No permissions found.</div>
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <PermissionFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        existingKeys={permissions.map(p => p.key)}
        onSaved={() => { onRefresh(); setIsCreateOpen(false); }}
      />

      {/* Edit Dialog */}
      <PermissionFormDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        permission={editTarget ?? undefined}
        existingKeys={permissions.map(p => p.key).filter(k => k !== editTarget?.key)}
        onSaved={() => { onRefresh(); setEditTarget(null); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Permission
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong><code>{deleteTarget?.key}</code></strong>?
              It will be removed from all roles that use it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.key)}
            >
              Delete Permission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Permission Form Dialog (Create / Edit) ────────────────────────────────────
function PermissionFormDialog({
  open, onOpenChange, permission, existingKeys, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  permission?: Permission;
  existingKeys: string[];
  onSaved: () => void;
}) {
  const isEdit = !!permission;
  const [key, setKey] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(permission?.key ?? "");
      setCategory(permission?.category ?? "");
      setDescription(permission?.description ?? "");
    }
  }, [open, permission]);

  const keyConflict = !isEdit && existingKeys.includes(key.trim());

  const handleSubmit = async () => {
    if (!key.trim()) { toast.error("Permission key is required"); return; }
    if (!category) { toast.error("Category is required"); return; }
    if (keyConflict) { toast.error("A permission with this key already exists"); return; }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updatePermission(permission!.key, { category, description: description.trim() });
        toast.success("Permission updated");
      } else {
        await createPermission({ key: key.trim(), category, description: description.trim() });
        toast.success("Permission created");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save permission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit
              ? <Pencil className="h-5 w-5 text-primary" />
              : <Plus className="h-5 w-5 text-primary" />}
            {isEdit ? "Edit Permission" : "Create New Permission"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the category or description. The key cannot be changed."
              : "Define a new permission that can be assigned to roles."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Key */}
          <div className="space-y-1.5">
            <Label htmlFor="perm-key">
              Permission Key <span className="text-destructive">*</span>
            </Label>
            {isEdit ? (
              <div className="px-3 py-2 rounded-md border bg-muted text-sm font-mono text-muted-foreground">
                {permission!.key}
              </div>
            ) : (
              <>
                <Input
                  id="perm-key"
                  placeholder="e.g. payroll.export"
                  value={key}
                  onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                  className={keyConflict ? "border-destructive" : ""}
                />
                {keyConflict && <p className="text-xs text-destructive">This key already exists.</p>}
                <p className="text-[11px] text-muted-foreground">
                  Use dot notation: <code>module.action</code> (e.g. <code>reports.export</code>)
                </p>
              </>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="perm-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="perm-category">
                <SelectValue placeholder="Select a module category…" />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="perm-desc">Description</Label>
            <Textarea
              id="perm-desc"
              placeholder="What does this permission allow?"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !key.trim() || !category || keyConflict}
          >
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Permission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Role Dialog ────────────────────────────────────────────────────────
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
