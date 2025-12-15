import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/settings/global")({
  component: GlobalSettingsPage,
});

function GlobalSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Global Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure platform-level policies and defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval & Authentication</CardTitle>
          <CardDescription>Placeholder controls for global policies.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Max approvers</Label>
            <Input placeholder="e.g. 3" />
          </div>
          <div className="space-y-2">
            <Label>Email provider</Label>
            <Input placeholder="sendgrid | ses | mailgun" />
          </div>
          <div className="space-y-2">
            <Label>Password policy</Label>
            <Textarea placeholder="Describe password rules" />
          </div>
          <div className="space-y-2">
            <Label>Audit log retention (days)</Label>
            <Input placeholder="e.g. 90" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="theme" />
            <Label htmlFor="theme">Dark theme default</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="session-lock" />
            <Label htmlFor="session-lock">Session lock after idle</Label>
          </div>
          <Button className="md:col-span-2" disabled>
            Save (wire Supabase)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


