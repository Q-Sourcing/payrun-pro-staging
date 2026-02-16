import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { IppmsShiftsService } from '@/lib/services/ippms/ippms.shifts.service';
import { EmployeesService } from '@/lib/data/employees.service';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, UserPlus, Loader2, Clock, Coffee, Star } from 'lucide-react';

interface Props {
  projectId: string;
}

export function IppmsShiftPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['ippms-shifts', projectId],
    queryFn: () => IppmsShiftsService.getShifts(projectId)
  });

  const { data: employees } = useQuery({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
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
      toast({ title: 'Shift assigned successfully' });
      setStartDate('');
      setEndDate('');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to assign shift', description: err?.message, variant: 'destructive' });
    }
  });

  const shiftList = shifts || [];

  return (
    <div className="space-y-5">
      {/* Assign Shift Form */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Assign Shift</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Assign an employee to a shift pattern</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Shift *</Label>
              <Select value={shiftId} onValueChange={setShiftId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shiftList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.start_time} – {s.end_time})
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
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => assignMutation.mutate()}
              disabled={!employeeId || !shiftId || !startDate || assignMutation.isPending}
            >
              {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Assign Shift
            </Button>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Shift Patterns</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{shiftList.length} shifts</Badge>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && shiftList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No shifts configured</p>
            <p className="text-xs text-muted-foreground mt-1">Shifts are managed at the system level</p>
          </div>
        )}

        {!isLoading && shiftList.length > 0 && (
          <div className="grid gap-3 p-4">
            {shiftList.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{s.name}</p>
                    {s.is_default && (
                      <Badge variant="secondary" className="text-[10px] gap-0.5">
                        <Star className="h-2.5 w-2.5" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {s.start_time} – {s.end_time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Coffee className="h-3 w-3" />
                      {s.break_minutes ?? 0}m break
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
