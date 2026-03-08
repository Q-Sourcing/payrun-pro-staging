import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, Plus, Search } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { getInspections } from '@/lib/services/ehs.service';
import { InspectionFormDialog } from './InspectionFormDialog';
import { format } from 'date-fns';
import type { EhsInspection, EhsInspectionStatus } from '@/lib/types/ehs';
import { INSPECTION_TYPE_LABELS } from '@/lib/types/ehs';

const STATUS_LABELS: Record<EhsInspectionStatus, string> = {
  scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed',
};
const STATUS_COLORS: Record<EhsInspectionStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800', in_progress: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800',
};

export function InspectionList() {
  const { userContext } = useSupabaseAuth();
  const orgId = userContext?.organizationId;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editInspection, setEditInspection] = useState<EhsInspection | null>(null);

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['ehs-inspections', orgId],
    queryFn: () => getInspections(orgId!),
    enabled: !!orgId,
  });

  const filtered = inspections.filter((i) => {
    if (search && !i.inspection_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Safety Inspections</h1>
            <p className="text-sm text-muted-foreground">{inspections.length} total inspections</p>
          </div>
        </div>
        <Button onClick={() => { setEditInspection(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Inspection
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search inspections..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inspection #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No inspections found</TableCell></TableRow>
              ) : filtered.map((insp) => (
                <TableRow key={insp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditInspection(insp); setShowForm(true); }}>
                  <TableCell className="font-mono text-xs">{insp.inspection_number}</TableCell>
                  <TableCell>{INSPECTION_TYPE_LABELS[insp.type]}</TableCell>
                  <TableCell>{insp.scheduled_date ? format(new Date(insp.scheduled_date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>{insp.completed_date ? format(new Date(insp.completed_date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>{insp.overall_score != null ? `${insp.overall_score}%` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[insp.status]}>
                      {STATUS_LABELS[insp.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InspectionFormDialog open={showForm} onOpenChange={setShowForm} inspection={editInspection} orgId={orgId} />
    </div>
  );
}
