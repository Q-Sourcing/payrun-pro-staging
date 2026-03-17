import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnomalyService, type AnomalyLog } from '@/lib/services/anomaly.service';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useAnomalyCounts } from '@/hooks/use-anomaly-counts';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, AlertOctagon, Info, Shield, Filter,
  CheckCircle, XCircle, Clock, RefreshCw, Loader2,
  ClipboardList, Users, DollarSign, FileCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_CONFIG = {
  critical: { icon: AlertOctagon, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

const SECTION_CONFIG = {
  timesheet: { icon: ClipboardList, label: 'Timesheet' },
  employee: { icon: Users, label: 'Employee' },
  payrun: { icon: DollarSign, label: 'Pay Run' },
  approval: { icon: FileCheck, label: 'Approval' },
};

export default function Anomalies() {
  const { organizationId } = useOrg();
  const { counts } = useAnomalyCounts();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [dismissDialog, setDismissDialog] = useState<AnomalyLog | null>(null);
  const [dismissNote, setDismissNote] = useState('');
  const [dismissing, setDismissing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['anomalies', organizationId, severityFilter, sectionFilter, statusFilter],
    queryFn: () =>
      AnomalyService.getAnomalies({
        organizationId: organizationId!,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        section: sectionFilter !== 'all' ? sectionFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      }),
    enabled: !!organizationId,
  });

  const anomalies = data?.data || [];

  const handleDismiss = async () => {
    if (!dismissDialog) return;
    setDismissing(true);
    try {
      await AnomalyService.dismissAnomaly(dismissDialog.id, dismissNote);
      toast({ title: 'Anomaly dismissed' });
      setDismissDialog(null);
      setDismissNote('');
      qc.invalidateQueries({ queryKey: ['anomalies'] });
      qc.invalidateQueries({ queryKey: ['anomaly-counts'] });
    } catch {
      toast({ title: 'Error dismissing anomaly', variant: 'destructive' });
    } finally {
      setDismissing(false);
    }
  };

  const handleResolve = async (anomaly: AnomalyLog) => {
    try {
      await AnomalyService.resolveAnomaly(anomaly.id, 'fixed', 'Resolved manually');
      toast({ title: 'Anomaly resolved' });
      qc.invalidateQueries({ queryKey: ['anomalies'] });
      qc.invalidateQueries({ queryKey: ['anomaly-counts'] });
    } catch {
      toast({ title: 'Error resolving', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <AlertOctagon className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{counts.critical}</p>
            <p className="text-[11px] text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.warning}</p>
            <p className="text-[11px] text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Info className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{counts.info}</p>
            <p className="text-[11px] text-muted-foreground">Info</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{counts.total}</p>
            <p className="text-[11px] text-muted-foreground">Total Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="timesheet">Timesheet</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="payrun">Pay Run</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Anomaly Feed
            <Badge variant="outline" className="ml-auto text-[10px]">{anomalies.length} results</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {!isLoading && anomalies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium">All clear!</p>
              <p className="text-xs text-muted-foreground mt-1">No anomalies matching your filters</p>
            </div>
          )}

          {!isLoading && anomalies.length > 0 && (
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y">
                {anomalies.map((anomaly) => {
                  const sev = SEVERITY_CONFIG[anomaly.severity];
                  const sec = SECTION_CONFIG[anomaly.section as keyof typeof SECTION_CONFIG];
                  const SevIcon = sev.icon;
                  const SecIcon = sec?.icon || Info;
                  return (
                    <div key={anomaly.id} className={`px-4 py-3.5 hover:bg-muted/30 transition-colors ${anomaly.status !== 'active' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sev.bg} ${sev.border} border`}>
                          <SevIcon className={`h-4 w-4 ${sev.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.badge}`}>
                              {anomaly.severity}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <SecIcon className="h-3 w-3" /> {sec?.label || anomaly.section}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{anomaly.anomaly_type}</span>
                            {anomaly.status !== 'active' && (
                              <Badge variant="outline" className="text-[10px]">{anomaly.status}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-snug">{anomaly.description}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(anomaly.detected_at), { addSuffix: true })}
                            </span>
                            {anomaly.affected_record_type && (
                              <span className="text-[10px] text-muted-foreground">{anomaly.affected_record_type}</span>
                            )}
                          </div>
                        </div>
                        {anomaly.status === 'active' && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleResolve(anomaly)}>
                              <CheckCircle className="h-3 w-3" /> Fix
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={() => setDismissDialog(anomaly)}>
                              <XCircle className="h-3 w-3" /> Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dismiss Dialog */}
      <Dialog open={!!dismissDialog} onOpenChange={(open) => !open && setDismissDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Dismiss Anomaly</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{dismissDialog?.description}</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reason for dismissal {dismissDialog?.severity === 'critical' && '(required)'}</label>
              <Textarea
                value={dismissNote}
                onChange={(e) => setDismissNote(e.target.value)}
                placeholder="Why are you dismissing this anomaly?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialog(null)}>Cancel</Button>
            <Button
              onClick={handleDismiss}
              disabled={dismissing || (dismissDialog?.severity === 'critical' && !dismissNote.trim())}
            >
              {dismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
