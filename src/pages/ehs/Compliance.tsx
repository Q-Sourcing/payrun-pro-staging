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
import { Plus, Scale } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { getComplianceRequirements, createComplianceRequirement, updateComplianceRequirement } from '@/lib/services/ehs-phase2.service';
import { COMPLIANCE_STATUS_COLORS } from '@/lib/types/ehs-phase2';
import { format } from 'date-fns';

export default function EhsCompliance() {
  const { userContext } = useSupabaseAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ regulation_name: '', regulation_body: '', requirement_description: '', category: '', due_date: '' });

  const { data: reqs = [], isLoading } = useQuery({
    queryKey: ['ehs-compliance', orgId],
    queryFn: () => getComplianceRequirements(orgId!),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () => createComplianceRequirement({ organization_id: orgId, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-compliance'] }); setShowForm(false); setForm({ regulation_name: '', regulation_body: '', requirement_description: '', category: '', due_date: '' }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateComplianceRequirement(id, { compliance_status: status } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ehs-compliance'] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Compliance & Regulations</h1>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Requirement</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regulation</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : reqs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No compliance requirements</TableCell></TableRow>
              ) : reqs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.regulation_name}</TableCell>
                  <TableCell>{r.regulation_body || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.requirement_description}</TableCell>
                  <TableCell>{r.category || '—'}</TableCell>
                  <TableCell><Badge className={COMPLIANCE_STATUS_COLORS[r.compliance_status]}>{r.compliance_status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>{r.due_date ? format(new Date(r.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Select value={r.compliance_status} onValueChange={(v) => statusMutation.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['compliant', 'non_compliant', 'partially_compliant', 'under_review'].map((s) => (
                          <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Compliance Requirement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Regulation Name</Label><Input value={form.regulation_name} onChange={(e) => setForm({ ...form, regulation_name: e.target.value })} placeholder="e.g. OSHA 1926.500" /></div>
            <div><Label>Regulatory Body</Label><Input value={form.regulation_body} onChange={(e) => setForm({ ...form, regulation_body: e.target.value })} placeholder="e.g. OSHA" /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Fall Protection" /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><Label>Requirement Description</Label><Textarea value={form.requirement_description} onChange={(e) => setForm({ ...form, requirement_description: e.target.value })} /></div>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.regulation_name || !form.requirement_description || mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Requirement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
