import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createHazard, updateHazard } from '@/lib/services/ehs.service';
import type { EhsHazard, EhsHazardRiskLevel, EhsObservationType, EhsHazardStatus } from '@/lib/types/ehs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hazard: EhsHazard | null;
  orgId?: string;
  projectId?: string;
}

export function HazardFormDialog({ open, onOpenChange, hazard, orgId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!hazard;

  const [description, setDescription] = useState(hazard?.description || '');
  const [siteLocation, setSiteLocation] = useState(hazard?.site_location || '');
  const [riskLevel, setRiskLevel] = useState<EhsHazardRiskLevel>(hazard?.risk_level || 'medium');
  const [observationType, setObservationType] = useState<EhsObservationType>(hazard?.observation_type || 'hazard');
  const [status, setStatus] = useState<EhsHazardStatus>(hazard?.status || 'reported');
  const [resolutionNotes, setResolutionNotes] = useState(hazard?.resolution_notes || '');

  const resetForm = () => {
    setDescription(hazard?.description || '');
    setSiteLocation(hazard?.site_location || '');
    setRiskLevel(hazard?.risk_level || 'medium');
    setObservationType(hazard?.observation_type || 'hazard');
    setStatus(hazard?.status || 'reported');
    setResolutionNotes(hazard?.resolution_notes || '');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        description,
        site_location: siteLocation || null,
        risk_level: riskLevel,
        observation_type: observationType,
        organization_id: orgId!,
      };
      if (isEdit) {
        payload.status = status;
        payload.resolution_notes = resolutionNotes || null;
        if (status === 'resolved') payload.resolved_at = new Date().toISOString();
        return updateHazard(hazard.id, payload);
      }
      return createHazard(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-hazards'] });
      toast({ title: isEdit ? 'Hazard updated' : 'Hazard reported' });
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
          <DialogTitle>{isEdit ? `Edit ${hazard.hazard_number}` : 'Report Hazard / Observation'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type *</Label>
              <Select value={observationType} onValueChange={(v) => setObservationType(v as EhsObservationType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hazard">Hazard</SelectItem>
                  <SelectItem value="safety_observation">Safety Observation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Risk Level *</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as EhsHazardRiskLevel)}>
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

          <div className="grid gap-2">
            <Label>Location on Site</Label>
            <Input value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} placeholder="e.g. Main gate, Scaffold area" />
          </div>

          <div className="grid gap-2">
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the hazard or observation..." rows={3} />
          </div>

          {isEdit && (
            <>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as EhsHazardStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="mitigation_in_progress">Mitigation in Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Resolution Notes</Label>
                <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe mitigation or resolution..." rows={2} />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!description || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
