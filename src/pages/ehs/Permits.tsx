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
import { Plus, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getPermits, createPermit, updatePermit } from '@/lib/services/ehs-phase2.service';
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_COLORS } from '@/lib/types/ehs-phase2';
import { format } from 'date-fns';

export default function EhsPermits() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', permit_type: 'other', description: '', location: '', precautions: '', valid_from: '', valid_until: '' });

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['ehs-permits', orgId],
    queryFn: () => getPermits(orgId!),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () => createPermit({
      organization_id: orgId,
      title: form.title,
      permit_type: form.permit_type,
      description: form.description || null,
      location: form.location || null,
      precautions: form.precautions || null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-permits'] }); setShowForm(false); setForm({ title: '', permit_type: 'other', description: '', location: '', precautions: '', valid_from: '', valid_until: '' }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePermit(id, { status } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ehs-permits'] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Permits to Work</h1>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />New Permit</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid From</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : permits.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No permits found</TableCell></TableRow>
              ) : permits.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.permit_number}</TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{PERMIT_TYPE_LABELS[p.permit_type]}</TableCell>
                  <TableCell><Badge className={PERMIT_STATUS_COLORS[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell>{p.valid_from ? format(new Date(p.valid_from), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>{p.valid_until ? format(new Date(p.valid_until), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    {p.status === 'requested' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: p.id, status: 'approved' })}>Approve</Button>
                    )}
                    {p.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: p.id, status: 'active' })}>Activate</Button>
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
          <DialogHeader><DialogTitle>New Permit to Work</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Permit Type</Label>
              <Select value={form.permit_type} onValueChange={(v) => setForm({ ...form, permit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERMIT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valid From</Label><Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
              <div><Label>Valid Until</Label><Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
            </div>
            <div><Label>Precautions</Label><Textarea value={form.precautions} onChange={(e) => setForm({ ...form, precautions: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Permit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
