import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/settings/modules/payroll")({
  component: PayrollSettingsPage,
});

function PayrollSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Payroll Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Payrun Controls</CardTitle>
          <CardDescription>Configure numbering and payroll defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Auto-numbering pattern</Label>
            <Input placeholder="PAY-{YYYY}-{SEQ}" />
          </div>
          <div className="space-y-2">
            <Label>Default pay cycle</Label>
            <Input placeholder="monthly | biweekly" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Describe payrun defaults" />
          </div>
          <Button className="md:col-span-2" disabled>
            Save (wire Supabase)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}



