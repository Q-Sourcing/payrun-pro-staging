import { useEffect, useMemo, useState } from 'react';
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
import { Save, Upload, RefreshCw, Users, CalendarCheck, Clock, AlertTriangle, FileDown, FileUp, Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { IppmsAttendanceRecord, IppmsAttendanceUpsertInput, IppmsAttendanceStatus } from '@/lib/types/ippmsWorkforce';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, getCurrencySymbol } from '@/lib/constants/countries';

interface Props {
  projectId: string;
}

const today = new Date();

type ProjectMetaLite = {
  currency: string | null;
  country: string | null;
};

// EmployeesService returns a superset; we only rely on these fields here.
type ProjectEmployeeLite = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  pay_rate?: number | null;
  currency?: string | null;
};

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
  const [batchDate, setBatchDate] = useState<string>(toISO(today));
  const [batchRows, setBatchRows] = useState<IppmsAttendanceUpsertInput[]>([]);
  const [batchInitializedFor, setBatchInitializedFor] = useState<string>('');
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<IppmsAttendanceRecord[]>({
    queryKey: ['ippms-attendance', projectId, rangeStart, rangeEnd],
    queryFn: () =>
      IppmsAttendanceService.getAttendance({
        projectId,
        start: rangeStart,
        end: rangeEnd
      })
  });

  const { data: employees } = useQuery<ProjectEmployeeLite[]>({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
  });

  const { data: projectMeta } = useQuery<ProjectMetaLite>({
    queryKey: ['project-meta-lite', projectId],
    queryFn: async () => {
      const { data: row, error } = await supabase.from('projects').select('currency, country').eq('id', projectId).single();
      if (error) throw error;
      return (row || { currency: null, country: null }) as ProjectMetaLite;
    },
    enabled: !!projectId,
  });

  const saveMutation = useMutation({
    mutationFn: async (rows: IppmsAttendanceUpsertInput[]) => {
      await IppmsAttendanceService.saveAttendanceBulk(projectId, rows);
    },
    onSuccess: async () => {
      toast({ title: 'Attendance saved successfully' });
      await qc.invalidateQueries({ queryKey: ['ippms-attendance', projectId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Failed to save', description: message, variant: 'destructive' });
    }
  });

  const statuses: IppmsAttendanceStatus[] = ['PRESENT', 'ABSENT', 'OFF', 'LEAVE', 'UNPAID_LEAVE', 'SICK', 'PUBLIC_HOLIDAY'];

  const records = useMemo(() => data ?? [], [data]);

  const employeesById = useMemo(() => {
    const map = new Map<string, ProjectEmployeeLite>();
    (employees || []).forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  // Load/save invoice amount per project (local only).
  useEffect(() => {
    const key = `ippms_invoice_amount_${projectId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) setInvoiceAmount(saved);
    } catch {
      // ignore
    }
    // Reset initialization when changing projects.
    setBatchInitializedFor('');
    setBatchRows([]);
  }, [projectId]);

  useEffect(() => {
    const key = `ippms_invoice_amount_${projectId}`;
    try {
      localStorage.setItem(key, invoiceAmount);
    } catch {
      // ignore
    }
  }, [invoiceAmount, projectId]);

  // Initialize / refresh the batch grid for the selected day (prefill Present).
  useEffect(() => {
    if (!batchDate) return;
    if (!employees || employees.length === 0) return;
    const initKey = `${projectId}:${batchDate}:${employees.length}`;
    if (batchInitializedFor === initKey) return;

    const existingForDate = (records || []).filter((r) => r.attendance_date === batchDate);
    const existingByEmployee = new Map<string, IppmsAttendanceRecord>();
    existingForDate.forEach((r) => existingByEmployee.set(r.employee_id, r));

    const nextRows: IppmsAttendanceUpsertInput[] = (employees || []).map((e) => {
      const existing = existingByEmployee.get(e.id);
      const status = (existing?.status || 'PRESENT') as IppmsAttendanceStatus;
      const defaultHours = status === 'PRESENT' ? 8 : 0;
      return {
        employee_id: e.id,
        attendance_date: batchDate,
        status,
        shift_id: existing?.shift_id ?? null,
        hours_worked: existing?.hours_worked ?? defaultHours,
        overtime_hours: existing?.overtime_hours ?? 0,
        remarks: existing?.remarks ?? '',
        daily_rate_snapshot: existing?.daily_rate_snapshot ?? e.pay_rate ?? null,
        recorded_source: 'PROJECT_ADMIN',
      };
    });

    setBatchRows(nextRows);
    setBatchInitializedFor(initKey);
  }, [batchDate, batchInitializedFor, employees, projectId, records]);

  // Filter records by the selected batchDate for accurate stats display
  const selectedDateRecords = useMemo(() => records.filter((r) => r.attendance_date === batchDate), [records, batchDate]);

  const stats = useMemo(() => {
    const present = selectedDateRecords.filter((r) => r.status === 'PRESENT').length;
    const absent = selectedDateRecords.filter((r) => r.status === 'ABSENT').length;
    const leave = selectedDateRecords.filter((r) => ['LEAVE', 'UNPAID_LEAVE', 'SICK'].includes(r.status)).length;
    const totalHours = selectedDateRecords.reduce((sum, r) => sum + (r.status === 'PRESENT' ? (r.hours_worked || 0) : 0), 0);
    return { present, absent, leave, totalHours, total: selectedDateRecords.length };
  }, [selectedDateRecords]);

  const batchSummary = useMemo(() => {
    const presentRows = (batchRows || []).filter((r) => r.status === 'PRESENT');
    const totalPresent = presentRows.length;
    const totalHours = presentRows.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
    const estimatedCost = presentRows.reduce((sum, r) => {
      const emp = employeesById.get(r.employee_id);
      const rate = (r.daily_rate_snapshot ?? emp?.pay_rate ?? 0) as number;
      const hours = (r.hours_worked ?? 0) as number;
      return sum + hours * (Number.isFinite(rate) ? rate : 0);
    }, 0);
    return { totalPresent, totalHours, estimatedCost };
  }, [batchRows, employeesById]);

  const currencyCode = projectMeta?.currency || employees?.[0]?.currency || '';
  const money = (amount: number) => (currencyCode ? formatCurrency(amount, currencyCode) : amount.toLocaleString());
  const currencySymbol = currencyCode ? getCurrencySymbol(currencyCode) : '';

  const grouped = useMemo(() => {
    const map: Record<string, IppmsAttendanceRecord[]> = {};
    records.forEach((row) => {
      const key = row.employee_id || 'unknown';
      map[key] = map[key] ? [...map[key], row] : [row];
    });
    return map;
  }, [records]);

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e) => e.id === id);
    if (!emp) return (id || "").slice(0, 8) + '…';
    return [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email || id.slice(0, 8) + '…';
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

      {/* Batch Attendance Entry (single grid, default Present) */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Batch Attendance Entry</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            One row per project employee. Defaults to Present; Absent rows are excluded from totals and cost.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Work Date</Label>
              <Input type="date" value={batchDate} onChange={(e) => { setBatchDate(e.target.value); setBatchInitializedFor(''); }} className="h-9 w-[170px] text-sm" />
            </div>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                // Force re-init for date (resets to default Present where no existing record).
                setBatchInitializedFor('');
              }}
            >
              Reset Defaults
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                if (!batchRows || batchRows.length === 0) {
                  toast({ title: 'No employees in grid', description: 'Assign employees to the project first.', variant: 'destructive' });
                  return;
                }
                saveMutation.mutate(batchRows);
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save All
            </Button>
          </div>

          <ScrollArea className="max-h-[420px] border rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[160px]">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[100px]">Hours</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[90px]">OT</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[130px]">Rate</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(batchRows || []).map((r) => {
                  const emp = employeesById.get(r.employee_id);
                  const name = emp ? ([emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email) : r.employee_id;
                  return (
                    <tr key={r.employee_id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-2 px-3 font-medium">{name}</td>
                      <td className="py-2 px-3">
                        <Select
                          value={r.status}
                          onValueChange={(v) => {
                            const nextStatus = v as IppmsAttendanceStatus;
                            setBatchRows((prev) =>
                              prev.map((x) =>
                                x.employee_id === r.employee_id
                                  ? {
                                      ...x,
                                      status: nextStatus,
                                      // Keep batch output totals clean: non-present rows always carry 0 hours.
                                      hours_worked: nextStatus === 'PRESENT' ? (x.hours_worked ?? 8) : 0,
                                    }
                                  : x
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="h-8">
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
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          step="0.25"
                          value={r.hours_worked ?? ''}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            setBatchRows((prev) => prev.map((x) => (x.employee_id === r.employee_id ? { ...x, hours_worked: value } : x)));
                          }}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          step="0.25"
                          value={r.overtime_hours ?? ''}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            setBatchRows((prev) => prev.map((x) => (x.employee_id === r.employee_id ? { ...x, overtime_hours: value } : x)));
                          }}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          {currencySymbol ? <span className="text-[10px]">{currencySymbol}</span> : null}
                          <Input
                            type="number"
                            step="0.01"
                            value={r.daily_rate_snapshot ?? ''}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : null;
                              setBatchRows((prev) => prev.map((x) => (x.employee_id === r.employee_id ? { ...x, daily_rate_snapshot: value } : x)));
                            }}
                            className="h-8 text-right w-[110px]"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={r.remarks ?? ''}
                          onChange={(e) => setBatchRows((prev) => prev.map((x) => (x.employee_id === r.employee_id ? { ...x, remarks: e.target.value } : x)))}
                          className="h-8"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td className="py-2 px-3 text-xs font-semibold" colSpan={2}>Totals</td>
                  <td className="py-2 px-3 text-right text-xs font-semibold tabular-nums">{batchSummary.totalHours.toFixed(2)}</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-right text-xs font-semibold tabular-nums">{money(batchSummary.estimatedCost)}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">
                    Present: <span className="font-medium text-foreground">{batchSummary.totalPresent}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Compare with Invoice */}
          <div className="rounded-md border bg-muted/10 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Compare with Invoice</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="Invoice amount"
                    className="h-9 w-[220px]"
                  />
                  <div className="text-xs text-muted-foreground">
                    Estimated cost: <span className="font-medium text-foreground">{money(batchSummary.estimatedCost)}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1" />
              <div className="text-xs">
                {(() => {
                  const inv = invoiceAmount.trim() ? Number(invoiceAmount) : 0;
                  const diff = inv - batchSummary.estimatedCost;
                  const label = diff === 0 ? 'Even' : diff > 0 ? 'Under invoice' : 'Over invoice';
                  return (
                    <span className="text-muted-foreground">
                      Variance: <span className={`font-semibold ${diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {money(Math.abs(diff))}
                      </span>{' '}
                      <span className="text-muted-foreground">({label})</span>
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    toast({ title: 'Failed to load template', description: message, variant: 'destructive' });
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
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Invalid JSON';
                    toast({ title: 'Upload failed', description: message, variant: 'destructive' });
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
