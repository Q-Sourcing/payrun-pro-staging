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
import { Plus, FileSearch } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { getRiskAssessments, createRiskAssessment } from '@/lib/services/ehs-phase2.service';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', archived: 'bg-muted text-muted-foreground',
};

export default function EhsRiskAssessments() {
  const { userContext } = useSupabaseAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', job_activity: '', location: '', status: 'draft' });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['ehs-risk-assessments', orgId],
    queryFn: () => getRiskAssessments(orgId!),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () => createRiskAssessment({ organization_id: orgId, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-risk-assessments'] }); setShowForm(false); setForm({ title: '', description: '', job_activity: '', location: '', status: 'draft' }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSearch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Risk Assessments</h1>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />New Assessment</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : assessments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No risk assessments found</TableCell></TableRow>
              ) : assessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.assessment_number}</TableCell>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{a.job_activity || '—'}</TableCell>
                  <TableCell>{a.location || '—'}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></TableCell>
                  <TableCell>{format(new Date(a.assessment_date), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Risk Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Job Activity</Label><Input value={form.job_activity} onChange={(e) => setForm({ ...form, job_activity: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Assessment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
