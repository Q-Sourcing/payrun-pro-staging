import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function EhsHazards() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">Hazard Reporting</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Hazards & Safety Observations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Hazard reporting and safety observations module coming in Phase 1 Core build.</p>
        </CardContent>
      </Card>
    </div>
  );
}
