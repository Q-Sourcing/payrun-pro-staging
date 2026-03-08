import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    Search,
    Lock,
    Users,
    ChevronRight,
    AlertTriangle,
} from "lucide-react";
import {
    listRoles,
    createRole,
    deleteRole,
    listPermissions,
    listRolePermissions,
    setRolePermissions,
    type Role,
    type Permission,
} from "@/lib/api/rbac";
import { useOrg } from "@/lib/tenant/OrgContext";
import { toast } from "sonner";

// Roles that cannot be deleted (system-critical)
const PROTECTED_ROLES = ["PLATFORM_SUPER_ADMIN", "ORG_ADMIN", "PLATFORM_AUDITOR"];
// Critical permissions that cannot be removed from ORG_ADMIN
const CRITICAL_PERMISSIONS = ["admin.manage_users", "admin.assign_roles"];

const TIER_COLORS: Record<string, string> = {
    PLATFORM: "bg-destructive/10 text-destructive border-destructive/20",
    ORGANIZATION: "bg-primary/10 text-primary border-primary/20",
    COMPANY: "bg-amber-500/10 text-amber-600 border-amber-200/50",
    PROJECT: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function RolesPermissionsModule() {
    const { organizationId } = useOrg();
    const orgId = organizationId ?? "00000000-0000-0000-0000-000000000001";
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

    const { data: roles = [], isLoading: rolesLoading } = useQuery({
        queryKey: ["rbac-roles"],
        queryFn: listRoles,
    });

    const { data: permissions = [], isLoading: permsLoading } = useQuery({
        queryKey: ["rbac-permissions"],
        queryFn: listPermissions,
    });

    const filteredRoles = useMemo(() => {
        if (!search) return roles;
        const s = search.toLowerCase();
        return roles.filter(
            (r) =>
                r.name.toLowerCase().includes(s) ||
                r.code.toLowerCase().includes(s) ||
                r.tier.toLowerCase().includes(s)
        );
    }, [roles, search]);

    const groupedByTier = useMemo(() => {
        const tiers: Record<string, Role[]> = {};
        for (const role of filteredRoles) {
            if (!tiers[role.tier]) tiers[role.tier] = [];
            tiers[role.tier].push(role);
        }
        return tiers;
    }, [filteredRoles]);

    const deleteMutation = useMutation({
        mutationFn: (code: string) => deleteRole(code),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["rbac-roles"] });
            toast.success("Role deleted successfully");
            setDeleteTarget(null);
            if (selectedRole?.code === deleteTarget?.code) setSelectedRole(null);
        },
        onError: (err: any) => toast.error(err.message || "Failed to delete role"),
    });

    const handleEditOpen = (role: Role) => {
        setSelectedRole(role);
        setIsEditOpen(true);
    };

    const permsByCategory = useMemo(() => {
        const map: Record<string, Permission[]> = {};
        for (const p of permissions) {
            if (!map[p.category]) map[p.category] = [];
            map[p.category].push(p);
        }
        return map;
    }, [permissions]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">
                        {roles.length} role{roles.length !== 1 ? "s" : ""} registered
                    </span>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4" />
                    New Role
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search roles by name, code or tier..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Role List grouped by tier */}
            {rolesLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">Loading roles…</div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedByTier).map(([tier, tierRoles]) => (
                        <div key={tier}>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold uppercase ${TIER_COLORS[tier] ?? ""}`}
                                >
                                    {tier}
                                </Badge>
                                <Separator className="flex-1" />
                            </div>
                            <div className="grid gap-2">
                                {tierRoles.map((role) => (
                                    <RoleCard
                                        key={role.code}
                                        role={role}
                                        orgId={orgId}
                                        onEdit={() => handleEditOpen(role)}
                                        onDelete={() => setDeleteTarget(role)}
                                        isProtected={PROTECTED_ROLES.includes(role.code)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredRoles.length === 0 && (
                        <div className="text-center py-10 text-sm text-muted-foreground">
                            No roles match your search.
                        </div>
                    )}
                </div>
            )}

            {/* Edit Permissions Dialog */}
            {selectedRole && (
                <EditPermissionsDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    role={selectedRole}
                    orgId={orgId}
                    permsByCategory={permsByCategory}
                    onSaved={() => {
                        qc.invalidateQueries({ queryKey: ["role-permissions", selectedRole.code] });
                        setIsEditOpen(false);
                    }}
                />
            )}

            {/* Create Role Dialog */}
            <CreateRoleDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                orgId={orgId}
                permsByCategory={permsByCategory}
                existingCodes={roles.map((r) => r.code)}
                onSaved={() => {
                    qc.invalidateQueries({ queryKey: ["rbac-roles"] });
                    setIsCreateOpen(false);
                }}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Delete Role
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the role{" "}
                            <strong>{deleteTarget?.name}</strong>? All permission assignments for
                            this role will also be removed. This action cannot be undone.
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

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({
    role,
    orgId,
    onEdit,
    onDelete,
    isProtected,
}: {
    role: Role;
    orgId: string;
    onEdit: () => void;
    onDelete: () => void;
    isProtected: boolean;
}) {
    const { data: assignedPerms = [] } = useQuery({
        queryKey: ["role-permissions", role.code, orgId],
        queryFn: () => listRolePermissions(role.code, orgId),
    });

    return (
        <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/20 transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-md bg-muted/50 shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{role.name}</span>
                        {isProtected && (
                            <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50">
                                <Lock className="w-2.5 h-2.5" />
                                Protected
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
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="w-3.5 h-3.5" />
                </Button>
                {!isProtected && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── Edit Permissions Dialog ──────────────────────────────────────────────────

function EditPermissionsDialog({
    open,
    onOpenChange,
    role,
    orgId,
    permsByCategory,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    role: Role;
    orgId: string;
    permsByCategory: Record<string, Permission[]>;
    onSaved: () => void;
}) {
    const { data: currentPerms = [], isLoading } = useQuery({
        queryKey: ["role-permissions", role.code, orgId],
        queryFn: () => listRolePermissions(role.code, orgId),
        enabled: open,
    });

    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Sync when data loads
    useMemo(() => {
        setSelected(new Set(currentPerms));
    }, [currentPerms]);

    const mutation = useMutation({
        mutationFn: (keys: string[]) => setRolePermissions(role.code, orgId, keys),
        onSuccess: () => {
            toast.success("Permissions updated successfully");
            onSaved();
        },
        onError: (err: any) => toast.error(err.message || "Failed to update permissions"),
    });

    const isProtected = PROTECTED_ROLES.includes(role.code);

    const toggle = (key: string) => {
        // Guard: prevent removing critical permissions from ORG_ADMIN
        if (isProtected && CRITICAL_PERMISSIONS.includes(key) && selected.has(key)) {
            toast.error("This permission is required and cannot be removed from this role.");
            return;
        }
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleCategory = (perms: Permission[]) => {
        const allSelected = perms.every((p) => selected.has(p.key));
        setSelected((prev) => {
            const next = new Set(prev);
            for (const p of perms) {
                if (isProtected && CRITICAL_PERMISSIONS.includes(p.key)) continue;
                if (allSelected) next.delete(p.key);
                else next.add(p.key);
            }
            return next;
        });
    };

    const handleSave = () => mutation.mutate([...selected]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Edit Permissions — {role.name}
                    </DialogTitle>
                    <DialogDescription>
                        Select which permissions are granted to this role. Changes take effect
                        immediately.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-10 text-sm text-muted-foreground">
                        Loading permissions…
                    </div>
                ) : (
                    <ScrollArea className="flex-1 overflow-auto pr-1">
                        <div className="space-y-4 py-2">
                            {Object.entries(permsByCategory).map(([category, perms]) => {
                                const allSelected = perms.every((p) => selected.has(p.key));
                                const someSelected = perms.some((p) => selected.has(p.key));
                                return (
                                    <div key={category}>
                                        {/* Category header */}
                                        <div
                                            className="flex items-center gap-2 mb-2 cursor-pointer"
                                            onClick={() => toggleCategory(perms)}
                                        >
                                            <Checkbox
                                                checked={allSelected}
                                                data-state={
                                                    allSelected
                                                        ? "checked"
                                                        : someSelected
                                                        ? "indeterminate"
                                                        : "unchecked"
                                                }
                                                className="data-[state=indeterminate]:bg-primary/50"
                                                onCheckedChange={() => toggleCategory(perms)}
                                            />
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                {category}
                                            </span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {perms.filter((p) => selected.has(p.key)).length}/
                                                {perms.length}
                                            </Badge>
                                        </div>
                                        {/* Permission rows */}
                                        <div className="grid gap-1.5 ml-6">
                                            {perms.map((perm) => {
                                                const locked =
                                                    isProtected &&
                                                    CRITICAL_PERMISSIONS.includes(perm.key);
                                                return (
                                                    <label
                                                        key={perm.key}
                                                        className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                                                            selected.has(perm.key)
                                                                ? "bg-primary/5 border-primary/20"
                                                                : "bg-background border-border/40 hover:border-border"
                                                        } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
                                                    >
                                                        <Checkbox
                                                            checked={selected.has(perm.key)}
                                                            onCheckedChange={() => toggle(perm.key)}
                                                            disabled={locked}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <code className="text-xs font-bold text-primary">
                                                                    {perm.key}
                                                                </code>
                                                                {locked && (
                                                                    <Lock className="w-3 h-3 text-amber-500" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                                {perm.description}
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <Separator className="mt-3" />
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="gap-2 pt-2">
                    <div className="flex-1 text-xs text-muted-foreground flex items-center">
                        {selected.size} permission{selected.size !== 1 ? "s" : ""} selected
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving…" : "Save Permissions"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Create Role Dialog ───────────────────────────────────────────────────────

function CreateRoleDialog({
    open,
    onOpenChange,
    orgId,
    permsByCategory,
    existingCodes,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    orgId: string;
    permsByCategory: Record<string, Permission[]>;
    existingCodes: string[];
    onSaved: () => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [tier, setTier] = useState("ORGANIZATION");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

    // Auto-derive code from name
    const derivedCode = name
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "_");

    const toggle = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleCategory = (perms: Permission[]) => {
        const allSelected = perms.every((p) => selected.has(p.key));
        setSelected((prev) => {
            const next = new Set(prev);
            for (const p of perms) {
                if (allSelected) next.delete(p.key);
                else next.add(p.key);
            }
            return next;
        });
    };

    const validate = () => {
        const e: typeof errors = {};
        if (!name.trim()) e.name = "Role name is required";
        if (existingCodes.includes(derivedCode)) e.code = "A role with this code already exists";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const mutation = useMutation({
        mutationFn: async () => {
            await createRole({
                code: derivedCode,
                name: name.trim(),
                description: description.trim(),
                tier,
                org_id: tier === "PLATFORM" ? "00000000-0000-0000-0000-000000000000" : orgId,
            });
            if (selected.size > 0) {
                await setRolePermissions(derivedCode, orgId, [...selected]);
            }
        },
        onSuccess: () => {
            toast.success("Role created successfully");
            // Reset
            setName("");
            setDescription("");
            setTier("ORGANIZATION");
            setSelected(new Set());
            setErrors({});
            onSaved();
        },
        onError: (err: any) => toast.error(err.message || "Failed to create role"),
    });

    const handleCreate = () => {
        if (!validate()) return;
        mutation.mutate();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    setName("");
                    setDescription("");
                    setTier("ORGANIZATION");
                    setSelected(new Set());
                    setErrors({});
                }
                onOpenChange(o);
            }}
        >
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Create New Role
                    </DialogTitle>
                    <DialogDescription>
                        Define a new role and select its permissions. The role code is derived
                        automatically from the name.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-auto pr-1">
                    <div className="space-y-5 py-2">
                        {/* Role metadata */}
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>
                                        Role Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g. Payroll Analyst"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setErrors((prev) => ({ ...prev, name: undefined }));
                                        }}
                                        className={errors.name ? "border-destructive" : ""}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{errors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Tier</Label>
                                    <Select value={tier} onValueChange={setTier}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ORGANIZATION">Organization</SelectItem>
                                            <SelectItem value="COMPANY">Company</SelectItem>
                                            <SelectItem value="PROJECT">Project</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Input
                                    placeholder="What can this role do?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Auto-generated Code</Label>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40">
                                    <code className="text-xs text-primary font-bold flex-1">
                                        {derivedCode || "…"}
                                    </code>
                                </div>
                                {errors.code && (
                                    <p className="text-xs text-destructive">{errors.code}</p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Permission selector */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Lock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">Assign Permissions</span>
                                <Badge variant="outline" className="text-[10px]">
                                    {selected.size} selected
                                </Badge>
                            </div>
                            <div className="space-y-4">
                                {Object.entries(permsByCategory).map(([category, perms]) => {
                                    const allSelected = perms.every((p) => selected.has(p.key));
                                    const someSelected = perms.some((p) => selected.has(p.key));
                                    return (
                                        <div key={category}>
                                            <div
                                                className="flex items-center gap-2 mb-2 cursor-pointer"
                                                onClick={() => toggleCategory(perms)}
                                            >
                                                <Checkbox
                                                    checked={allSelected}
                                                    data-state={
                                                        allSelected
                                                            ? "checked"
                                                            : someSelected
                                                            ? "indeterminate"
                                                            : "unchecked"
                                                    }
                                                    onCheckedChange={() => toggleCategory(perms)}
                                                />
                                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    {category}
                                                </span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {perms.filter((p) => selected.has(p.key)).length}/
                                                    {perms.length}
                                                </Badge>
                                            </div>
                                            <div className="grid gap-1.5 ml-6">
                                                {perms.map((perm) => (
                                                    <label
                                                        key={perm.key}
                                                        className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                                                            selected.has(perm.key)
                                                                ? "bg-primary/5 border-primary/20"
                                                                : "bg-background border-border/40 hover:border-border"
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            checked={selected.has(perm.key)}
                                                            onCheckedChange={() => toggle(perm.key)}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="min-w-0">
                                                            <code className="text-xs font-bold text-primary">
                                                                {perm.key}
                                                            </code>
                                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                                {perm.description}
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            <Separator className="mt-3" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={mutation.isPending || !name.trim()}>
                        {mutation.isPending ? "Creating…" : "Create Role"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
