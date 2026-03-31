// @ts-nocheck
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ListChecks } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getCorrectiveActions, updateCorrectiveAction } from '@/lib/services/ehs.service';
import { CorrectiveActionFormDialog } from './CorrectiveActionFormDialog';
import { PRIORITY_COLORS } from '@/lib/types/ehs';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed: 'bg-green-100 text-green-800',
  overdue: 'bg-orange-100 text-orange-800',
};

export function CorrectiveActionList() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['ehs-corrective-actions', orgId],
    queryFn: () => getCorrectiveActions(orgId!),
    enabled: !!orgId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateCorrectiveAction(id, { status: status as any, ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ehs-corrective-actions'] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Corrective Actions</h1>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />New Action</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : actions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No corrective actions found</TableCell></TableRow>
              ) : actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-xs truncate">{a.description}</TableCell>
                  <TableCell><Badge variant="outline">{a.source_type}</Badge></TableCell>
                  <TableCell><Badge className={PRIORITY_COLORS[a.priority]}>{a.priority}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_COLORS[a.status] || ''}>{a.status?.replace('_', ' ') ?? '—'}</Badge></TableCell>
                  <TableCell>{a.due_date ? format(new Date(a.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    {a.status !== 'closed' && (
                      <Button size="sm" variant="outline"
                        onClick={() => statusMutation.mutate({ id: a.id, status: a.status === 'open' ? 'in_progress' : 'closed' })}>
                        {a.status === 'open' ? 'Start' : 'Close'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CorrectiveActionFormDialog open={showForm} onOpenChange={setShowForm} orgId={orgId || ''} />
    </div>
  );
}
