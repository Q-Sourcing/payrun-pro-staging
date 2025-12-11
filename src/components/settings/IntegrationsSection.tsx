import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const IntegrationsSection = () => {
  const { toast } = useToast();
  const [emailProvider, setEmailProvider] = useState("resend");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [quickbooksStatus, setQuickbooksStatus] = useState("disconnected");
  const [xeroStatus, setXeroStatus] = useState("disconnected");
  const [standardBankStatus, setStandardBankStatus] = useState("disconnected");
  const [stanbicStatus, setStanbicStatus] = useState("disconnected");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('category', 'integrations')
      .eq('user_id', user.id)
      .limit(1);

    const settingsRow = data?.[0];

    if (settingsRow?.value) {
      const settings = settingsRow.value as any;
      setEmailProvider(settings.emailProvider || "resend");
      setApiKey(settings.apiKey || "");
      setFromEmail(settings.fromEmail || "");
      setQuickbooksStatus(settings.quickbooksStatus || "disconnected");
      setXeroStatus(settings.xeroStatus || "disconnected");
      setStandardBankStatus(settings.standardBankStatus || "disconnected");
      setStanbicStatus(settings.stanbicStatus || "disconnected");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const settings = {
      emailProvider,
      apiKey,
      fromEmail,
      quickbooksStatus,
      xeroStatus,
      standardBankStatus,
      stanbicStatus
    };

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        category: 'integrations',
        key: 'integration_settings',
        value: settings
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save integration settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Integration settings saved successfully"
      });
    }
  };

  const handleTestConnection = () => {
    toast({
      title: "Testing Connection",
      description: "Connection test initiated..."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">EMAIL SERVICE</h3>
          
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={emailProvider} onValueChange={setEmailProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
            />
          </div>

          <div className="space-y-2">
            <Label>From Email</Label>
            <Input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="payroll@qpayroll.com"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">ACCOUNTING SOFTWARE</h3>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">QuickBooks Online</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setQuickbooksStatus(quickbooksStatus === "connected" ? "disconnected" : "connected")}
            >
              {quickbooksStatus === "connected" ? "Disconnect" : "Connect"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Xero</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setXeroStatus(xeroStatus === "connected" ? "disconnected" : "connected")}
            >
              {xeroStatus === "connected" ? "Disconnect" : "Connect"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Custom API</span>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">BANK INTEGRATIONS</h3>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Standard Bank</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setStandardBankStatus(standardBankStatus === "connected" ? "disconnected" : "connected")}
            >
              {standardBankStatus === "connected" ? "Disconnect" : "Connect"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Stanbic Bank</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setStanbicStatus(stanbicStatus === "connected" ? "disconnected" : "connected")}
            >
              {stanbicStatus === "connected" ? "Disconnect" : "Connect"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Custom Bank Feed</span>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">Save Integration Settings</Button>
          <Button onClick={handleTestConnection} variant="outline">Test Connections</Button>
        </div>
      </CardContent>
    </Card>
  );
};
