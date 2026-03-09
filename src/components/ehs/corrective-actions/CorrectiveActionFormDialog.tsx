// @ts-nocheck
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCorrectiveAction } from '@/lib/services/ehs.service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  sourceType?: string;
  sourceId?: string;
}

export function CorrectiveActionFormDialog({ open, onOpenChange, orgId, sourceType, sourceId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: '',
    source_type: sourceType || 'incident',
    source_id: sourceId || '',
    priority: 'medium',
    due_date: '',
  });

  const mutation = useMutation({
    mutationFn: () => createCorrectiveAction({
      organization_id: orgId,
      description: form.description,
      source_type: form.source_type as any,
      source_id: form.source_id || '00000000-0000-0000-0000-000000000000',
      priority: form.priority as any,
      due_date: form.due_date || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ehs-corrective-actions'] });
      onOpenChange(false);
      setForm({ description: '', source_type: 'incident', source_id: '', priority: 'medium', due_date: '' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Corrective Action</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the corrective action..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source Type</Label>
              <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="hazard">Hazard</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.description || mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Corrective Action'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
