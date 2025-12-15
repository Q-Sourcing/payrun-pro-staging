import { createFileRoute } from "@tanstack/react-router";
import { ActivitySquare, AlertTriangle, Database } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDiagnosticsPlaceholder } from "@/api/support";

export const Route = createFileRoute("/_app/support/diagnostics")({
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const diag = getDiagnosticsPlaceholder();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ActivitySquare className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-semibold">Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Supabase connectivity, RLS warnings, and table counts.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Supabase Connection</CardTitle>
            <CardDescription>Basic connectivity indicator.</CardDescription>
          </div>
          <Badge variant={diag.supabaseConnected ? "secondary" : "destructive"}>
            {diag.supabaseConnected ? "Connected" : "Down"}
          </Badge>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <div>
            <CardTitle>Row Counts</CardTitle>
            <CardDescription>Placeholder counts for critical tables.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {diag.tableCounts.map((item) => (
            <div key={item.table} className="rounded-md border bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">{item.table}</div>
              <div className="text-lg font-semibold">{item.rows}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <div>
            <CardTitle>RLS Warnings</CardTitle>
            <CardDescription>Placeholder RLS issues detected.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {diag.rlsWarnings.length === 0 && (
            <div className="text-muted-foreground">No RLS warnings.</div>
          )}
          {diag.rlsWarnings.map((warning) => (
            <div key={warning} className="rounded-md border bg-muted/50 px-3 py-2">
              {warning}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}



