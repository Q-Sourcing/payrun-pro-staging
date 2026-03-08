import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createIncident, updateIncident } from '@/lib/services/ehs.service';
import type { EhsIncident, EhsIncidentType, EhsIncidentSeverity } from '@/lib/types/ehs';
import { INCIDENT_TYPE_LABELS, SEVERITY_LABELS } from '@/lib/types/ehs';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: EhsIncident | null;
  orgId?: string;
}

export function IncidentFormDialog({ open, onOpenChange, incident, orgId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!incident;

  const [title, setTitle] = useState(incident?.title || '');
  const [description, setDescription] = useState(incident?.description || '');
  const [incidentDate, setIncidentDate] = useState(incident?.incident_date || new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState(incident?.incident_time || '');
  const [siteLocation, setSiteLocation] = useState(incident?.site_location || '');
  const [incidentType, setIncidentType] = useState<EhsIncidentType>(incident?.incident_type || 'near_miss');
  const [severity, setSeverity] = useState<EhsIncidentSeverity>(incident?.severity || 'near_miss');
  const [immediateAction, setImmediateAction] = useState(incident?.immediate_action_taken || '');
  const [injuryType, setInjuryType] = useState(incident?.injury_type || '');
  const [bodyPart, setBodyPart] = useState(incident?.body_part_affected || '');

  // Reset form when dialog opens with different incident
  const resetForm = () => {
    setTitle(incident?.title || '');
    setDescription(incident?.description || '');
    setIncidentDate(incident?.incident_date || new Date().toISOString().split('T')[0]);
    setIncidentTime(incident?.incident_time || '');
    setSiteLocation(incident?.site_location || '');
    setIncidentType(incident?.incident_type || 'near_miss');
    setSeverity(incident?.severity || 'near_miss');
    setImmediateAction(incident?.immediate_action_taken || '');
    setInjuryType(incident?.injury_type || '');
    setBodyPart(incident?.body_part_affected || '');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        incident_date: incidentDate,
        incident_time: incidentTime || null,
        site_location: siteLocation || null,
        incident_type: incidentType,
        severity,
        immediate_action_taken: immediateAction || null,
        injury_type: injuryType || null,
        body_part_affected: bodyPart || null,
        organization_id: orgId!,
      };
      if (isEdit) {
        return updateIncident(incident.id, payload);
      }
      return createIncident(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-incidents'] });
      toast({ title: isEdit ? 'Incident updated' : 'Incident reported' });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Incident' : 'Report New Incident'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief incident description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Time</Label>
              <Input type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Location on Site</Label>
            <Input value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} placeholder="e.g. Block A, Level 3" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Incident Type *</Label>
              <Select value={incidentType} onValueChange={(v) => setIncidentType(v as EhsIncidentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INCIDENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as EhsIncidentSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of what happened..." rows={3} />
          </div>

          <div className="grid gap-2">
            <Label>Immediate Action Taken</Label>
            <Textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} placeholder="What was done immediately after the incident?" rows={2} />
          </div>

          {(incidentType === 'injury' || incidentType === 'fatality') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Injury Type</Label>
                <Input value={injuryType} onChange={(e) => setInjuryType(e.target.value)} placeholder="e.g. Laceration, Fracture" />
              </div>
              <div className="grid gap-2">
                <Label>Body Part Affected</Label>
                <Input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="e.g. Left hand, Back" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!title || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Report Incident'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
