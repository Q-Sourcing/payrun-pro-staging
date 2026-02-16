import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IppmsAttendanceGrid } from './IppmsAttendanceGrid';
import { IppmsLeavePanel } from './IppmsLeavePanel';
import { IppmsHolidayPanel } from './IppmsHolidayPanel';
import { IppmsShiftPanel } from './IppmsShiftPanel';
import { IppmsPieceWorkTable } from './IppmsPieceWorkTable';
import { IppmsPieceRatesPanel } from './IppmsPieceRatesPanel';
import { CalendarDays, Hammer, Clock, Palmtree, PartyPopper, ArrowLeftRight, Info } from 'lucide-react';

interface Props {
  projectId: string;
}

export function IppmsWorkTab({ projectId }: Props) {
  const [payType, setPayType] = useState<'daily_rate' | 'piece_rate'>('daily_rate');

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="pb-4 bg-muted/20 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {payType === 'daily_rate' ? <CalendarDays className="h-5 w-5" /> : <Hammer className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">IPPMS Workboard</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage daily-rate attendance or piece-rate entries
              </p>
            </div>
          </div>
          <div className="inline-flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              onClick={() => setPayType('daily_rate')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                payType === 'daily_rate'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Daily Rate
            </button>
            <button
              onClick={() => setPayType('piece_rate')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                payType === 'piece_rate'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Hammer className="h-3.5 w-3.5" />
              Piece Rate
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {payType === 'daily_rate' && (
          <Tabs defaultValue="attendance" className="space-y-4">
            <TabsList className="h-9 bg-muted/50 p-0.5">
              <TabsTrigger value="attendance" className="gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="leave" className="gap-1.5 text-xs">
                <Palmtree className="h-3.5 w-3.5" />
                Leave
              </TabsTrigger>
              <TabsTrigger value="holidays" className="gap-1.5 text-xs">
                <PartyPopper className="h-3.5 w-3.5" />
                Holidays
              </TabsTrigger>
              <TabsTrigger value="shifts" className="gap-1.5 text-xs">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Shifts
              </TabsTrigger>
            </TabsList>
            <TabsContent value="attendance">
              <IppmsAttendanceGrid projectId={projectId} />
            </TabsContent>
            <TabsContent value="leave">
              <IppmsLeavePanel projectId={projectId} />
            </TabsContent>
            <TabsContent value="holidays">
              <IppmsHolidayPanel projectId={projectId} />
            </TabsContent>
            <TabsContent value="shifts">
              <IppmsShiftPanel projectId={projectId} />
            </TabsContent>
          </Tabs>
        )}

        {payType === 'piece_rate' && (
          <Tabs defaultValue="entries" className="space-y-4">
            <TabsList className="h-9 bg-muted/50 p-0.5">
              <TabsTrigger value="entries" className="gap-1.5 text-xs">
                <Hammer className="h-3.5 w-3.5" />
                Piece Work Entries
              </TabsTrigger>
              <TabsTrigger value="rates" className="gap-1.5 text-xs">
                Piece Rates
              </TabsTrigger>
            </TabsList>
            <TabsContent value="entries">
              <IppmsPieceWorkTable projectId={projectId} />
            </TabsContent>
            <TabsContent value="rates">
              <IppmsPieceRatesPanel projectId={projectId} />
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/5 p-3.5">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Work-Day Engine</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each attendance or piece entry updates the unified work-day ledger, preventing double pay and enabling
              mid-period switches. Payrun selection honors the active work type per day.
            </p>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary bg-primary/5">Daily Lane</Badge>
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary bg-primary/5">Piece Lane</Badge>
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary bg-primary/5">Leave / Holiday</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
