// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, ClipboardCheck, Shield } from 'lucide-react';
import { getIncidents, getHazards, getInspections, getCorrectiveActions } from '@/lib/services/ehs.service';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { SEVERITY_COLORS, SEVERITY_LABELS, RISK_LEVEL_COLORS } from '@/lib/types/ehs';
import { format } from 'date-fns';

interface Props {
  projectId: string;
}

export function ProjectEhsTab({ projectId }: Props) {
  const { userContext } = useSupabaseAuth();
  const orgId = userContext?.organizationId;

  const { data: incidents = [] } = useQuery({
    queryKey: ['ehs-incidents', orgId, projectId],
    queryFn: () => getIncidents(orgId!, projectId),
    enabled: !!orgId,
  });

  const { data: hazards = [] } = useQuery({
    queryKey: ['ehs-hazards', orgId, projectId],
    queryFn: () => getHazards(orgId!, projectId),
    enabled: !!orgId,
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['ehs-inspections', orgId, projectId],
    queryFn: () => getInspections(orgId!, projectId),
    enabled: !!orgId,
  });

  const { data: cas = [] } = useQuery({
    queryKey: ['ehs-corrective-actions', orgId, projectId],
    queryFn: () => getCorrectiveActions(orgId!, projectId),
    enabled: !!orgId,
  });

  const openHazards = hazards.filter((h) => h.status !== 'resolved');
  const openCas = cas.filter((c) => c.status !== 'closed');
  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-red-50"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Incidents</p>
              <p className="text-xl font-bold">{incidents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-orange-50"><ShieldAlert className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Open Hazards</p>
              <p className="text-xl font-bold">{openHazards.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-blue-50"><ClipboardCheck className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Inspections</p>
              <p className="text-xl font-bold">{inspections.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-green-50"><Shield className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Open CAs</p>
              <p className="text-xl font-bold">{openCas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Incidents</CardTitle></CardHeader>
        <CardContent>
          {recentIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents recorded for this project</p>
          ) : (
            <div className="space-y-2">
              {recentIncidents.map((i) => (
                <div key={i.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{i.incident_number} — {i.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(i.incident_date), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge className={SEVERITY_COLORS[i.severity]}>{SEVERITY_LABELS[i.severity]}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Hazards */}
      <Card>
        <CardHeader><CardTitle className="text-base">Open Hazards ({openHazards.length})</CardTitle></CardHeader>
        <CardContent>
          {openHazards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open hazards</p>
          ) : (
            <div className="space-y-2">
              {openHazards.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{h.hazard_number} — {h.description?.substring(0, 60)}...</p>
                    <p className="text-xs text-muted-foreground">{h.site_location || 'No location'}</p>
                  </div>
                  <Badge className={RISK_LEVEL_COLORS[h.risk_level]}>{h.risk_level}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
