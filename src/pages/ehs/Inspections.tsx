import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck } from 'lucide-react';

export default function EhsInspections() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Safety Inspections</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inspections & Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Safety inspections and checklists module coming in Phase 1 Core build.</p>
        </CardContent>
      </Card>
    </div>
  );
}
