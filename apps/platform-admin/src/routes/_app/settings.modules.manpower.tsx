import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/settings/modules/manpower")({
  component: ManpowerSettingsPage,
});

function ManpowerSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manpower Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Rate Card Defaults</CardTitle>
          <CardDescription>Configure defaults for manpower assignments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Rate card template</Label>
            <Textarea placeholder="Describe the default rate card" />
          </div>
          <div className="space-y-2">
            <Label>Project approval rules</Label>
            <Textarea placeholder="Define approval hierarchy" />
          </div>
          <div className="space-y-2">
            <Label>Overtime multiplier</Label>
            <Input placeholder="e.g. 1.5" />
          </div>
          <Button className="md:col-span-2" disabled>
            Save (wire Supabase)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


