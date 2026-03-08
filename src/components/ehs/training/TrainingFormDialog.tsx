import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createTrainingRecord, updateTrainingRecord } from '@/lib/services/ehs.service';
import type { EhsTrainingRecord, EhsTrainingType, EhsTrainingStatus } from '@/lib/types/ehs';
import { TRAINING_TYPE_LABELS } from '@/lib/types/ehs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: EhsTrainingRecord | null;
  orgId?: string;
}

export function TrainingFormDialog({ open, onOpenChange, record, orgId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!record;

  const [courseName, setCourseName] = useState(record?.course_name || '');
  const [trainingType, setTrainingType] = useState<EhsTrainingType>(record?.training_type || 'other');
  const [trainer, setTrainer] = useState(record?.trainer || '');
  const [provider, setProvider] = useState(record?.provider || '');
  const [completedDate, setCompletedDate] = useState(record?.completed_date || '');
  const [expiryDate, setExpiryDate] = useState(record?.expiry_date || '');
  const [certNumber, setCertNumber] = useState(record?.certificate_number || '');
  const [status, setStatus] = useState<EhsTrainingStatus>(record?.status || 'valid');
  const [employeeId, setEmployeeId] = useState(record?.employee_id || '');

  const resetForm = () => {
    setCourseName(record?.course_name || '');
    setTrainingType(record?.training_type || 'other');
    setTrainer(record?.trainer || '');
    setProvider(record?.provider || '');
    setCompletedDate(record?.completed_date || '');
    setExpiryDate(record?.expiry_date || '');
    setCertNumber(record?.certificate_number || '');
    setStatus(record?.status || 'valid');
    setEmployeeId(record?.employee_id || '');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        course_name: courseName,
        training_type: trainingType,
        trainer: trainer || null,
        provider: provider || null,
        completed_date: completedDate || null,
        expiry_date: expiryDate || null,
        certificate_number: certNumber || null,
        status,
        organization_id: orgId!,
      };
      if (!isEdit) payload.employee_id = employeeId;
      if (isEdit) return updateTrainingRecord(record.id, payload);
      return createTrainingRecord(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-training'] });
      toast({ title: isEdit ? 'Record updated' : 'Record created' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Training Record' : 'Add Training Record'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {!isEdit && (
            <div className="grid gap-2">
              <Label>Employee ID *</Label>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Employee UUID" />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Course Name *</Label>
            <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. First Aid Level 2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Training Type *</Label>
              <Select value={trainingType} onValueChange={(v) => setTrainingType(v as EhsTrainingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRAINING_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EhsTrainingStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Trainer</Label>
              <Input value={trainer} onChange={(e) => setTrainer(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Input value={provider} onChange={(e) => setProvider(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Completed Date</Label>
              <Input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Certificate Number</Label>
            <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!courseName || mutation.isPending || (!isEdit && !employeeId)}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
