import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Search, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getIncidents } from '@/lib/services/ehs.service';
import { IncidentFormDialog } from './IncidentFormDialog';
import { IncidentDetailDialog } from './IncidentDetailDialog';
import { format } from 'date-fns';
import type { EhsIncident, EhsIncidentStatus, EhsIncidentSeverity } from '@/lib/types/ehs';
import { SEVERITY_LABELS, SEVERITY_COLORS, INCIDENT_TYPE_LABELS } from '@/lib/types/ehs';

const STATUS_LABELS: Record<EhsIncidentStatus, string> = {
  reported: 'Reported',
  under_investigation: 'Under Investigation',
  root_cause_identified: 'Root Cause Identified',
  corrective_action: 'Corrective Action',
  closed: 'Closed',
};

const STATUS_COLORS: Record<EhsIncidentStatus, string> = {
  reported: 'bg-blue-100 text-blue-800',
  under_investigation: 'bg-yellow-100 text-yellow-800',
  root_cause_identified: 'bg-orange-100 text-orange-800',
  corrective_action: 'bg-purple-100 text-purple-800',
  closed: 'bg-green-100 text-green-800',
};

export function IncidentList() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editIncident, setEditIncident] = useState<EhsIncident | null>(null);
  const [viewIncident, setViewIncident] = useState<EhsIncident | null>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['ehs-incidents', orgId],
    queryFn: () => getIncidents(orgId!),
    enabled: !!orgId,
  });

  const filtered = incidents.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.incident_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">Incident Management</h1>
            <p className="text-sm text-muted-foreground">{incidents.length} total incidents</p>
          </div>
        </div>
        <Button onClick={() => { setEditIncident(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Report Incident
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search incidents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lost Days</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No incidents found</TableCell></TableRow>
              ) : filtered.map((incident) => (
                <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewIncident(incident)}>
                  <TableCell className="font-mono text-xs">{incident.incident_number}</TableCell>
                  <TableCell className="font-medium">{incident.title}</TableCell>
                  <TableCell>{format(new Date(incident.incident_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{INCIDENT_TYPE_LABELS[incident.incident_type]}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={SEVERITY_COLORS[incident.severity]}>
                      {SEVERITY_LABELS[incident.severity]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[incident.status]}>
                      {STATUS_LABELS[incident.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{incident.lost_days || 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewIncident(incident); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IncidentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        incident={editIncident}
        orgId={orgId}
      />

      <IncidentDetailDialog
        open={!!viewIncident}
        onOpenChange={(open) => { if (!open) setViewIncident(null); }}
        incident={viewIncident}
        onEdit={(i) => { setViewIncident(null); setEditIncident(i); setShowForm(true); }}
      />
    </div>
  );
}
