// @ts-nocheck
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Siren } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getEmergencyDrills, createEmergencyDrill, updateEmergencyDrill } from '@/lib/services/ehs-phase2.service';
import { DRILL_TYPE_LABELS } from '@/lib/types/ehs-phase2';
import { format } from 'date-fns';

const DRILL_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-muted text-muted-foreground',
};

export default function EhsEmergencyDrills() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', drill_type: 'fire', scheduled_date: '', description: '' });

  const { data: drills = [], isLoading } = useQuery({
    queryKey: ['ehs-drills', orgId],
    queryFn: () => getEmergencyDrills(orgId!),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () => createEmergencyDrill({ organization_id: orgId, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-drills'] }); setShowForm(false); setForm({ title: '', drill_type: 'fire', scheduled_date: '', description: '' }); },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => updateEmergencyDrill(id, { status: 'completed' as any, actual_date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ehs-drills'] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Siren className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Emergency Drills</h1>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Schedule Drill</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : drills.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No drills scheduled</TableCell></TableRow>
              ) : drills.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell>{DRILL_TYPE_LABELS[d.drill_type]}</TableCell>
                  <TableCell>{format(new Date(d.scheduled_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell><Badge className={DRILL_STATUS_COLORS[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell>{d.participants_count || '—'}</TableCell>
                  <TableCell>
                    {d.status === 'planned' && (
                      <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(d.id)}>Complete</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Schedule Emergency Drill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Drill Type</Label>
                <Select value={form.drill_type} onValueChange={(v) => setForm({ ...form, drill_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DRILL_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled Date</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.title || !form.scheduled_date || mutation.isPending}>
              {mutation.isPending ? 'Scheduling...' : 'Schedule Drill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
