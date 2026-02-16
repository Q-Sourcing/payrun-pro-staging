import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { IppmsPieceworkService } from '@/lib/services/ippms/ippms.piecework.service';
import { EmployeesService } from '@/lib/data/employees.service';
import { RefreshCw, Loader2, DollarSign, Tag, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  projectId: string;
}

export function IppmsPieceRatesPanel({ projectId }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ippms-piece-rates', projectId],
    queryFn: () => IppmsPieceworkService.getRates(projectId)
  });

  const { data: employees } = useQuery({
    queryKey: ['project-employees-lite', projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
  });

  const rates = data || [];

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e: any) => e.id === id);
    if (!emp) return id.slice(0, 8) + '…';
    return [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email;
  };

  return (
    <div className="space-y-5">
      {/* Rates Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Piece Rates</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{rates.length} rates</Badge>
          <Button variant="outline" size="sm" className="h-7 gap-1 ml-2 text-xs" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && rates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No piece rates configured</p>
            <p className="text-xs text-muted-foreground mt-1">Set up piece rates to track piece-based compensation</p>
          </div>
        )}

        {!isLoading && rates.length > 0 && (
          <ScrollArea className="max-h-[500px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Piece</th>
                  <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Rate</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Effective From</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Effective To</th>
                  <th className="text-center py-2.5 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 font-medium">{getEmployeeName(row.employee_id)}</td>
                    <td className="py-2.5 px-4">{row.piece_id.slice(0, 8)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{row.rate.toFixed(2)}</td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">{row.start_date}</td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">{row.end_date || '—'}</td>
                    <td className="py-2.5 px-4 text-center">
                      {row.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border px-2 py-0.5 text-[10px] font-semibold">
                          <XCircle className="h-2.5 w-2.5" />
                          Inactive
                        </span>
                      )}
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
