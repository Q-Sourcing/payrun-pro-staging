import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function EhsReports() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">EHS Reports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Regulatory Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">OSHA 300 logs, TRIR calculations, and KPI reports coming in Phase 1 Core build.</p>
        </CardContent>
      </Card>
    </div>
  );
}
