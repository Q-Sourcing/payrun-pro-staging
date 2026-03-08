import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import {
  ZohoIntegrationService,
  type ZohoSyncMode,
  type ZohoSyncPreview,
  type ZohoSyncSummary,
} from "@/lib/services/zoho-integration.service";
import { ZohoSyncPreviewDialog } from "@/components/settings/ZohoSyncPreviewDialog";

export const IntegrationsSection = () => {
  const { toast } = useToast();
  const { organizationId } = useOrg();
  const [emailProvider, setEmailProvider] = useState("resend");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [quickbooksStatus, setQuickbooksStatus] = useState("disconnected");
  const [xeroStatus, setXeroStatus] = useState("disconnected");
  const [standardBankStatus, setStandardBankStatus] = useState("disconnected");
  const [stanbicStatus, setStanbicStatus] = useState("disconnected");
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoMode, setZohoMode] = useState<ZohoSyncMode>("import");
  const [zohoBusy, setZohoBusy] = useState(false);
  const [zohoLastSync, setZohoLastSync] = useState<any>(null);
  const [zohoSyncSummary, setZohoSyncSummary] = useState<ZohoSyncSummary | null>(null);
  const [zohoPreview, setZohoPreview] = useState<ZohoSyncPreview | null>(null);
  const [zohoPreviewOpen, setZohoPreviewOpen] = useState(false);
  const [zohoPreviewMode, setZohoPreviewMode] = useState<ZohoSyncMode | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    void loadZohoStatus();
  }, [organizationId]);

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

  const loadZohoStatus = async () => {
    if (!organizationId) return;

    const { data: configRows } = await (supabase as any)
      .from("sync_configurations")
      .select("id, enabled, frequency, direction, updated_at")
      .eq("organization_id", organizationId)
      .eq("integration_name", "zoho_people")
      .order("updated_at", { ascending: false })
      .limit(1);

    const { data: logRows } = await (supabase as any)
      .from("sync_logs")
      .select("status, started_at, completed_at, records_processed, records_failed, metadata")
      .eq("organization_id", organizationId)
      .eq("type", "employees")
      .order("started_at", { ascending: false })
      .limit(1);

    const config = configRows?.[0];
    setZohoConnected(Boolean(config?.enabled));
    setZohoLastSync(logRows?.[0] || null);
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

  const handleConnectZoho = async () => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an active organization before connecting Zoho People.",
        variant: "destructive",
      });
      return;
    }

    try {
      setZohoBusy(true);
      const { authUrl } = await ZohoIntegrationService.startAuth(organizationId);
      window.open(authUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error?.message || "Could not start Zoho authentication.",
        variant: "destructive",
      });
      setZohoBusy(false);
    }
  };

  const handlePreviewZoho = async () => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an active organization before running Zoho sync.",
        variant: "destructive",
      });
      return;
    }

    try {
      setZohoBusy(true);
      const result = await ZohoIntegrationService.previewEmployees({
        organizationId,
        mode: zohoMode,
        previewLimit: 100,
      });
      setZohoSyncSummary(result.summary || null);
      setZohoPreview(result.preview || null);
      setZohoPreviewMode(zohoMode);
      setZohoPreviewOpen(true);
      toast({
        title: "Preview Ready",
        description: "Review the proposed Zoho employee changes before confirming the sync.",
      });
    } catch (error: any) {
      toast({
        title: "Zoho Preview Failed",
        description: error?.message || "Zoho employee preview failed.",
        variant: "destructive",
      });
    } finally {
      setZohoBusy(false);
    }
  };

  const handleConfirmZohoSync = async () => {
    if (!organizationId) return;

    try {
      setZohoBusy(true);
      const result = await ZohoIntegrationService.runEmployeeSync({
        organizationId,
        mode: zohoPreviewMode || zohoMode,
      });
      setZohoSyncSummary(result.summary || null);
      setZohoPreview(null);
      setZohoPreviewMode(null);
      setZohoPreviewOpen(false);
      toast({
        title: "Sync Complete",
        description: "Zoho employee sync finished successfully.",
      });
      await loadZohoStatus();
    } catch (error: any) {
      toast({
        title: "Zoho Sync Failed",
        description: error?.message || "Zoho employee sync failed.",
        variant: "destructive",
      });
    } finally {
      setZohoBusy(false);
    }
  };

  const handleDisconnectZoho = async () => {
    if (!organizationId) return;

    try {
      setZohoBusy(true);
      await ZohoIntegrationService.disconnect(organizationId);
      setZohoConnected(false);
      setZohoLastSync(null);
      setZohoPreview(null);
      setZohoPreviewMode(null);
      setZohoPreviewOpen(false);
      toast({
        title: "Zoho Disconnected",
        description: "The Zoho People connection has been removed for this organization.",
      });
      await loadZohoStatus();
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error?.message || "Could not disconnect Zoho People.",
        variant: "destructive",
      });
    } finally {
      setZohoBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">ZOHO PEOPLE</h3>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Zoho People HR Sync</p>
                <p className="text-sm text-muted-foreground">
                  Manual employee sync using tenant-scoped Zoho People credentials and Zoho Employee ID mapping.
                </p>
              </div>
              <div className={`text-xs font-medium ${zohoConnected ? "text-green-600" : "text-muted-foreground"}`}>
                {zohoConnected ? "Connected" : "Disconnected"}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sync Mode</Label>
                <Select value={zohoMode} onValueChange={(value) => setZohoMode(value as ZohoSyncMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">Import from Zoho</SelectItem>
                    <SelectItem value="export">Export to Zoho</SelectItem>
                    <SelectItem value="bidirectional">Bidirectional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-sm">
                <Label>Active Organization</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  {organizationId || "No active organization selected"}
                </div>
              </div>
            </div>

            {zohoLastSync && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div>Last Sync Status: <span className="font-medium">{zohoLastSync.status}</span></div>
                <div>Started: {zohoLastSync.started_at || "—"}</div>
                <div>Processed: {zohoLastSync.records_processed ?? 0} · Failed: {zohoLastSync.records_failed ?? 0}</div>
              </div>
            )}

            {zohoSyncSummary && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="font-medium">Latest Preview</div>
                <div className="text-muted-foreground">
                  Import: {zohoSyncSummary.imported.created} create · {zohoSyncSummary.imported.updated} update · {zohoSyncSummary.imported.skipped} skip · {zohoSyncSummary.imported.failed} error
                </div>
                <div className="text-muted-foreground">
                  Export: {zohoSyncSummary.exported.updated} update · {zohoSyncSummary.exported.skipped} skip · {zohoSyncSummary.exported.failed} error
                </div>
                {zohoPreview?.truncated ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Showing {zohoPreview.rows.length} of {zohoPreview.totalRows} preview rows in the dialog.
                  </div>
                ) : null}
                {zohoSyncSummary.warnings.length > 0 ? (
                  <div className="mt-2 text-xs text-amber-700">
                    {zohoSyncSummary.warnings.length} warning{zohoSyncSummary.warnings.length === 1 ? "" : "s"} detected.
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleConnectZoho} disabled={zohoBusy || !organizationId}>
                {zohoConnected ? "Reconnect Zoho" : "Connect Zoho"}
              </Button>
              <Button variant="outline" onClick={() => void handlePreviewZoho()} disabled={zohoBusy || !zohoConnected}>
                Preview Changes
              </Button>
              <Button variant="ghost" onClick={handleDisconnectZoho} disabled={zohoBusy || !zohoConnected}>
                Disconnect
              </Button>
            </div>
          </div>
        </div>

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
      <ZohoSyncPreviewDialog
        open={zohoPreviewOpen}
        onOpenChange={setZohoPreviewOpen}
        mode={zohoPreviewMode || zohoMode}
        summary={zohoSyncSummary}
        preview={zohoPreview}
        confirming={zohoBusy}
        onConfirm={() => void handleConfirmZohoSync()}
      />
    </Card>
  );
};
