import { createFileRoute } from "@tanstack/react-router";
import { Activity, ServerCog, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            High-level view of platform health and tenant activity.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Active Tenants" value="--" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard title="Pending Support Tickets" value="--" icon={<Activity className="h-4 w-4" />} />
        <StatCard title="Background Jobs" value="--" icon={<ServerCog className="h-4 w-4" />} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This is the dashboard page. Add charts and health widgets here.</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Environment: STAGING</li>
            <li>Supabase connected via service tables</li>
            <li>TanStack Router + Query scaffold ready</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">Placeholder metric</p>
      </CardContent>
    </Card>
  );
}


