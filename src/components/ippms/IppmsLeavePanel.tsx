import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IppmsLeaveService } from '@/lib/services/ippms/ippms.leave.service';

interface Props {
  projectId: string;
}

export function IppmsLeavePanel({ projectId }: Props) {
  const qc = useQueryClient();
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
      setReason('');
    }
  });

  const typeOptions = useMemo(() => leaveTypes || [], [leaveTypes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leave</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Employee ID</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="employee uuid" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Leave Type</Label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              <option value="">Select</option>
              {typeOptions.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} {lt.paid ? '(Paid)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => applyMutation.mutate()}
            disabled={!employeeId || !leaveTypeId || !startDate || !endDate || applyMutation.isLoading}
          >
            Apply Leave
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Recent leave requests</div>
          {isLoading && <div className="text-sm text-muted-foreground">Loading leave...</div>}
          {!isLoading && (leaveRequests || []).length === 0 && (
            <div className="text-sm text-muted-foreground">No leave requests.</div>
          )}
          {!isLoading && (leaveRequests || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-3">Employee</th>
                    <th className="py-1 pr-3">Type</th>
                    <th className="py-1 pr-3">Start</th>
                    <th className="py-1 pr-3">End</th>
                    <th className="py-1 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaveRequests || []).map((lr) => (
                    <tr key={lr.id} className="border-t">
                      <td className="py-1 pr-3">{lr.employee_id}</td>
                      <td className="py-1 pr-3">{lr.leave_type_id}</td>
                      <td className="py-1 pr-3 font-mono">{lr.start_date}</td>
                      <td className="py-1 pr-3 font-mono">{lr.end_date}</td>
                      <td className="py-1 pr-3">{lr.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


