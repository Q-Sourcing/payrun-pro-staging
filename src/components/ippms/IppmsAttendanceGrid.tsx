import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IppmsAttendanceService } from '@/lib/services/ippms/ippms.attendance.service';
import { Textarea } from '@/components/ui/textarea';
import { EmployeesService } from '@/lib/data/employees.service';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Upload, RefreshCw, Users, CalendarCheck, Clock, AlertTriangle, Trash2, FileDown, FileUp, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { IppmsAttendanceRecord, IppmsAttendanceUpsertInput, IppmsAttendanceStatus } from '@/lib/types/ippmsWorkforce';

interface Props {
  projectId: string;
}

const today = new Date();

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

const STATUS_CONFIG: Record<IppmsAttendanceStatus, { label: string; color: string; icon?: string }> = {
  PRESENT: { label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  ABSENT: { label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  OFF: { label: 'Off', color: 'bg-muted text-muted-foreground border-border' },
  LEAVE: { label: 'Leave', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  UNPAID_LEAVE: { label: 'Unpaid Leave', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  SICK: { label: 'Sick', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  PUBLIC_HOLIDAY: { label: 'Holiday', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
};

function StatusBadge({ status }: { status: IppmsAttendanceStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${config.color}`}>
      {config.label}
    </span>
  );
}

export function IppmsAttendanceGrid({ projectId }: Props) {
  const [rangeStart, setRangeStart] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [rangeEnd, setRangeEnd] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadPayload, setUploadPayload] = useState<string>('');
  const [form, setForm] = useState<IppmsAttendanceUpsertInput>({
    employee_id: '',
    attendance_date: toISO(today),
    status: 'PRESENT',
    hours_worked: 8,
    overtime_hours: 0,
    remarks: ''
  });
  const [pendingRows, setPendingRows] = useState<IppmsAttendanceUpsertInput[]>([]);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ippms-attendance', projectId, rangeStart, rangeEnd],
    queryFn: () =>
      IppmsAttendanceService.getAttendance({
        projectId,
        start: rangeStart,
        end: rangeEnd
      })
  });

  const { data: employees } = useQuery({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
  });

  const saveMutation = useMutation({
    mutationFn: async (rows: IppmsAttendanceUpsertInput[]) => {
      await IppmsAttendanceService.saveAttendanceBulk(projectId, rows);
    },
    onSuccess: async () => {
      toast({ title: 'Attendance saved successfully' });
      setPendingRows([]);
      await qc.invalidateQueries({ queryKey: ['ippms-attendance', projectId] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to save', description: err?.message || 'Unknown error', variant: 'destructive' });
    }
  });

  const addRow = () => {
    if (!form.employee_id || !form.attendance_date || !form.status) {
      toast({ title: 'Missing required fields', description: 'Employee, date, and status are required.', variant: 'destructive' });
      return;
    }
    setPendingRows((prev) => [...prev, { ...form }]);
    toast({ title: 'Added to batch' });
  };

  const removeRow = (idx: number) => {
    setPendingRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveNow = () => {
    if (pendingRows.length === 0 && form.employee_id) {
      saveMutation.mutate([{ ...form }]);
    } else if (pendingRows.length > 0) {
      saveMutation.mutate(pendingRows);
    } else {
      toast({ title: 'Nothing to save', variant: 'destructive' });
    }
  };

  const statuses: IppmsAttendanceStatus[] = ['PRESENT', 'ABSENT', 'OFF', 'LEAVE', 'UNPAID_LEAVE', 'SICK', 'PUBLIC_HOLIDAY'];

  const records = data || [];

  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const leave = records.filter((r) => ['LEAVE', 'UNPAID_LEAVE', 'SICK'].includes(r.status)).length;
    const totalHours = records.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
    return { present, absent, leave, totalHours, total: records.length };
  }, [records]);

  const grouped = useMemo(() => {
    const map: Record<string, IppmsAttendanceRecord[]> = {};
    records.forEach((row) => {
      const key = row.employee_id || 'unknown';
      map[key] = map[key] ? [...map[key], row] : [row];
    });
    return map;
  }, [records]);

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e: any) => e.id === id);
    if (!emp) return id.slice(0, 8) + '…';
    return [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email;
  };

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: stats.total, icon: CalendarCheck, color: 'text-primary' },
          { label: 'Present', value: stats.present, icon: Users, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Absent', value: stats.absent, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
          { label: 'Total Hours', value: stats.totalHours.toFixed(1), icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 ${stat.color}`}>
              <stat.icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Date Range + Actions Bar */}
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
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowBulkUpload(!showBulkUpload)}>
          <FileUp className="h-3.5 w-3.5" />
          Bulk Upload
        </Button>
      </div>

      {/* Entry Form */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Record Attendance</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Add individual or batch attendance entries</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {[e.first_name, e.last_name].filter(Boolean).join(' ') || e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Date *</Label>
              <Input type="date" value={form.attendance_date} onChange={(e) => setForm((f) => ({ ...f, attendance_date: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as IppmsAttendanceStatus }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.hours_worked ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, hours_worked: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="8"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">OT</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.overtime_hours ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, overtime_hours: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Remarks</Label>
              <Input
                value={form.remarks ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional remarks"
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={addRow}>
                      <Plus className="h-3.5 w-3.5" />
                      Batch
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Add to batch queue</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size="sm" className="h-9 gap-1.5" onClick={saveNow} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Batch */}
      {pendingRows.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Pending Batch</h3>
              <Badge variant="secondary" className="text-[10px]">{pendingRows.length} entries</Badge>
            </div>
            <Button size="sm" className="h-8 gap-1.5" onClick={saveNow} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save All
            </Button>
          </div>
          <ScrollArea className="max-h-[200px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hours</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">OT</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Remarks</th>
                  <th className="py-2 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((r, idx) => (
                  <tr key={`${r.employee_id}-${r.attendance_date}-${idx}`} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 font-medium">{getEmployeeName(r.employee_id)}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{r.attendance_date}</td>
                    <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-2 px-3 text-right tabular-nums">{r.hours_worked ?? '-'}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{r.overtime_hours ?? '-'}</td>
                    <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">{r.remarks || '-'}</td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Bulk Upload Section */}
      {showBulkUpload && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Bulk Upload</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Paste a JSON array or load a template to bulk-import attendance records</p>
          </div>
          <div className="p-4 space-y-3">
            <Textarea
              value={uploadPayload}
              onChange={(e) => setUploadPayload(e.target.value)}
              placeholder='[{"employee_id":"...","attendance_date":"2025-12-05","status":"PRESENT","hours_worked":8}]'
              className="text-xs font-mono min-h-[100px]"
              rows={4}
            />
            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={async () => {
                  try {
                    const tmpl = await IppmsAttendanceService.generateTemplate(projectId);
                    setUploadPayload(JSON.stringify(tmpl, null, 2));
                    toast({ title: 'Template loaded' });
                  } catch (err: any) {
                    toast({ title: 'Failed to load template', description: err?.message || 'Unknown error', variant: 'destructive' });
                  }
                }}
              >
                <FileDown className="h-3.5 w-3.5" />
                Load Template
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={async () => {
                  if (!uploadPayload.trim()) {
                    toast({ title: 'No payload', variant: 'destructive' });
                    return;
                  }
                  try {
                    const parsed = JSON.parse(uploadPayload);
                    await IppmsAttendanceService.importTemplate(projectId, parsed);
                    toast({ title: 'Upload processed successfully' });
                    setUploadPayload('');
                    setShowBulkUpload(false);
                    await qc.invalidateQueries({ queryKey: ['ippms-attendance', projectId] });
                  } catch (err: any) {
                    toast({ title: 'Upload failed', description: err?.message || 'Invalid JSON', variant: 'destructive' });
                  }
                }}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Attendance Records</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {rangeStart} — {rangeEnd} · {records.length} record{records.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading attendance records…</span>
          </div>
        )}

        {!isLoading && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <CalendarCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No attendance records</p>
            <p className="text-xs text-muted-foreground mt-1">Start by adding attendance entries above</p>
          </div>
        )}

        {!isLoading && records.length > 0 && (
          <ScrollArea className="max-h-[500px]">
            {Object.entries(grouped).map(([employeeId, rows]) => (
              <div key={employeeId} className="border-b last:border-0">
                <div className="bg-muted/20 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-semibold">{getEmployeeName(employeeId)}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{rows.length} entries</Badge>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="text-left py-2 px-4 font-medium text-muted-foreground w-[120px]">Date</th>
                      <th className="text-left py-2 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[80px]">Hours</th>
                      <th className="text-right py-2 px-4 font-medium text-muted-foreground w-[80px]">Overtime</th>
                      <th className="text-left py-2 px-4 font-medium text-muted-foreground">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
                      .map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{row.attendance_date}</td>
                          <td className="py-2.5 px-4"><StatusBadge status={row.status} /></td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-medium">{row.hours_worked ?? '-'}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums">{row.overtime_hours ?? '-'}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{row.remarks || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
