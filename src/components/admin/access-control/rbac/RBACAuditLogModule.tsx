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
import { format } from "date-fns";
import { listAuditLogs } from "@/lib/api/rbac";
import { useOrg } from "@/lib/tenant/OrgContext";
import { History, User, Activity } from "lucide-react";

export function RBACAuditLogModule() {
    const { organizationId } = useOrg();
    const { data: logs, isLoading } = useQuery({
        queryKey: ["rbac-audit-logs", organizationId],
        queryFn: () => listAuditLogs(organizationId!),
        enabled: !!organizationId
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="w-4 h-4" />
                    <span className="text-sm font-medium">Compliance Audit Trail</span>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[180px]">Timestamp</TableHead>
                            <TableHead>Event Type</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="w-[300px]">Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">Loading audit trail...</TableCell></TableRow>
                        ) : logs?.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit entries found.</TableCell></TableRow>
                        ) : logs?.map((log) => (
                            <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                                <TableCell className="text-muted-foreground font-mono">
                                    {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-[9px] uppercase">
                                        {log.event_type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <User className="w-3 h-3 text-muted-foreground" />
                                        {log.actor_id?.slice(0, 8) || "System"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        <Activity className="w-3 h-3 text-muted-foreground" />
                                        {log.target_type}: {log.target_id?.slice(0, 8)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground italic">
                                    {log.description}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
