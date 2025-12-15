import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/settings/modules/ippms")({
  component: IppmsSettingsPage,
});

function IppmsSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">IPPMS Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Attendance & Project Rules</CardTitle>
          <CardDescription>Placeholder defaults for IPPMS module.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Attendance grace period (mins)</Label>
            <Input placeholder="e.g. 10" />
          </div>
          <div className="space-y-2">
            <Label>Daily rate default</Label>
            <Input placeholder="e.g. 150" />
          </div>
          <div className="space-y-2">
            <Label>Project approval rules</Label>
            <Textarea placeholder="Describe approval workflow" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Additional IPPMS defaults" />
          </div>
          <Button className="md:col-span-2" disabled>
            Save (wire Supabase)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}



