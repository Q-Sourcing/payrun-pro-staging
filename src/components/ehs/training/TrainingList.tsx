import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getTrainingRecords } from '@/lib/services/ehs.service';
import { TrainingFormDialog } from './TrainingFormDialog';
import { format } from 'date-fns';
import type { EhsTrainingRecord, EhsTrainingStatus } from '@/lib/types/ehs';
import { TRAINING_TYPE_LABELS } from '@/lib/types/ehs';

const STATUS_COLORS: Record<EhsTrainingStatus, string> = {
  valid: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
};

export function TrainingList() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<EhsTrainingRecord | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['ehs-training', orgId],
    queryFn: () => getTrainingRecords(orgId!),
    enabled: !!orgId,
  });

  const filtered = records.filter((r) => {
    if (search && !r.course_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Training & Certifications</h1>
            <p className="text-sm text-muted-foreground">{records.length} total records</p>
          </div>
        </div>
        <Button onClick={() => { setEditRecord(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Record
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search training records..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No training records found</TableCell></TableRow>
              ) : filtered.map((rec) => (
                <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditRecord(rec); setShowForm(true); }}>
                  <TableCell className="font-medium">{rec.course_name}</TableCell>
                  <TableCell>{TRAINING_TYPE_LABELS[rec.training_type]}</TableCell>
                  <TableCell>{rec.provider || '-'}</TableCell>
                  <TableCell>{rec.completed_date ? format(new Date(rec.completed_date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>{rec.expiry_date ? format(new Date(rec.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[rec.status]}>
                      {(rec.status ?? '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TrainingFormDialog open={showForm} onOpenChange={setShowForm} record={editRecord} orgId={orgId} />
    </div>
  );
}
