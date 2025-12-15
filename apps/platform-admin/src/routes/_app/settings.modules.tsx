import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Cog, Layers } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/settings/modules")({
  component: ModuleSettingsPage,
});

function ModuleSettingsPage() {
  const modules = [
    { name: "IPPMS", description: "Project defaults & attendance rules", to: "/settings/modules/ippms" },
    { name: "Manpower", description: "Rate cards and approvals", to: "/settings/modules/manpower" },
    { name: "Payroll", description: "Payrun numbering & cycles", to: "/settings/modules/payroll" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-semibold">Module Settings</h1>
          <p className="text-sm text-muted-foreground">Manage module defaults and enforcement.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((mod) => (
          <Link key={mod.name} to={mod.to}>
            <Card className="h-full cursor-pointer transition hover:shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-4 w-4" /> {mod.name}
                </CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Open {mod.name} settings
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}


