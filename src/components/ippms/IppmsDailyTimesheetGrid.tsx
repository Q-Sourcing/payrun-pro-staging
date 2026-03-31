import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { IppmsTimesheetService, type IppmsDailyTimesheetEntry, type IppmsProjectTask } from '@/lib/services/ippms/ippms.timesheet.service';
import { EmployeesService } from '@/lib/data/employees.service';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/lib/auth/OrgProvider';
import { Plus, RefreshCw, Loader2, Save, Send, Trash2, CheckCircle, XCircle, ClipboardList, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/constants/countries';
import { supabase } from '@/integrations/supabase/client';
import { AnomalyService, type TimesheetAnomalyCheck } from '@/lib/services/anomaly.service';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  projectId: string;
}

const today = new Date();
function toISO(date: Date) { return date.toISOString().slice(0, 10); }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

type ProjectEmployeeLite = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  pay_rate?: number | null;
  currency?: string | null;
  max_units_per_day?: number | null;
  allow_multiple_entries_per_day?: boolean | null;
};

export function IppmsDailyTimesheetGrid({ projectId }: Props) {
  const { organizationId } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rangeStart, setRangeStart] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [rangeEnd, setRangeEnd] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  const [addDialog, setAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [anomalyWarnings, setAnomalyWarnings] = useState<TimesheetAnomalyCheck[]>([]);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    employee_id: '',
    work_date: toISO(today),
    task_description: '',
    units: 1,
    rate_snapshot: 0,
  });

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['ippms-timesheet', projectId, rangeStart, rangeEnd],
    queryFn: () => IppmsTimesheetService.getEntries({ projectId, start: rangeStart, end: rangeEnd }),
  });

  const { data: employees } = useQuery<ProjectEmployeeLite[]>({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
  });

  const { data: projectTasks } = useQuery<IppmsProjectTask[]>({
    queryKey: ['ippms-project-tasks', projectId],
    queryFn: () => IppmsTimesheetService.getProjectTasks(projectId),
  });

  const { data: projectMeta } = useQuery({
    queryKey: ['project-meta-lite', projectId],
    queryFn: async () => {
      const { data: row } = await supabase.from('projects').select('currency, country').eq('id', projectId).single();
      return row || { currency: null, country: null };
    },
    enabled: !!projectId,
  });

  const currencyCode = (projectMeta as any)?.currency || employees?.[0]?.currency || '';
  const money = (amount: number) => currencyCode ? formatCurrency(amount, currencyCode) : amount.toLocaleString();

  const rows = entries || [];
  const tasks = projectTasks || [];

  const employeesById = useMemo(() => {
    const map = new Map<string, ProjectEmployeeLite>();
    (employees || []).forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const getName = (id: string) => {
    const emp = employeesById.get(id);
    if (!emp) return id.slice(0, 8) + '…';
    return [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email || id.slice(0, 8);
  };

  // Group by date for subtotals
  const groupedByDate = useMemo(() => {
    const map: Record<string, IppmsDailyTimesheetEntry[]> = {};
    rows.forEach((r) => {
      map[r.work_date] = map[r.work_date] || [];
      map[r.work_date].push(r);
    });
    return map;
  }, [rows]);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  // Stats
  const totalUnits = rows.reduce((s, r) => s + Number(r.units), 0);
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const approvedAmount = rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount || 0), 0);

  // Auto-set rate when employee changes
  useEffect(() => {
    if (newEntry.employee_id) {
      const emp = employeesById.get(newEntry.employee_id);
      if (emp?.pay_rate) {
        setNewEntry(p => ({ ...p, rate_snapshot: emp.pay_rate! }));
      }
    }
  }, [newEntry.employee_id, employeesById]);

  // Validate units before save
  const validateEntry = (): string | null => {
    if (!newEntry.employee_id) return 'Select an employee';
    if (!newEntry.work_date) return 'Select a date';
    if (newEntry.units <= 0) return 'Units must be greater than 0';

    const emp = employeesById.get(newEntry.employee_id);
    const maxUnits = (emp as any)?.max_units_per_day || 5.0;

    // Check daily total
    const existingForDate = rows.filter(r => r.employee_id === newEntry.employee_id && r.work_date === newEntry.work_date);
    const existingUnits = existingForDate.reduce((s, r) => s + Number(r.units), 0);

    if (existingUnits + newEntry.units > maxUnits) {
      return `Total units on ${newEntry.work_date} would exceed the maximum of ${maxUnits} units per day (current: ${existingUnits})`;
    }
    return null;
  };

  const handleAddEntry = async () => {
    const error = validateEntry();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }

    // Run server-side anomaly checks
    try {
      const anomalies = await AnomalyService.checkTimesheetAnomalies({
        employeeId: newEntry.employee_id,
        projectId,
        workDate: newEntry.work_date,
        taskDescription: newEntry.task_description,
        units: newEntry.units,
        rate: newEntry.rate_snapshot,
      });

      const criticals = anomalies.filter(a => a.severity === 'critical');
      const warnings = anomalies.filter(a => a.severity !== 'critical');

      if (criticals.length > 0) {
        setAnomalyWarnings(anomalies);
        toast({ title: 'Cannot save', description: criticals[0].message, variant: 'destructive' });
        return;
      }

      if (warnings.length > 0) {
        setAnomalyWarnings(anomalies);
        // Warnings are shown but don't block
      }
    } catch {
      // If anomaly check fails, proceed with save
    }

    setSaving(true);
    try {
      await IppmsTimesheetService.upsertEntry({
        employee_id: newEntry.employee_id,
        project_id: projectId,
        organization_id: organizationId || '',
        work_date: newEntry.work_date,
        task_description: newEntry.task_description,
        units: newEntry.units,
        rate_snapshot: newEntry.rate_snapshot,
        status: 'draft',
      });
      toast({ title: 'Entry added' });
      setAddDialog(false);
      setAnomalyWarnings([]);
      setNewEntry({ employee_id: '', work_date: toISO(today), task_description: '', units: 1, rate_snapshot: 0 });
      qc.invalidateQueries({ queryKey: ['ippms-timesheet', projectId] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await IppmsTimesheetService.deleteEntry(id);
      toast({ title: 'Entry deleted' });
      qc.invalidateQueries({ queryKey: ['ippms-timesheet', projectId] });
    } catch {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleSubmitAll = async () => {
    const draftIds = rows.filter(r => r.status === 'draft').map(r => r.id);
    if (draftIds.length === 0) { toast({ title: 'No draft entries to submit' }); return; }
    try {
      await IppmsTimesheetService.submitEntries(draftIds);
      toast({ title: `${draftIds.length} entries submitted for approval` });
      qc.invalidateQueries({ queryKey: ['ippms-timesheet', projectId] });
    } catch {
      toast({ title: 'Error submitting', variant: 'destructive' });
    }
  };

  const handleApproveAll = async () => {
    const submittedIds = rows.filter(r => r.status === 'submitted').map(r => r.id);
    if (submittedIds.length === 0) { toast({ title: 'No submitted entries to approve' }); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await IppmsTimesheetService.approveEntries(submittedIds, user?.id || '');
      toast({ title: `${submittedIds.length} entries approved` });
      qc.invalidateQueries({ queryKey: ['ippms-timesheet', projectId] });
    } catch {
      toast({ title: 'Error approving', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold text-primary">{rows.length}</p>
          <p className="text-[11px] text-muted-foreground">Total Entries</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold">{totalUnits.toFixed(1)}</p>
          <p className="text-[11px] text-muted-foreground">Total Units</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold">{money(totalAmount)}</p>
          <p className="text-[11px] text-muted-foreground">Total Amount</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{money(approvedAmount)}</p>
          <p className="text-[11px] text-muted-foreground">Approved</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3.5">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From</Label>
          <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="h-9 w-[150px] text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To</Label>
          <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="h-9 w-[150px] text-sm" />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleSubmitAll}>
          <Send className="h-3.5 w-3.5" /> Submit All Drafts
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleApproveAll}>
          <CheckCircle className="h-3.5 w-3.5" /> Approve All
        </Button>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => setAddDialog(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Entry
        </Button>
      </div>

      {/* Entries by Date */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Daily Rate Timesheet</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{rows.length} entries</Badge>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No timesheet entries</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Entry" to start tracking daily rate work</p>
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <ScrollArea className="max-h-[500px]">
            {sortedDates.map((date) => {
              const dateEntries = groupedByDate[date];
              const dateUnits = dateEntries.reduce((s, r) => s + Number(r.units), 0);
              const dateAmount = dateEntries.reduce((s, r) => s + Number(r.amount || 0), 0);
              return (
                <div key={date} className="border-b last:border-0">
                  {/* Date header */}
                  <div className="bg-muted/20 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-xs font-semibold font-mono">{date}</span>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{dateUnits.toFixed(1)} units</span>
                      <span className="font-medium text-foreground">{money(dateAmount)}</span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/10">
                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Employee</th>
                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Task / Job</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[70px]">Units</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[100px]">Rate</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[100px]">Amount</th>
                        <th className="text-center py-2 px-4 font-medium text-muted-foreground w-[90px]">Status</th>
                        <th className="text-center py-2 px-4 font-medium text-muted-foreground w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateEntries.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 px-4 font-medium">{getName(row.employee_id)}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{row.task_description || '—'}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-medium">{Number(row.units).toFixed(1)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums">{money(Number(row.rate_snapshot))}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{money(Number(row.amount || 0))}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[row.status] || ''}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {row.status === 'draft' && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(row.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Timesheet Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Employee *</Label>
              <Select value={newEntry.employee_id} onValueChange={(v) => setNewEntry(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>
                  {(employees || []).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {[emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Work Date *</Label>
              <Input type="date" value={newEntry.work_date} onChange={(e) => setNewEntry(p => ({ ...p, work_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Task / Job Description</Label>
              {tasks.length > 0 ? (
                <Select value={newEntry.task_description} onValueChange={(v) => setNewEntry(p => ({ ...p, task_description: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select or type task..." /></SelectTrigger>
                  <SelectContent>
                    {tasks.map(t => <SelectItem key={t.id} value={t.task_name}>{t.task_name}</SelectItem>)}
                    <SelectItem value="__custom">Other (type below)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={newEntry.task_description} onChange={(e) => setNewEntry(p => ({ ...p, task_description: e.target.value }))} placeholder="e.g. Site clearing, excavation..." />
              )}
              {newEntry.task_description === '__custom' && (
                <Input className="mt-1" placeholder="Type custom task..." onChange={(e) => setNewEntry(p => ({ ...p, task_description: e.target.value }))} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Units *</Label>
                <Input type="number" step="0.5" min="0.5" max="5" value={newEntry.units} onChange={(e) => setNewEntry(p => ({ ...p, units: Number(e.target.value) }))} />
                {newEntry.employee_id && (() => {
                  const existingUnits = rows.filter(r => r.employee_id === newEntry.employee_id && r.work_date === newEntry.work_date)
                    .reduce((s, r) => s + Number(r.units), 0);
                  const emp = employeesById.get(newEntry.employee_id);
                  const maxUnits = (emp as any)?.max_units_per_day || 5.0;
                  const pct = ((existingUnits + newEntry.units) / maxUnits) * 100;
                  return (
                    <div className="mt-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>Units today: {existingUnits + newEntry.units} / {maxUnits}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-destructive' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      {pct > 100 && (
                        <div className="flex items-center gap-1 text-[10px] text-destructive mt-1">
                          <AlertTriangle className="h-3 w-3" /> Exceeds max units
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <Label>Rate</Label>
                <Input type="number" step="0.01" value={newEntry.rate_snapshot} onChange={(e) => setNewEntry(p => ({ ...p, rate_snapshot: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <span className="text-xs text-muted-foreground">Amount: </span>
              <span className="text-sm font-semibold">{money(newEntry.units * newEntry.rate_snapshot)}</span>
            </div>
            {anomalyWarnings.length > 0 && (
              <div className="space-y-1.5">
                {anomalyWarnings.map((a, i) => (
                  <Alert key={i} variant={a.severity === 'critical' ? 'destructive' : 'default'} className="py-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">{a.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddEntry} disabled={saving}>{saving ? 'Saving...' : 'Add Entry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
