import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IppmsAttendanceService } from '@/lib/services/ippms/ippms.attendance.service';
import { Textarea } from '@/components/ui/textarea';
import { EmployeesService } from '@/lib/data/employees.service';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { IppmsAttendanceRecord, IppmsAttendanceUpsertInput, IppmsAttendanceStatus } from '@/lib/types/ippmsWorkforce';

interface Props {
  projectId: string;
}

const today = new Date();

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function IppmsAttendanceGrid({ projectId }: Props) {
  const [rangeStart] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [rangeEnd] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  const [uploadPayload, setUploadPayload] = useState<string>('');
  const [form, setForm] = useState<IppmsAttendanceUpsertInput>({
    employee_id: '',
    attendance_date: toISO(today),
    status: 'PRESENT',
    hours_worked: undefined,
    overtime_hours: undefined,
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
      toast({ title: 'Attendance saved' });
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
  };

  const removeRow = (idx: number) => {
    setPendingRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveNow = () => {
    if (pendingRows.length === 0 && form.employee_id) {
      // Save single row
      saveMutation.mutate([{ ...form }]);
    } else if (pendingRows.length > 0) {
      saveMutation.mutate(pendingRows);
    } else {
      toast({ title: 'Nothing to save', variant: 'destructive' });
    }
  };

  const statuses: IppmsAttendanceStatus[] = ['PRESENT', 'ABSENT', 'OFF', 'LEAVE', 'UNPAID_LEAVE', 'SICK', 'PUBLIC_HOLIDAY'];

  const grouped = useMemo(() => {
    const map: Record<string, IppmsAttendanceRecord[]> = {};
    (data || []).forEach((row) => {
      const key = row.employee_id || 'unknown';
      map[key] = map[key] ? [...map[key], row] : [row];
    });
    return map;
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Attendance</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded border p-3 space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}>
                <SelectTrigger className="w-full">
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={form.attendance_date} onChange={(e) => setForm((f) => ({ ...f, attendance_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as IppmsAttendanceStatus }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hours</Label>
              <Input
                type="number"
                step="0.25"
                value={form.hours_worked ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, hours_worked: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">OT Hours</Label>
              <Input
                type="number"
                step="0.25"
                value={form.overtime_hours ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, overtime_hours: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Remarks</Label>
              <Input
                value={form.remarks ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional remarks"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm" onClick={addRow}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to batch</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={saveNow} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save attendance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {pendingRows.length > 0 && (
            <div className="rounded border p-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Pending batch</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1 pr-2">Employee</th>
                      <th className="py-1 pr-2">Date</th>
                      <th className="py-1 pr-2">Status</th>
                      <th className="py-1 pr-2">Hours</th>
                      <th className="py-1 pr-2">OT</th>
                      <th className="py-1 pr-2">Remarks</th>
                      <th className="py-1 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRows.map((r, idx) => (
                      <tr key={`${r.employee_id}-${r.attendance_date}-${idx}`} className="border-t">
                        <td className="py-1 pr-2">{r.employee_id}</td>
                        <td className="py-1 pr-2 font-mono">{r.attendance_date}</td>
                        <td className="py-1 pr-2">{r.status}</td>
                        <td className="py-1 pr-2">{r.hours_worked ?? '-'}</td>
                        <td className="py-1 pr-2">{r.overtime_hours ?? '-'}</td>
                        <td className="py-1 pr-2 text-muted-foreground">{r.remarks || '-'}</td>
                        <td className="py-1 pr-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => removeRow(idx)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded border p-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Bulk upload (JSON array)</div>
            <Textarea
              value={uploadPayload}
              onChange={(e) => setUploadPayload(e.target.value)}
              placeholder='[{"employee_id":"...","attendance_date":"2025-12-05","status":"PRESENT","hours_worked":8}]'
              className="text-xs font-mono"
              rows={3}
            />
            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                size="sm"
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
                Load template
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!uploadPayload.trim()) {
                          toast({ title: 'No payload', variant: 'destructive' });
                          return;
                        }
                        try {
                          const parsed = JSON.parse(uploadPayload);
                          await IppmsAttendanceService.importTemplate(projectId, parsed);
                          toast({ title: 'Upload processed' });
                          await qc.invalidateQueries({ queryKey: ['ippms-attendance', projectId] });
                        } catch (err: any) {
                          toast({ title: 'Upload failed', description: err?.message || 'Invalid JSON', variant: 'destructive' });
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload batch</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Loading attendance...</div>}
        {!isLoading && (data || []).length === 0 && (
          <div className="text-sm text-muted-foreground">No attendance captured for this range.</div>
        )}
        {!isLoading &&
          Object.entries(grouped).map(([employeeId, rows]) => (
            <div key={employeeId} className="rounded border p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Employee {employeeId}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1 pr-3">Date</th>
                      <th className="py-1 pr-3">Status</th>
                      <th className="py-1 pr-3">Hours</th>
                      <th className="py-1 pr-3">OT</th>
                      <th className="py-1 pr-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
                      .map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="py-1 pr-3 font-mono">{row.attendance_date}</td>
                          <td className="py-1 pr-3">{row.status}</td>
                          <td className="py-1 pr-3">{row.hours_worked ?? '-'}</td>
                          <td className="py-1 pr-3">{row.overtime_hours ?? '-'}</td>
                          <td className="py-1 pr-3 text-muted-foreground">{row.remarks || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}


