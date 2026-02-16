import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { IppmsHolidaysService } from '@/lib/services/ippms/ippms.holidays.service';
import { useToast } from '@/hooks/use-toast';
import { PartyPopper, Plus, Loader2, Calendar, Globe } from 'lucide-react';

interface Props {
  projectId: string;
}

export function IppmsHolidayPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
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
      toast({ title: 'Holiday added' });
      setName('');
      setCountry('');
      setHolidayDate('');
    },
    onError: (err: any) => {
      toast({ title: 'Failed to add holiday', description: err?.message, variant: 'destructive' });
    }
  });

  const holidays = data || [];

  return (
    <div className="space-y-5">
      {/* Add Holiday Form */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Add Holiday</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configure public or project-specific holidays</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Date *</Label>
              <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Independence Day" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Optional" className="h-9" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => holidayMutation.mutate()}
              disabled={!holidayDate || !name || holidayMutation.isPending}
            >
              {holidayMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Holiday
            </Button>
          </div>
        </div>
      </div>

      {/* Holidays List */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Configured Holidays</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{holidays.length} holidays</Badge>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && holidays.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
              <PartyPopper className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No holidays configured</p>
            <p className="text-xs text-muted-foreground mt-1">Add project holidays above</p>
          </div>
        )}

        {!isLoading && holidays.length > 0 && (
          <ScrollArea className="max-h-[400px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Holiday</th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Country</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">{h.holiday_date}</td>
                    <td className="py-2.5 px-4 font-medium">{h.name}</td>
                    <td className="py-2.5 px-4">
                      {h.country ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {h.country}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">All</span>
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
