import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Info, LifeBuoy, Scale } from "lucide-react";

export const AboutSection = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">About & Help</h2>
        <p className="text-sm text-muted-foreground">System information, support resources, and legal documents.</p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system" className="gap-1.5"><Info className="h-3.5 w-3.5" /> System</TabsTrigger>
          <TabsTrigger value="support" className="gap-1.5"><LifeBuoy className="h-3.5 w-3.5" /> Support</TabsTrigger>
          <TabsTrigger value="legal" className="gap-1.5"><Scale className="h-3.5 w-3.5" /> Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Information</CardTitle>
              <CardDescription>Current application and server status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">App Version</span>
                  <p className="font-medium mt-1">Q-Payroll v2.1.0</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Last Updated</span>
                  <p className="font-medium mt-1">October 5, 2025</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Database Version</span>
                  <p className="font-medium mt-1">v1.4.2</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">Server Status</span>
                  <p className="font-medium mt-1 text-green-600">✅ Operational</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support</CardTitle>
              <CardDescription>Get help and access documentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {["Help Center", "Contact Support", "Documentation"].map(label => (
                <Button key={label} variant="outline" className="w-full justify-between">
                  {label}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legal</CardTitle>
              <CardDescription>Terms, privacy, and compliance documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {["Terms of Service", "Privacy Policy", "Data Processing Agreement"].map(label => (
                <Button key={label} variant="outline" className="w-full justify-between">
                  {label}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
