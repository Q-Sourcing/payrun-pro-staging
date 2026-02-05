import { useQuery } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listRoles } from "@/lib/api/rbac";
import { Shield, Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function RBACRolesModule() {
    const { data: roles, isLoading } = useQuery({
        queryKey: ["rbac-roles"],
        queryFn: listRoles
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Role Registry</span>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Role Name</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead className="w-[400px]">Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8">Loading roles...</TableCell></TableRow>
                        ) : roles?.map((r) => (
                            <TableRow key={r.code} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-semibold">
                                    <div className="flex items-center gap-2">
                                        {r.name}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">Internal Code: <code className="bg-muted px-1 rounded">{r.code}</code></p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={r.tier === 'PLATFORM' ? 'destructive' : 'secondary'} className="text-[10px] font-bold">
                                        {r.tier}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {r.tier === 'PLATFORM' ? 'System-wide' : 'Organization-scoped'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {r.description || "No description available."}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
