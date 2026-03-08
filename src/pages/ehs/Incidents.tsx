import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function EhsIncidents() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold">Incident Management</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Incident reporting and investigation module coming in Phase 1 Core build.</p>
        </CardContent>
      </Card>
    </div>
  );
}
