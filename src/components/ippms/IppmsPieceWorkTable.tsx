import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { IppmsPieceworkService } from '@/lib/services/ippms/ippms.piecework.service';
import { EmployeesService } from '@/lib/data/employees.service';
import { RefreshCw, Loader2, Hammer, Package } from 'lucide-react';

interface Props {
  projectId: string;
}

const today = new Date();
function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function IppmsPieceWorkTable({ projectId }: Props) {
  const [rangeStart, setRangeStart] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [rangeEnd, setRangeEnd] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ippms-piece-entries', projectId, rangeStart, rangeEnd],
    queryFn: () =>
      IppmsPieceworkService.getPieceEntries({
        projectId,
        start: rangeStart,
        end: rangeEnd
      })
  });

  const { data: employees } = useQuery({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
  });

  const entries = data || [];

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e: any) => e.id === id);
    if (!emp) return id.slice(0, 8) + '…';
    return [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email;
  };

  const totalAmount = useMemo(() =>
    entries.reduce((sum, r) => sum + (r.rate_snapshot ? r.rate_snapshot * Number(r.quantity) : 0), 0),
    [entries]
  );

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold text-primary">{entries.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Entries</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold">{entries.reduce((s, r) => s + Number(r.quantity), 0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Pieces</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalAmount.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Amount</p>
        </div>
      </div>

      {/* Date Range */}
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
      </div>

      {/* Entries Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <Hammer className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Piece Work Entries</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{entries.length} entries</Badge>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No piece entries</p>
            <p className="text-xs text-muted-foreground mt-1">No piece work captured for this period</p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <ScrollArea className="max-h-[500px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Piece</th>
                  <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Rate</th>
                  <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .sort((a, b) => a.work_date.localeCompare(b.work_date))
                  .map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{getEmployeeName(row.employee_id)}</td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">{row.work_date}</td>
                      <td className="py-2.5 px-4">{row.piece_id.slice(0, 8)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium">{row.quantity}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{row.rate_snapshot ?? '-'}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                        {row.rate_snapshot ? (row.rate_snapshot * Number(row.quantity)).toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
