import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { IppmsLeaveService } from '@/lib/services/ippms/ippms.leave.service';
import { EmployeesService } from '@/lib/data/employees.service';
import { useToast } from '@/hooks/use-toast';
import { Palmtree, Send, Loader2, CalendarRange, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Props {
  projectId: string;
}

const LEAVE_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

export function IppmsLeavePanel({ projectId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: leaveTypes } = useQuery({
    queryKey: ['ippms-leave-types'],
    queryFn: () => IppmsLeaveService.getLeaveTypes()
  });

  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['ippms-leave-requests', projectId],
    queryFn: () => IppmsLeaveService.getLeaveRequests(projectId)
  });

  const { data: employees } = useQuery({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      IppmsLeaveService.applyLeave({
        employee_id: employeeId,
        project_id: projectId,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ippms-leave-requests', projectId] });
      toast({ title: 'Leave request submitted' });
      setReason('');
      setStartDate('');
      setEndDate('');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to apply leave', description: err?.message, variant: 'destructive' });
    }
  });

  const typeOptions = useMemo(() => leaveTypes || [], [leaveTypes]);
  const requests = leaveRequests || [];

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e: any) => e.id === id);
    if (!emp) return id.slice(0, 8) + '…';
    return [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email;
  };

  const getLeaveTypeName = (id: string) => {
    const lt = typeOptions.find((t) => t.id === id);
    return lt ? lt.name : id.slice(0, 8);
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    approved: requests.filter((r) => r.status === 'APPROVED').length,
  }), [requests]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Requests', value: stats.total, color: 'text-primary' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Apply Leave Form */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Apply Leave</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Submit a new leave request for an employee</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
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
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Leave Type *</Label>
              <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name} {lt.paid ? '(Paid)' : '(Unpaid)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">End Date *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason for leave" className="h-9" />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => applyMutation.mutate()}
              disabled={!employeeId || !leaveTypeId || !startDate || !endDate || applyMutation.isPending}
            >
              {applyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Request
            </Button>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Leave Requests</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{requests.length} total</Badge>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <Palmtree className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No leave requests</p>
            <p className="text-xs text-muted-foreground mt-1">Submit a leave request above to get started</p>
          </div>
        )}

        {!isLoading && requests.length > 0 && (
          <ScrollArea className="max-h-[400px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Period</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((lr) => {
                  const statusCfg = LEAVE_STATUS_CONFIG[lr.status] || LEAVE_STATUS_CONFIG.PENDING;
                  return (
                    <tr key={lr.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{getEmployeeName(lr.employee_id)}</td>
                      <td className="py-2.5 px-4">{getLeaveTypeName(lr.leave_type_id)}</td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">{lr.start_date} → {lr.end_date}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{lr.reason || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
