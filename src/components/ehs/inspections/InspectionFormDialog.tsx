import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createInspection, updateInspection } from '@/lib/services/ehs.service';
import type { EhsInspection, EhsInspectionType, EhsInspectionStatus } from '@/lib/types/ehs';
import { INSPECTION_TYPE_LABELS } from '@/lib/types/ehs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: EhsInspection | null;
  orgId?: string;
  projectId?: string;
}

export function InspectionFormDialog({ open, onOpenChange, inspection, orgId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!inspection;

  const [type, setType] = useState<EhsInspectionType>(inspection?.type || 'daily');
  const [scheduledDate, setScheduledDate] = useState(inspection?.scheduled_date || new Date().toISOString().split('T')[0]);
  const [completedDate, setCompletedDate] = useState(inspection?.completed_date || '');
  const [status, setStatus] = useState<EhsInspectionStatus>(inspection?.status || 'scheduled');
  const [overallScore, setOverallScore] = useState<string>(inspection?.overall_score?.toString() || '');
  const [notes, setNotes] = useState(inspection?.notes || '');

  const resetForm = () => {
    setType(inspection?.type || 'daily');
    setScheduledDate(inspection?.scheduled_date || new Date().toISOString().split('T')[0]);
    setCompletedDate(inspection?.completed_date || '');
    setStatus(inspection?.status || 'scheduled');
    setOverallScore(inspection?.overall_score?.toString() || '');
    setNotes(inspection?.notes || '');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        type,
        scheduled_date: scheduledDate || null,
        completed_date: completedDate || null,
        status,
        overall_score: overallScore ? parseFloat(overallScore) : null,
        notes: notes || null,
        organization_id: orgId!,
      };
      if (isEdit) return updateInspection(inspection.id, payload);
      return createInspection(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-inspections'] });
      toast({ title: isEdit ? 'Inspection updated' : 'Inspection created' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${inspection.inspection_number}` : 'Schedule Inspection'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as EhsInspectionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INSPECTION_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EhsInspectionStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Scheduled Date</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Completed Date</Label>
              <Input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Overall Score (%)</Label>
            <Input type="number" min="0" max="100" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} placeholder="e.g. 85" />
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Inspection notes..." rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
