import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pencil, ArrowRight } from 'lucide-react';
import { updateIncident } from '@/lib/services/ehs.service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { EhsIncident, EhsIncidentStatus } from '@/lib/types/ehs';
import { SEVERITY_LABELS, SEVERITY_COLORS, INCIDENT_TYPE_LABELS } from '@/lib/types/ehs';

const STATUS_FLOW: EhsIncidentStatus[] = ['reported', 'under_investigation', 'root_cause_identified', 'corrective_action', 'closed'];

const STATUS_LABELS: Record<EhsIncidentStatus, string> = {
  reported: 'Reported',
  under_investigation: 'Under Investigation',
  root_cause_identified: 'Root Cause Identified',
  corrective_action: 'Corrective Action',
  closed: 'Closed',
};

const STATUS_COLORS: Record<EhsIncidentStatus, string> = {
  reported: 'bg-blue-100 text-blue-800',
  under_investigation: 'bg-yellow-100 text-yellow-800',
  root_cause_identified: 'bg-orange-100 text-orange-800',
  corrective_action: 'bg-purple-100 text-purple-800',
  closed: 'bg-green-100 text-green-800',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: EhsIncident | null;
  onEdit: (incident: EhsIncident) => void;
}

export function IncidentDetailDialog({ open, onOpenChange, incident, onEdit }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const advanceMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      const currentIdx = STATUS_FLOW.indexOf(incident.status);
      if (currentIdx >= STATUS_FLOW.length - 1) return;
      const nextStatus = STATUS_FLOW[currentIdx + 1];
      const updates: Partial<EhsIncident> = { status: nextStatus };
      if (nextStatus === 'closed') updates.closed_at = new Date().toISOString();
      return updateIncident(incident.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-incidents'] });
      toast({ title: 'Status updated' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (!incident) return null;

  const currentIdx = STATUS_FLOW.indexOf(incident.status);
  const canAdvance = currentIdx < STATUS_FLOW.length - 1;
  const nextStatus = canAdvance ? STATUS_LABELS[STATUS_FLOW[currentIdx + 1]] : null;

  const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    value ? (
      <div className="grid grid-cols-3 gap-2 py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm col-span-2">{value}</span>
      </div>
    ) : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{incident.incident_number}</span>
              {incident.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Status Workflow Bar */}
        <div className="flex items-center gap-1 py-3 overflow-x-auto">
          {STATUS_FLOW.map((s, idx) => (
            <div key={s} className="flex items-center gap-1">
              <Badge
                variant="secondary"
                className={`text-xs whitespace-nowrap ${idx <= currentIdx ? STATUS_COLORS[s] : 'bg-muted text-muted-foreground'}`}
              >
                {STATUS_LABELS[s]}
              </Badge>
              {idx < STATUS_FLOW.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1">
          <DetailRow label="Date" value={format(new Date(incident.incident_date), 'dd MMM yyyy')} />
          <DetailRow label="Time" value={incident.incident_time} />
          <DetailRow label="Location" value={incident.site_location} />
          <DetailRow label="Type" value={INCIDENT_TYPE_LABELS[incident.incident_type]} />
          <DetailRow label="Severity" value={SEVERITY_LABELS[incident.severity]} />
          <DetailRow label="Lost Days" value={incident.lost_days} />
          <DetailRow label="Injury Type" value={incident.injury_type} />
          <DetailRow label="Body Part" value={incident.body_part_affected} />
          <DetailRow label="Classification" value={incident.classification} />
        </div>

        {incident.description && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-1">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident.description}</p>
            </div>
          </>
        )}

        {incident.immediate_action_taken && (
          <div>
            <p className="text-sm font-medium mb-1">Immediate Action Taken</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident.immediate_action_taken}</p>
          </div>
        )}

        {incident.root_cause && (
          <div>
            <p className="text-sm font-medium mb-1">Root Cause</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident.root_cause}</p>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(incident)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
          {canAdvance && (
            <Button size="sm" onClick={() => advanceMutation.mutate()} disabled={advanceMutation.isPending}>
              <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
              Advance to {nextStatus}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
