import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IppmsPieceworkService } from '@/lib/services/ippms/ippms.piecework.service';

interface Props {
  projectId: string;
}

export function IppmsPieceRatesPanel({ projectId }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ippms-piece-rates', projectId],
    queryFn: () => IppmsPieceworkService.getRates(projectId)
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Piece Rates</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading piece rates...</div>}
        {!isLoading && (data || []).length === 0 && (
          <div className="text-sm text-muted-foreground">No piece rates configured.</div>
        )}
        {!isLoading && (data || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Employee</th>
                  <th className="py-1 pr-3">Piece</th>
                  <th className="py-1 pr-3">Rate</th>
                  <th className="py-1 pr-3">Start</th>
                  <th className="py-1 pr-3">End</th>
                  <th className="py-1 pr-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-1 pr-3">{row.employee_id}</td>
                    <td className="py-1 pr-3">{row.piece_id}</td>
                    <td className="py-1 pr-3">{row.rate}</td>
                    <td className="py-1 pr-3 font-mono">{row.start_date}</td>
                    <td className="py-1 pr-3 font-mono">{row.end_date || '-'}</td>
                    <td className="py-1 pr-3">{row.active ? 'Yes' : 'No'}</td>
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









