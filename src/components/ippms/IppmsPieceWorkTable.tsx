import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IppmsPieceworkService } from '@/lib/services/ippms/ippms.piecework.service';

interface Props {
  projectId: string;
}

const today = new Date();

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function IppmsPieceWorkTable({ projectId }: Props) {
  const [rangeStart] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [rangeEnd] = useState<string>(toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ippms-piece-entries', projectId, rangeStart, rangeEnd],
    queryFn: () =>
      IppmsPieceworkService.getPieceEntries({
        projectId,
        start: rangeStart,
        end: rangeEnd
      })
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Piece Work Entries</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading piece work...</div>}
        {!isLoading && (data || []).length === 0 && (
          <div className="text-sm text-muted-foreground">No piece entries captured for this range.</div>
        )}
        {!isLoading && (data || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Employee</th>
                  <th className="py-1 pr-3">Date</th>
                  <th className="py-1 pr-3">Piece</th>
                  <th className="py-1 pr-3">Qty</th>
                  <th className="py-1 pr-3">Rate</th>
                  <th className="py-1 pr-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data || [])
                  .sort((a, b) => a.work_date.localeCompare(b.work_date))
                  .map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="py-1 pr-3">{row.employee_id}</td>
                      <td className="py-1 pr-3 font-mono">{row.work_date}</td>
                      <td className="py-1 pr-3">{row.piece_id}</td>
                      <td className="py-1 pr-3">{row.quantity}</td>
                      <td className="py-1 pr-3">{row.rate_snapshot ?? '-'}</td>
                      <td className="py-1 pr-3">{row.rate_snapshot ? (row.rate_snapshot * Number(row.quantity)).toFixed(2) : '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}









