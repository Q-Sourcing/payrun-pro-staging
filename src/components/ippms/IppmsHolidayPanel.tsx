import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IppmsHolidaysService } from '@/lib/services/ippms/ippms.holidays.service';

interface Props {
  projectId: string;
}

export function IppmsHolidayPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const [holidayDate, setHolidayDate] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ippms-holidays', projectId],
    queryFn: () => IppmsHolidaysService.getHolidays(projectId)
  });

  const holidayMutation = useMutation({
    mutationFn: () =>
      IppmsHolidaysService.applyHoliday({
        project_id: projectId,
        holiday_date: holidayDate,
        name,
        country
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ippms-holidays', projectId] });
      setName('');
      setCountry('');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Holidays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Holiday name" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Country (optional)</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => holidayMutation.mutate()}
            disabled={!holidayDate || !name || holidayMutation.isLoading}
          >
            Apply Holiday
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Configured holidays</div>
          {isLoading && <div className="text-sm text-muted-foreground">Loading holidays...</div>}
          {!isLoading && (data || []).length === 0 && (
            <div className="text-sm text-muted-foreground">No holidays configured.</div>
          )}
          {!isLoading && (data || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Name</th>
                    <th className="py-1 pr-3">Country</th>
                  </tr>
                </thead>
                <tbody>
                  {(data || []).map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="py-1 pr-3 font-mono">{h.holiday_date}</td>
                      <td className="py-1 pr-3">{h.name}</td>
                      <td className="py-1 pr-3">{h.country || '-'}</td>
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









