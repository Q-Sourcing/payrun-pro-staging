import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Plus, Search } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { getHazards } from '@/lib/services/ehs.service';
import { HazardFormDialog } from './HazardFormDialog';
import { format } from 'date-fns';
import type { EhsHazard, EhsHazardRiskLevel, EhsHazardStatus } from '@/lib/types/ehs';
import { RISK_LEVEL_COLORS } from '@/lib/types/ehs';

const STATUS_LABELS: Record<EhsHazardStatus, string> = {
  reported: 'Reported', assigned: 'Assigned',
  mitigation_in_progress: 'Mitigating', resolved: 'Resolved',
};
const STATUS_COLORS: Record<EhsHazardStatus, string> = {
  reported: 'bg-blue-100 text-blue-800', assigned: 'bg-yellow-100 text-yellow-800',
  mitigation_in_progress: 'bg-orange-100 text-orange-800', resolved: 'bg-green-100 text-green-800',
};

export function HazardList() {
  const { userContext } = useSupabaseAuth();
  const orgId = userContext?.organizationId;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editHazard, setEditHazard] = useState<EhsHazard | null>(null);

  const { data: hazards = [], isLoading } = useQuery({
    queryKey: ['ehs-hazards', orgId],
    queryFn: () => getHazards(orgId!),
    enabled: !!orgId,
  });

  const filtered = hazards.filter((h) => {
    if (search && !h.description.toLowerCase().includes(search.toLowerCase()) && !h.hazard_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (riskFilter !== 'all' && h.risk_level !== riskFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Hazard Reporting</h1>
            <p className="text-sm text-muted-foreground">{hazards.length} total hazards & observations</p>
          </div>
        </div>
        <Button onClick={() => { setEditHazard(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Report Hazard
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search hazards..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hazard #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hazards found</TableCell></TableRow>
              ) : filtered.map((hazard) => (
                <TableRow key={hazard.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditHazard(hazard); setShowForm(true); }}>
                  <TableCell className="font-mono text-xs">{hazard.hazard_number}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{hazard.description}</TableCell>
                  <TableCell className="capitalize">{hazard.observation_type?.replace('_', ' ') ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={RISK_LEVEL_COLORS[hazard.risk_level]}>
                      {hazard.risk_level ? hazard.risk_level.charAt(0).toUpperCase() + hazard.risk_level.slice(1) : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[hazard.status]}>
                      {STATUS_LABELS[hazard.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(hazard.created_at), 'dd MMM yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <HazardFormDialog open={showForm} onOpenChange={setShowForm} hazard={editHazard} orgId={orgId} />
    </div>
  );
}
