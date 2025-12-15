import { useState, useEffect } from "react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileDown } from "lucide-react";

export const ApprovalAuditReport = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const { data: payruns, error } = await supabase
            .from('pay_runs')
            .select(`
                id,
                pay_period_start,
                pay_period_end,
                approval_status,
                approval_submitted_at,
                approved_at,
                approval_submitted_by, 
                created_by
                /* Join users if possible, or fetch separate */
            `)
            .not('approval_submitted_at', 'is', null)
            .order('approval_submitted_at', { ascending: false });

        if (payruns) {
            // Should fetch user names ideally. 
            // For now displaying raw data or simplified.
            setData(payruns);
        }
        setLoading(false);
    };

    const calculateDuration = (start: string, end: string | null) => {
        if (!end) return "Pending";
        const startDate = new Date(start);
        const endDate = new Date(end);
        const hours = differenceInHours(endDate, startDate);
        if (hours < 1) {
            const mins = differenceInMinutes(endDate, startDate);
            return `${mins} mins`;
        }
        return `${hours} hours`;
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Approval Audit Log</CardTitle>
                        <CardDescription>Track approval turnaround times and history</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                        <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pay Period</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted At</TableHead>
                            <TableHead>Completed At</TableHead>
                            <TableHead>Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    {format(new Date(row.pay_period_start), 'MMM d')} - {format(new Date(row.pay_period_end), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={(row.approval_status === 'approved' || row.approval_status === 'locked') ? 'default' : 'secondary'}>
                                        {row.approval_status || 'Unknown'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(row.approval_submitted_at), 'MMM d, HH:mm')}
                                </TableCell>
                                <TableCell>
                                    {row.approved_at ? format(new Date(row.approved_at), 'MMM d, HH:mm') : '-'}
                                </TableCell>
                                <TableCell>
                                    {calculateDuration(row.approval_submitted_at, row.approved_at)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No approval records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
