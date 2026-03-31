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
import { Plus, Leaf } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getEnvironmentalIncidents, createEnvironmentalIncident } from '@/lib/services/ehs-phase2.service';
import { ENV_SEVERITY_COLORS } from '@/lib/types/ehs-phase2';
import { format } from 'date-fns';

const ENV_TYPE_LABELS: Record<string, string> = {
  spill: 'Spill', emission: 'Emission', waste_violation: 'Waste Violation',
  noise: 'Noise', water_contamination: 'Water Contamination', other: 'Other',
};

export default function EhsEnvironmental() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'other', severity: 'minor', description: '', location: '', incident_date: new Date().toISOString().split('T')[0] });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['ehs-env-incidents', orgId],
    queryFn: () => getEnvironmentalIncidents(orgId!),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () => createEnvironmentalIncident({ organization_id: orgId, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ehs-env-incidents'] }); setShowForm(false); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Leaf className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Environmental Incidents</h1>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Report Incident</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : incidents.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No environmental incidents</TableCell></TableRow>
              ) : incidents.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.incident_number}</TableCell>
                  <TableCell className="font-medium">{i.title}</TableCell>
                  <TableCell>{ENV_TYPE_LABELS[i.type] || i.type}</TableCell>
                  <TableCell><Badge className={ENV_SEVERITY_COLORS[i.severity]}>{i.severity}</Badge></TableCell>
                  <TableCell>{format(new Date(i.incident_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Report Environmental Incident</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENV_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['minor', 'moderate', 'major', 'critical'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
              {mutation.isPending ? 'Reporting...' : 'Report Incident'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
