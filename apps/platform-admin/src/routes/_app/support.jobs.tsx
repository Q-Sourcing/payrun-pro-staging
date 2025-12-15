import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RefreshCcw, Server } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getJobStatsPlaceholder } from "@/api/support";

export const Route = createFileRoute("/_app/support/jobs")({
  component: JobsPage,
});

function JobsPage() {
  const jobs = useMemo(() => getJobStatsPlaceholder(), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Server className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-semibold">Jobs Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor background queues and retry/cancel jobs (placeholder).
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.queue}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>{job.queue} queue</CardTitle>
                <CardDescription>Placeholder stats</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="text-lg font-semibold">{job.pending}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{job.processing}</div>
                <div className="text-muted-foreground">Processing</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{job.failed}</div>
                <div className="text-muted-foreground">Failed</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


