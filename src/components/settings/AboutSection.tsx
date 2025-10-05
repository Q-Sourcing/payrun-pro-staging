import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const AboutSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About & Help</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">SYSTEM INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">App Version:</span>
              <span className="ml-2 font-medium">Q-Payroll v2.1.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="ml-2 font-medium">October 5, 2025</span>
            </div>
            <div>
              <span className="text-muted-foreground">Database Version:</span>
              <span className="ml-2 font-medium">v1.4.2</span>
            </div>
            <div>
              <span className="text-muted-foreground">Server Status:</span>
              <span className="ml-2 font-medium text-green-600">✅ Operational</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">SUPPORT</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-between">
              Help Center
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Contact Support
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Documentation
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">LEGAL</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-between">
              Terms of Service
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Privacy Policy
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Data Processing Agreement
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
