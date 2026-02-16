import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EmailLog {
    id: string;
    created_at: string;
    event_key: string;
    recipient_email: string;
    subject: string;
    status: 'pending' | 'processing' | 'sent' | 'failed';
    error_message?: string;
    retry_count: number;
    org_id?: string;
}

export function PlatformEmailLogs() {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('email_outbox')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs((data || []) as EmailLog[]);
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'default';
            case 'failed': return 'destructive';
            case 'processing': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Email Logs</CardTitle>
                    <CardDescription>Recent 50 email dispatch events</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Retries</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs whitespace-nowrap">
                                    {format(new Date(log.created_at), 'MMM dd HH:mm')}
                                </TableCell>
                                <TableCell className="text-xs font-mono">{log.event_key}</TableCell>
                                <TableCell>{log.recipient_email}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={log.subject}>{log.subject}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(log.status) as any}>
                                        {log.status}
                                    </Badge>
                                    {log.error_message && (
                                        <div className="text-[10px] text-red-500 max-w-[150px] truncate" title={log.error_message}>
                                            {log.error_message}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>{log.retry_count}</TableCell>
                            </TableRow>
                        ))}
                        {logs.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">No logs found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
