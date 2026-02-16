import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SecurityService } from '@/lib/services/security/security-service';
import type { AuthEvent } from '@/lib/services/auth/auth-logger';
import { formatDistanceToNow, format } from 'date-fns';
import { Loader2, Search, Filter, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AuthEventsTableProps {
  orgId?: string;
  showFilters?: boolean;
}

export function AuthEventsTable({ orgId, showFilters = true }: AuthEventsTableProps) {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [ipFilter, setIpFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const result = await SecurityService.getAuthEvents({
        org_id: orgId,
        event_type: eventTypeFilter && eventTypeFilter !== 'all' ? eventTypeFilter as any : undefined,
        success: successFilter === 'all' ? undefined : successFilter === 'true' ? true : successFilter === 'false' ? false : undefined,
        ip_address: ipFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        limit,
      });
      setEvents(result.data);
      setTotal(result.total);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load auth events',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, eventTypeFilter, successFilter, ipFilter, startDate, endDate, orgId]);

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      login_success: 'Login Success',
      login_failed: 'Login Failed',
      logout: 'Logout',
      password_reset_request: 'Password Reset Request',
      password_reset_success: 'Password Reset Success',
      password_change: 'Password Change',
      account_locked: 'Account Locked',
      account_unlocked: 'Account Unlocked',
      account_created: 'Account Created',
      account_deleted: 'Account Deleted',
      session_expired: 'Session Expired',
      session_refreshed: 'Session Refreshed',
    };
    return labels[type] || type;
  };

  const getEventIcon = (type: string, success: boolean) => {
    if (type.includes('login') && success) return '✅';
    if (type.includes('login') && !success) return '❌';
    if (type.includes('lock')) return '🔒';
    if (type.includes('unlock')) return '🔓';
    if (type.includes('logout')) return '🚪';
    if (type.includes('password')) return '🔑';
    return '📋';
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ['Timestamp', 'Event Type', 'User ID', 'IP Address', 'Location', 'Success', 'Reason'];
    const rows = events.map((e) => [
      e.timestamp_utc || '',
      e.event_type,
      e.user_id || '',
      e.ip_address || '',
      e.geo_location ? `${e.geo_location.city || ''}, ${e.geo_location.country || ''}` : '',
      e.success ? 'Yes' : 'No',
      e.reason || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Authentication Events</CardTitle>
            <CardDescription>
              Audit log of all authentication activities
              {total > 0 && ` (${total} total)`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="login_success">Login Success</SelectItem>
                <SelectItem value="login_failed">Login Failed</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="account_locked">Account Locked</SelectItem>
                <SelectItem value="account_unlocked">Account Unlocked</SelectItem>
                <SelectItem value="password_reset_request">Password Reset Request</SelectItem>
                <SelectItem value="password_change">Password Change</SelectItem>
              </SelectContent>
            </Select>

            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="IP Address"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
            />

            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No authentication events found
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">
                        {event.timestamp_utc
                          ? format(new Date(event.timestamp_utc), 'MMM dd, yyyy HH:mm:ss')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getEventIcon(event.event_type, event.success)}</span>
                          <span>{getEventTypeLabel(event.event_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {event.geo_location
                          ? `${event.geo_location.city || ''}, ${event.geo_location.country || ''}`.trim() || 'N/A'
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            event.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {event.success ? 'Success' : 'Failed'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {event.reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {total > limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

