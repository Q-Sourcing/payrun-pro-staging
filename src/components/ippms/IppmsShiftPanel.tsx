import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IppmsShiftsService } from '@/lib/services/ippms/ippms.shifts.service';

interface Props {
  projectId: string;
}

export function IppmsShiftPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['ippms-shifts', projectId],
    queryFn: () => IppmsShiftsService.getShifts(projectId)
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      IppmsShiftsService.assignShift({
        employeeId,
        projectId,
        shiftId,
        start: startDate,
        end: endDate || null
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ippms-shifts', projectId] });
      if (employeeId) {
        qc.invalidateQueries({ queryKey: ['ippms-employee-shifts', projectId, employeeId] });
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Shifts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Employee ID</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="employee uuid" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Shift</Label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
            >
              <option value="">Select</option>
              {(shifts || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_time} - {s.end_time})
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
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => assignMutation.mutate()}
            disabled={!employeeId || !shiftId || !startDate || assignMutation.isLoading}
          >
            Assign Shift
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Shifts</div>
          {isLoading && <div className="text-sm text-muted-foreground">Loading shifts...</div>}
          {!isLoading && (shifts || []).length === 0 && (
            <div className="text-sm text-muted-foreground">No shifts configured.</div>
          )}
          {!isLoading && (shifts || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-3">Name</th>
                    <th className="py-1 pr-3">Hours</th>
                    <th className="py-1 pr-3">Break (m)</th>
                    <th className="py-1 pr-3">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {(shifts || []).map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-1 pr-3">{s.name}</td>
                      <td className="py-1 pr-3 font-mono">
                        {s.start_time} - {s.end_time}
                      </td>
                      <td className="py-1 pr-3">{s.break_minutes ?? 0}</td>
                      <td className="py-1 pr-3">{s.is_default ? 'Yes' : 'No'}</td>
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









