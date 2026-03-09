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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, HardHat } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { getPpeRecords, createPpeRecord, getPpeTypes, createPpeType } from '@/lib/services/ehs-phase2.service';
import { PPE_CONDITION_COLORS } from '@/lib/types/ehs-phase2';
import { format } from 'date-fns';

export default function EhsPPE() {
  const { userContext } = useSupabaseAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [form, setForm] = useState({ ppe_type_id: '', employee_id: '', serial_number: '', condition: 'new', notes: '' });
  const [typeForm, setTypeForm] = useState({ name: '', category: '' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['ehs-ppe-records', orgId],
    queryFn: () => getPpeRecords(orgId!),
    enabled: !!orgId,
  });

  const { data: ppeTypes = [] } = useQuery({
    queryKey: ['ehs-ppe-types', orgId],
    queryFn: () => getPpeTypes(orgId!),
    enabled: !!orgId,
  });

  const recordMutation = useMutation({
    mutationFn: () => createPpeRecord({ organization_id: orgId, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-ppe-records'] }); setShowForm(false); },
  });

  const typeMutation = useMutation({
    mutationFn: () => createPpeType({ organization_id: orgId, ...typeForm }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-ppe-types'] }); setShowTypeForm(false); setTypeForm({ name: '', category: '' }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">PPE Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTypeForm(true)}>Add PPE Type</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Issue PPE</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PPE Type</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No PPE records found</TableCell></TableRow>
              ) : records.map((r) => {
                const typeName = ppeTypes.find((t) => t.id === r.ppe_type_id)?.name || r.ppe_type_id;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{typeName}</TableCell>
                    <TableCell className="font-mono text-xs">{r.serial_number || '—'}</TableCell>
                    <TableCell>{format(new Date(r.issued_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge className={PPE_CONDITION_COLORS[r.condition]}>{r.condition}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issue PPE Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Issue PPE</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>PPE Type</Label>
              <Select value={form.ppe_type_id} onValueChange={(v) => setForm({ ...form, ppe_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {ppeTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Employee ID</Label><Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="Employee UUID" /></div>
            <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['new', 'good', 'fair', 'poor'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => recordMutation.mutate()} disabled={!form.ppe_type_id || !form.employee_id || recordMutation.isPending}>
              {recordMutation.isPending ? 'Issuing...' : 'Issue PPE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PPE Type Dialog */}
      <Dialog open={showTypeForm} onOpenChange={setShowTypeForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add PPE Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Hard Hat" /></div>
            <div><Label>Category</Label><Input value={typeForm.category} onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value })} placeholder="e.g. Head Protection" /></div>
            <Button className="w-full" onClick={() => typeMutation.mutate()} disabled={!typeForm.name || typeMutation.isPending}>
              {typeMutation.isPending ? 'Creating...' : 'Add Type'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
