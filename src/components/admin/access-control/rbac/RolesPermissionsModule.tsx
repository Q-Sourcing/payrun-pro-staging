import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Shield, Plus, Pencil, Trash2, Search, Lock, Users, CheckSquare,
  Settings2, AlertTriangle, KeyRound, Save, ChevronRight,
  DollarSign, FolderKanban, BarChart3, ShieldAlert, Settings,
  UserCog, Clock, Calculator, FileText, LayoutGrid,
} from "lucide-react";
import {
  listRoles, createRole, deleteRole, listPermissions,
  listRolePermissions, setRolePermissions,
  createPermission, updatePermission, deletePermission,
  getUserModuleGrants, setUserModuleGrants, grantsToModuleAccess,
  type Role, type Permission, type Grant,
} from "@/lib/api/rbac";
import { useOrg } from '@/lib/auth/OrgProvider';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SYSTEM_MODULES_REGISTRY, PERMISSION_CATEGORIES, type ModuleDef } from "@/lib/constants/permissions-registry";
import { ModuleAccessSection, type ModuleAccess } from "@/components/settings/InviteUserDialog";

const PROTECTED_ROLES = ["PLATFORM_SUPER_ADMIN", "PLATFORM_AUDITOR", "ADMIN"];

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
  "Projects":              "bg-primary/5 text-primary border-primary/10",
  "EHS":                   "bg-destructive/5 text-destructive border-destructive/10",
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  Users:       <Users className="h-4 w-4" />,
  DollarSign:  <DollarSign className="h-4 w-4" />,
  FolderKanban:<FolderKanban className="h-4 w-4" />,
  BarChart3:   <BarChart3 className="h-4 w-4" />,
  ShieldAlert: <ShieldAlert className="h-4 w-4" />,
  Settings:    <Settings className="h-4 w-4" />,
  UserCog:     <UserCog className="h-4 w-4" />,
  Clock:       <Clock className="h-4 w-4" />,
  Calculator:  <Calculator className="h-4 w-4" />,
  FileText:    <FileText className="h-4 w-4" />,
  LayoutGrid:  <LayoutGrid className="h-4 w-4" />,
};

// ─── Main Component ────────────────────────────────────────────────────────────
export function RolesPermissionsModule() {
  const { organizationId } = useOrg();
  const orgId = organizationId ?? "00000000-0000-0000-0000-000000000001";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
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

  return (
    <div className="space-y-4">
      {/* Two-panel layout on md+, stacked on mobile */}
      <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[600px]">

        {/* ── LEFT PANEL: Role List ── */}
        <div className="flex flex-col gap-3 border rounded-lg p-3 bg-card">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search roles…"
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" className="gap-1.5 h-8 shrink-0 text-xs" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>

          <ScrollArea className="flex-1 -mx-1 px-1">
            {rolesLoading ? (
              <div className="text-center py-8 text-xs text-muted-foreground">Loading roles…</div>
            ) : (
              <div className="space-y-1">
                {businessRoles.map((role) => (
                  <RoleListItem
                    key={role.code}
                    role={role}
                    orgId={orgId}
                    isProtected={PROTECTED_ROLES.includes(role.code)}
                    isSelected={selectedRole?.code === role.code}
                    onSelect={() => setSelectedRole(role)}
                    onDelete={() => setDeleteTarget(role)}
                  />
                ))}
                {businessRoles.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground">No roles found.</div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── RIGHT PANEL: Permission Matrix ── */}
        <div className="border rounded-lg bg-card overflow-hidden">
          {selectedRole ? (
            <PermissionMatrixPanel
              role={selectedRole}
              orgId={orgId}
              permissions={permissions}
              permsByCategory={permsByCategory}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["role-permissions", selectedRole.code] });
                toast.success(`Permissions saved for ${selectedRole.name}`);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Shield className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Select a role to configure permissions</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Choose a role from the left panel to view and edit its module access.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Permission Catalog — collapsed by default to de-clutter */}
      <Accordion type="single" collapsible className="border rounded-lg">
        <AccordionItem value="catalog" className="border-none">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Permission Catalog
              <span className="text-xs font-normal text-muted-foreground">— add, edit or remove system permissions</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <PermissionCatalog
              permissions={permissions}
              permsByCategory={permsByCategory}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["rbac-permissions"] })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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

// ─── Role List Item (left panel) ───────────────────────────────────────────────
function RoleListItem({
  role, orgId, isProtected, isSelected, onSelect, onDelete,
}: {
  role: Role; orgId: string; isProtected: boolean;
  isSelected: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const { data: assignedPerms = [] } = useQuery({
    queryKey: ["role-permissions", role.code, orgId],
    queryFn: () => listRolePermissions(role.code, orgId),
  });

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors border ${
        isSelected
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-1.5 rounded-md shrink-0 ${isSelected ? "bg-primary/15" : "bg-muted/50"}`}>
          <Users className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-xs truncate">{role.name}</span>
            {isProtected && (
              <Badge variant="outline" className="text-[9px] gap-1 px-1 py-0 border-amber-400/40 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
                <Lock className="h-2 w-2" /> Protected
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{assignedPerms.length} permissions</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {isSelected && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
        {!isProtected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Permission Matrix Panel (right panel) ─────────────────────────────────────
function PermissionMatrixPanel({
  role, orgId, permissions, permsByCategory, onSaved,
}: {
  role: Role; orgId: string;
  permissions: Permission[];
  permsByCategory: Record<string, Permission[]>;
  onSaved: () => void;
}) {
  const { data: currentPerms = [], isLoading } = useQuery({
    queryKey: ["role-permissions", role.code, orgId],
    queryFn: () => listRolePermissions(role.code, orgId),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "granted" | "denied">("all");
  const [activeTab, setActiveTab] = useState("permissions");

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

  const toggleModule = (perms: Permission[]) => {
    const allSelected = perms.every(p => selected.has(p.key));
    setSelected(prev => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allSelected) next.delete(p.key); else next.add(p.key);
      }
      return next;
    });
  };

  const isDirty = useMemo(() => {
    const current = new Set(currentPerms);
    if (current.size !== selected.size) return true;
    for (const k of selected) if (!current.has(k)) return true;
    return false;
  }, [currentPerms, selected]);

  // Build module cards from registry, supplemented by DB permissions not in registry
  const registryKeySet = new Set(
    SYSTEM_MODULES_REGISTRY.flatMap(m => m.permissions.map(p => p.key))
  );
  const uncategorizedPerms = permissions.filter(p => !registryKeySet.has(p.key));

  // For each registry module, find matching DB permissions
  const moduleCards: Array<{ module: ModuleDef; dbPerms: Permission[] }> =
    SYSTEM_MODULES_REGISTRY.map(module => ({
      module,
      dbPerms: module.permissions
        .map(pd => permissions.find(p => p.key === pd.key))
        .filter((p): p is Permission => !!p),
    })).filter(({ dbPerms }) => dbPerms.length > 0);

  // Group uncategorized perms by their DB category
  const extraByCategory = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const p of uncategorizedPerms) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [uncategorizedPerms]);

  const totalPerms = permissions.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div>
          <h3 className="font-semibold text-sm">
            Permissions for <span className="text-primary">{role.name}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {selected.size} of {totalPerms} permissions enabled
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b gap-3">
          <TabsList className="h-8">
            <TabsTrigger value="permissions" className="text-xs h-7 px-3">Permissions</TabsTrigger>
            <TabsTrigger value="user-overrides" className="text-xs h-7 px-3">User Overrides</TabsTrigger>
          </TabsList>
          {activeTab === "permissions" && (
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={filter}
                onValueChange={(v) => v && setFilter(v as any)}
                className="h-7"
              >
                <ToggleGroupItem value="all" className="h-7 text-xs px-2.5">All</ToggleGroupItem>
                <ToggleGroupItem value="granted" className="h-7 text-xs px-2.5">Granted</ToggleGroupItem>
                <ToggleGroupItem value="denied" className="h-7 text-xs px-2.5">Denied</ToggleGroupItem>
              </ToggleGroup>
              <Button
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => mutation.mutate([...selected])}
                disabled={mutation.isPending || !isDirty}
              >
                <Save className="h-3.5 w-3.5" />
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="permissions" className="flex-1 overflow-hidden mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground py-12">
              Loading permissions…
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {/* Registry-based module cards */}
                {moduleCards.map(({ module, dbPerms }) => (
                  <ModulePermissionCard
                    key={module.id}
                    module={module}
                    dbPerms={dbPerms}
                    selected={selected}
                    filter={filter}
                    onToggle={toggle}
                    onToggleAll={() => toggleModule(dbPerms)}
                  />
                ))}

                {/* Extra DB permissions not in registry */}
                {Object.entries(extraByCategory).map(([category, perms]) => {
                  const filteredPerms = perms.filter(p =>
                    filter === "all" ? true :
                    filter === "granted" ? selected.has(p.key) :
                    !selected.has(p.key)
                  );
                  if (filteredPerms.length === 0) return null;
                  return (
                    <div key={category} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                        <div className="p-1.5 rounded-md bg-background border shrink-0 text-muted-foreground">
                          <KeyRound className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-foreground flex-1">{category}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{filteredPerms.length}</Badge>
                      </div>
                      <div className="divide-y">
                        {filteredPerms.map(p => (
                          <PermissionRow
                            key={p.key}
                            permKey={p.key}
                            description={p.description || p.key}
                            isSelected={selected.has(p.key)}
                            onToggle={() => toggle(p.key)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {moduleCards.length === 0 && Object.keys(extraByCategory).length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No permissions found in the system.
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="user-overrides" className="flex-1 overflow-hidden mt-0">
          <UserOverridesPanel role={role} orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── User Overrides Panel ──────────────────────────────────────────────────────
function UserOverridesPanel({ role, orgId }: { role: Role; orgId: string }) {
  const [editTarget, setEditTarget] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [editAccess, setEditAccess] = useState<Record<string, ModuleAccess>>({});
  const [saving, setSaving] = useState(false);

  // Users assigned to this role
  const { data: assignments = [] } = useQuery({
    queryKey: ["role-assignments", role.code],
    queryFn: async () => {
      const { data } = await supabase
        .from("rbac_assignments" as any)
        .select("user_id")
        .eq("role_code", role.code);
      return (data ?? []) as { user_id: string }[];
    },
  });

  const userIds = assignments.map((a) => a.user_id);

  // Profiles for those users
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-role", role.code, userIds.join(",")],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
        email: p.email,
      })) as { id: string; full_name: string; email: string }[];
    },
    enabled: userIds.length > 0,
  });

  // All ALLOW grants for these users at this org
  const { data: allGrants = [], refetch: refetchGrants } = useQuery({
    queryKey: ["user-grants-for-role", role.code, orgId],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await supabase
        .from("rbac_grants" as any)
        .select("*")
        .in("user_id", userIds)
        .eq("scope_type", "ORGANIZATION")
        .eq("scope_id", orgId)
        .eq("effect", "ALLOW");
      return (data ?? []) as Grant[];
    },
    enabled: userIds.length > 0,
  });

  const grantsByUser = useMemo(() => {
    const map: Record<string, Grant[]> = {};
    for (const g of allGrants) {
      if (!g.user_id) continue;
      if (!map[g.user_id]) map[g.user_id] = [];
      map[g.user_id].push(g);
    }
    return map;
  }, [allGrants]);

  const openEdit = (profile: { id: string; full_name: string; email: string }) => {
    const grants = grantsByUser[profile.id] ?? [];
    setEditAccess(grantsToModuleAccess(grants));
    setEditTarget(profile);
  };

  async function handleSaveGrants() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await setUserModuleGrants(editTarget.id, orgId, editAccess);
      toast.success(`Module access updated for ${editTarget.full_name}`);
      refetchGrants();
      setEditTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update grants");
    } finally {
      setSaving(false);
    }
  }

  if (!userIds.length && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Users className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No users have this role yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Assign this role to users via the User Management tab.
        </p>
      </div>
    );
  }

  const MODULE_LABELS: Record<string, string> = Object.fromEntries(
    SYSTEM_MODULES_REGISTRY.map((m) => [m.id, m.label])
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Users with the <strong>{role.name}</strong> role. Module access overrides are{" "}
          <strong>additive</strong> — they grant extra permissions on top of the base role.
        </p>

        {profiles.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
            No user profiles found for this role.
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Module Access Overrides</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {profiles.map((profile) => {
                  const grants = grantsByUser[profile.id] ?? [];
                  const access = grantsToModuleAccess(grants);
                  const activeModules = Object.entries(access).filter(([, v]) => v !== "none");
                  return (
                    <tr key={profile.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{profile.full_name}</div>
                        <div className="text-xs text-muted-foreground">{profile.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {activeModules.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">No overrides</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {activeModules.map(([moduleId, level]) => (
                              <Badge
                                key={moduleId}
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  level === "full"
                                    ? "border-primary/40 text-primary bg-primary/5"
                                    : "border-blue-400/40 text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                                }`}
                              >
                                {MODULE_LABELS[moduleId] ?? moduleId}: {level === "full" ? "Full" : "View"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(profile)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Module Access Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Edit Module Access
            </DialogTitle>
            <DialogDescription>
              Configure additional permission grants for{" "}
              <strong>{editTarget?.full_name}</strong> on top of their{" "}
              <strong>{role.name}</strong> role.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ModuleAccessSection value={editAccess} onChange={setEditAccess} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveGrants} disabled={saving} className="gap-2">
              {saving && <CheckSquare className="h-4 w-4 animate-spin" />}
              Save Grants
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

// ─── Module Permission Card ────────────────────────────────────────────────────
function ModulePermissionCard({
  module, dbPerms, selected, filter, onToggle, onToggleAll,
}: {
  module: ModuleDef;
  dbPerms: Permission[];
  selected: Set<string>;
  filter: "all" | "granted" | "denied";
  onToggle: (key: string) => void;
  onToggleAll: () => void;
}) {
  const [open, setOpen] = useState(true);

  const filteredPerms = dbPerms.filter(p =>
    filter === "all" ? true :
    filter === "granted" ? selected.has(p.key) :
    !selected.has(p.key)
  );

  const enabledCount = dbPerms.filter(p => selected.has(p.key)).length;
  const total = dbPerms.length;
  const allEnabled = enabledCount === total && total > 0;
  const icon = MODULE_ICONS[module.icon] ?? <Shield className="h-4 w-4" />;

  if (filteredPerms.length === 0 && filter !== "all") return null;

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Card Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="p-1.5 rounded-md bg-background border shrink-0 text-muted-foreground">
          {icon}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{module.label}</span>
          <Badge
            variant={enabledCount > 0 ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0 font-normal"
          >
            {enabledCount} / {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">Enable all</span>
          <Switch
            checked={allEnabled}
            onCheckedChange={onToggleAll}
          />
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
        />
      </div>

      {/* Permission Rows */}
      {open && filteredPerms.length > 0 && (
        <div className="divide-y">
          {filteredPerms.map(p => {
            const registryPerm = SYSTEM_MODULES_REGISTRY
              .flatMap(m => m.permissions)
              .find(pd => pd.key === p.key);
            return (
              <PermissionRow
                key={p.key}
                permKey={p.key}
                description={registryPerm?.description || p.description || p.key}
                isSelected={selected.has(p.key)}
                onToggle={() => onToggle(p.key)}
              />
            );
          })}
        </div>
      )}
      {open && filteredPerms.length === 0 && filter !== "all" && (
        <div className="px-4 py-3 text-xs text-muted-foreground italic">
          No {filter} permissions in this module.
        </div>
      )}
    </div>
  );
}

// ─── Permission Row ────────────────────────────────────────────────────────────
function PermissionRow({
  permKey, description, isSelected, onToggle,
}: {
  permKey: string; description: string; isSelected: boolean; onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
        isSelected ? "bg-primary/5" : ""
      }`}
      onClick={onToggle}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-tight ${!isSelected ? "opacity-60" : ""}`}>
          {description}
        </p>
        <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded mt-0.5 inline-block">
          {permKey}
        </code>
      </div>
      <Switch
        checked={isSelected}
        onCheckedChange={onToggle}
        className="h-4 w-7 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
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

      <ScrollArea className="h-[400px] pr-3">
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

      <PermissionFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        existingKeys={permissions.map(p => p.key)}
        onSaved={() => { onRefresh(); setIsCreateOpen(false); }}
      />
      <PermissionFormDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        permission={editTarget ?? undefined}
        existingKeys={permissions.map(p => p.key).filter(k => k !== editTarget?.key)}
        onSaved={() => { onRefresh(); setEditTarget(null); }}
      />
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

// ─── Permission Form Dialog ────────────────────────────────────────────────────
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
            {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
            {isEdit ? "Edit Permission" : "Create New Permission"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the category or description. The key cannot be changed."
              : "Define a new permission that can be assigned to roles."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
            Define the role name and description. After creation, select it to assign permissions.
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
            <div className={`px-3 py-2 rounded-md border text-sm font-mono ${
              codeConflict ? "border-destructive bg-destructive/5 text-destructive" : "bg-muted text-muted-foreground"
            }`}>
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
