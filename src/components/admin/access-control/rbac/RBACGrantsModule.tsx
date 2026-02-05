import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, Search, Trash2, Clock, AlertTriangle } from "lucide-react";
import { listGrants, createGrant, deleteGrant, listPermissions, listRoles } from "@/lib/api/rbac";
import { listOrgUsers, listCompanies } from "@/lib/api/adminAccess";
import { useOrg } from "@/lib/tenant/OrgContext";
import { toast } from "sonner";

export function RBACGrantsModule() {
    const { organizationId } = useOrg();
    const orgId = organizationId;
    const qc = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Queries
    const { data: grants, isLoading: loadingGrants } = useQuery({
        queryKey: ["rbac-grants", orgId],
        queryFn: () => listGrants(orgId!),
        enabled: !!orgId
    });

    const { data: permissions } = useQuery({
        queryKey: ["rbac-permissions"],
        queryFn: listPermissions
    });

    const { data: roles } = useQuery({
        queryKey: ["rbac-roles"],
        queryFn: listRoles
    });

    const { data: users } = useQuery({
        queryKey: ["org-users", orgId],
        queryFn: () => listOrgUsers(orgId!),
        enabled: !!orgId
    });

    const { data: companies } = useQuery({
        queryKey: ["org-companies", orgId],
        queryFn: () => listCompanies(orgId!),
        enabled: !!orgId
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: deleteGrant,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["rbac-grants"] });
            toast.success("Grant removed successfully");
        }
    });

    const filteredGrants = useMemo(() => {
        if (!grants) return [];
        if (!searchTerm) return grants;
        const s = searchTerm.toLowerCase();
        return grants.filter(g =>
            g.permission_key.toLowerCase().includes(s) ||
            (g.reason && g.reason.toLowerCase().includes(s))
        );
    }, [grants, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search grants or reasons..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <AddGrantModal
                    orgId={orgId!}
                    permissions={permissions || []}
                    roles={roles || []}
                    users={users || []}
                    companies={companies || []}
                    onSuccess={() => {
                        qc.invalidateQueries({ queryKey: ["rbac-grants"] });
                    }}
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[200px]">Permission</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Effect</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Valid Until</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingGrants ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading grants...</TableCell></TableRow>
                        ) : filteredGrants.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No custom grants found.</TableCell></TableRow>
                        ) : filteredGrants.map((g) => (
                            <TableRow key={g.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                    {g.permission_key}
                                    {g.reason && <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{g.reason}</p>}
                                </TableCell>
                                <TableCell>
                                    {g.user_id ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm">{users?.find(u => u.user_id === g.user_id)?.full_name || "Unknown User"}</span>
                                            <span className="text-[10px] text-muted-foreground">User ID: {g.user_id.slice(0, 8)}...</span>
                                        </div>
                                    ) : (
                                        <Badge variant="outline">{g.role_code || "Any Account Holder"}</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge className={g.effect === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200/50' : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-200/50'}>
                                        {g.effect}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm capitalize">{g.scope_type.toLowerCase()}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {g.scope_type === 'COMPANY' ? companies?.find(c => c.id === g.scope_id)?.name : 'Org Level'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {g.valid_until ? (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(g.valid_until), "MMM d, yyyy")}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Indefinite</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteMutation.mutate(g.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function AddGrantModal({ orgId, permissions, roles, users, companies, onSuccess }: any) {
    const [open, setOpen] = useState(false);
    const [targetType, setTargetType] = useState<"user" | "role">("user");
    const [targetId, setTargetId] = useState("");
    const [permissionKey, setPermissionKey] = useState("");
    const [effect, setEffect] = useState<"ALLOW" | "DENY">("ALLOW");
    const [scopeType, setScopeType] = useState<"ORGANIZATION" | "COMPANY" | "PROJECT">("ORGANIZATION");
    const [scopeId, setScopeId] = useState(orgId);
    const [validUntil, setValidUntil] = useState<Date | undefined>();
    const [reason, setReason] = useState("");

    const mutation = useMutation({
        mutationFn: createGrant,
        onSuccess: () => {
            toast.success("Grant created successfully");
            setOpen(false);
            onSuccess();
            // Reset
            setPermissionKey("");
            setTargetId("");
            setReason("");
            setValidUntil(undefined);
        }
    });

    const handleSave = () => {
        if (!permissionKey || !targetId || !reason) {
            toast.error("Please fill in all required fields");
            return;
        }
        mutation.mutate({
            org_id: orgId,
            user_id: targetType === "user" ? targetId : null,
            role_code: targetType === "role" ? targetId : null,
            permission_key: permissionKey,
            effect,
            scope_type: scopeType,
            scope_id: scopeType === "ORGANIZATION" ? orgId : scopeId,
            valid_until: validUntil ? validUntil.toISOString() : null,
            reason
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Grant
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Permission Grant</DialogTitle>
                    <DialogDescription>
                        Explicitly allow or deny a specific permission for a user or role.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Type</Label>
                            <Select value={targetType} onValueChange={(v: any) => { setTargetType(v); setTargetId(""); }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Specific User</SelectItem>
                                    <SelectItem value="role">Internal Role</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{targetType === "user" ? "User" : "Role"}</Label>
                            <Select value={targetId} onValueChange={setTargetId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${targetType}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {targetType === "user" ? (
                                        users.map((u: any) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>)
                                    ) : (
                                        roles.map((r: any) => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Permission</Label>
                        <Select value={permissionKey} onValueChange={setPermissionKey}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select permission..." />
                            </SelectTrigger>
                            <SelectContent>
                                {permissions.map((p: any) => (
                                    <SelectItem key={p.key} value={p.key}>
                                        <div className="flex flex-col text-left">
                                            <span>{p.key}</span>
                                            <span className="text-[10px] text-muted-foreground">{p.category}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Effect</Label>
                            <div className="flex gap-2 p-1 border rounded-md bg-muted/30">
                                <Button
                                    size="sm"
                                    variant={effect === 'ALLOW' ? 'secondary' : 'ghost'}
                                    className={`flex-1 h-8 ${effect === 'ALLOW' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : ''}`}
                                    onClick={() => setEffect('ALLOW')}
                                >
                                    ALLOW
                                </Button>
                                <Button
                                    size="sm"
                                    variant={effect === 'DENY' ? 'secondary' : 'ghost'}
                                    className={`flex-1 h-8 ${effect === 'DENY' ? 'bg-rose-500 text-white hover:bg-rose-600' : ''}`}
                                    onClick={() => setEffect('DENY')}
                                >
                                    DENY
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Scope</Label>
                            <Select value={scopeType} onValueChange={(v: any) => setScopeType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ORGANIZATION">Organization Wide</SelectItem>
                                    <SelectItem value="COMPANY">Specific Company</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {scopeType === 'COMPANY' && (
                        <div className="space-y-2">
                            <Label>Target Company</Label>
                            <Select value={scopeId} onValueChange={setScopeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Temporary Expiry (Optional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={`w-full justify-start text-left font-normal ${!validUntil && "text-muted-foreground"}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {validUntil ? format(validUntil, "PPP") : <span>No expiry</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={validUntil}
                                        onSelect={setValidUntil}
                                        initialFocus
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason / Reference</Label>
                            <Input
                                placeholder="e.g. Temp cover for holiday"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>

                    {effect === 'DENY' && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-md flex gap-3 text-rose-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                <strong>Caution:</strong> DENY overrides all inherited role permissions for this target and scope.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? "Applying..." : "Confirm Grant"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
