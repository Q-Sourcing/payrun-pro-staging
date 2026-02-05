import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";

export function RBACApprovalsModule() {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Access Request Queue</span>
            </div>

            <div className="border rounded-md overflow-hidden opacity-60 grayscale-[0.5]">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Requested By</TableHead>
                            <TableHead>Permission</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 rounded-full bg-muted/50">
                                        <Clock className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-sm">Approval Workflow Offline</p>
                                        <p className="text-xs text-muted-foreground">Self-service permission requests are coming in a future update.</p>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
