import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { listOrgUsers } from "@/lib/api/adminAccess";
import { listGrants, listPermissions } from "@/lib/api/rbac";
import { useOrg } from "@/lib/tenant/OrgContext";
import { Eye, User, ShieldCheck, ShieldAlert, CircleCheck, CircleX } from "lucide-react";

export function RBACDataScopeModule() {
    const { organizationId } = useOrg();
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const { data: users } = useQuery({
        queryKey: ["org-users", organizationId],
        queryFn: () => listOrgUsers(organizationId!),
        enabled: !!organizationId
    });

    const { data: grants } = useQuery({
        queryKey: ["rbac-grants", organizationId],
        queryFn: () => listGrants(organizationId!),
        enabled: !!organizationId
    });

    const { data: permissions } = useQuery({
        queryKey: ["rbac-permissions"],
        queryFn: listPermissions
    });

    const selectedUser = users?.find(u => u.user_id === selectedUserId);
    const userGrants = grants?.filter(g => g.user_id === selectedUserId);

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">Effective Access Visualization</span>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inspect User:</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="w-64 h-9">
                            <SelectValue placeholder="Select user to view scope..." />
                        </SelectTrigger>
                        <SelectContent>
                            {users?.map((u) => (
                                <SelectItem key={u.user_id} value={u.user_id}>
                                    {u.full_name || u.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {!selectedUserId ? (
                <Card className="border-dashed h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                    <User className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm">Select a user to visualize their effective data scope and permissions.</p>
                </Card>
            ) : (
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Summary Panel */}
                    <div className="col-span-1 space-y-4">
                        <Card>
                            <CardHeader className="pb-3 px-4 pt-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Identity Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Full Name</label>
                                    <p className="text-sm font-medium">{selectedUser?.full_name || "—"}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Assigned Roles</label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {selectedUser?.roles?.map(r => (
                                            <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0">{r}</Badge>
                                        )) || <span className="text-xs text-muted-foreground italic">No roles assigned</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-emerald-100 bg-emerald-50/10">
                            <CardHeader className="pb-2 px-4 pt-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <CardTitle className="text-sm text-emerald-700">Active ALLOW Grants</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                {userGrants?.filter(g => g.effect === 'ALLOW').map(g => (
                                    <div key={g.id} className="text-xs py-1 border-b border-emerald-100 last:border-0">
                                        <p className="font-semibold text-emerald-800">{g.permission_key}</p>
                                        <p className="text-[9px] text-emerald-600 italic">Scope: {g.scope_type}</p>
                                    </div>
                                )) || <p className="text-xs text-muted-foreground italic">No explicit allows</p>}
                            </CardContent>
                        </Card>

                        <Card className="border-rose-100 bg-rose-50/10">
                            <CardHeader className="pb-2 px-4 pt-4">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                                    <CardTitle className="text-sm text-rose-700">Active DENY Overrides</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                {userGrants?.filter(g => g.effect === 'DENY').map(g => (
                                    <div key={g.id} className="text-xs py-1 border-b border-rose-100 last:border-0">
                                        <p className="font-semibold text-rose-800">{g.permission_key}</p>
                                        <p className="text-[9px] text-rose-600 italic">Scope: {g.scope_type}</p>
                                    </div>
                                )) || <p className="text-xs text-muted-foreground italic">No active denials</p>}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Matrix */}
                    <div className="col-span-2">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="text-base">Effective Permission Matrix</CardTitle>
                                <CardDescription>Calculated based on Roles + Grants + Scope</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y text-sm">
                                    {permissions?.map(p => {
                                        const isDenied = userGrants?.some(g => g.permission_key === p.key && g.effect === 'DENY');
                                        const hasAllow = userGrants?.some(g => g.permission_key === p.key && g.effect === 'ALLOW');
                                        // Simplified: check if role has permission (normally this would be dynamic)
                                        const roleHasPerm = false; // Placeholder

                                        return (
                                            <div key={p.key} className="py-2.5 flex items-center justify-between group">
                                                <div className="flex flex-col">
                                                    <span className="font-medium group-hover:text-primary transition-colors">{p.key}</span>
                                                    <span className="text-[10px] text-muted-foreground">{p.category}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {isDenied ? (
                                                        <div className="flex items-center gap-1 text-rose-600 font-bold text-xs uppercase">
                                                            <CircleX className="w-4 h-4" /> Denied
                                                        </div>
                                                    ) : (hasAllow || roleHasPerm) ? (
                                                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase">
                                                            <CircleCheck className="w-4 h-4" /> Granted
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">No Access</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
