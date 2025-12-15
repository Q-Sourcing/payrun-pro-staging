import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IppmsAttendanceGrid } from './IppmsAttendanceGrid';
import { IppmsLeavePanel } from './IppmsLeavePanel';
import { IppmsHolidayPanel } from './IppmsHolidayPanel';
import { IppmsShiftPanel } from './IppmsShiftPanel';
import { IppmsPieceWorkTable } from './IppmsPieceWorkTable';
import { IppmsPieceRatesPanel } from './IppmsPieceRatesPanel';

interface Props {
  projectId: string;
}

export function IppmsWorkTab({ projectId }: Props) {
  const [payType, setPayType] = useState<'daily_rate' | 'piece_rate'>('daily_rate');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">IPPMS Work</div>
          <div className="text-xs text-muted-foreground">
            Switch between daily-rate attendance lane and piece-rate lane
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={payType === 'daily_rate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPayType('daily_rate')}
          >
            Daily Rate
          </Button>
          <Button
            variant={payType === 'piece_rate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPayType('piece_rate')}
          >
            Piece Rate
          </Button>
        </div>
      </div>

      {payType === 'daily_rate' && (
        <Tabs defaultValue="attendance">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
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
        <Tabs defaultValue="entries">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entries">Piece Work Entries</TabsTrigger>
            <TabsTrigger value="rates">Piece Rates</TabsTrigger>
          </TabsList>
          <TabsContent value="entries">
            <IppmsPieceWorkTable projectId={projectId} />
          </TabsContent>
          <TabsContent value="rates">
            <IppmsPieceRatesPanel projectId={projectId} />
          </TabsContent>
        </Tabs>
      )}

      <div className="rounded border p-3 bg-muted/30">
        <div className="text-xs font-semibold text-muted-foreground mb-1">Work-Day Engine</div>
        <p className="text-xs text-muted-foreground">
          Each attendance or piece entry updates the unified work-day ledger, preventing double pay and enabling
          mid-period switches. Payrun selection honors the active work_type per day.
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="secondary">IPPMS Daily Lane</Badge>
          <Badge variant="secondary">IPPMS Piece Lane</Badge>
          <Badge variant="secondary">Leave / Holiday overrides</Badge>
        </div>
      </div>
    </div>
  );
}



