import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/support/impersonation")({
  component: ImpersonationPage,
});

function ImpersonationPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserCircle2 className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-semibold">Impersonation</h1>
          <p className="text-sm text-muted-foreground">
            Generate impersonation tokens for tenant admins (placeholder).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
          <CardDescription>Choose tenant and admin to impersonate.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Input placeholder="Tenant ID or name" />
          </div>
          <div className="space-y-2">
            <Label>Tenant Admin</Label>
            <Input placeholder="Admin user email" />
          </div>
          <Button className="md:col-span-2">
            <KeyRound className="mr-2 h-4 w-4" />
            Generate Token (placeholder)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


