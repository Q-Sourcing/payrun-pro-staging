import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ZohoBooksSection } from "@/components/settings/ZohoBooksSection";
import { Users, Mail, Calculator, Landmark } from "lucide-react";

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

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { void loadZohoStatus(); }, [organizationId]);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('settings').select('*').eq('category', 'integrations').eq('user_id', user.id).limit(1);
    const settingsRow = data?.[0];
    if (settingsRow?.value) {
      const s = settingsRow.value as any;
      setEmailProvider(s.emailProvider || "resend"); setApiKey(s.apiKey || ""); setFromEmail(s.fromEmail || "");
      setQuickbooksStatus(s.quickbooksStatus || "disconnected"); setXeroStatus(s.xeroStatus || "disconnected");
      setStandardBankStatus(s.standardBankStatus || "disconnected"); setStanbicStatus(s.stanbicStatus || "disconnected");
    }
  };

  const loadZohoStatus = async () => {
    if (!organizationId) return;
    const { data: configRows } = await (supabase as any).from("sync_configurations").select("id, enabled, frequency, direction, updated_at").eq("organization_id", organizationId).eq("integration_name", "zoho_people").order("updated_at", { ascending: false }).limit(1);
    const { data: logRows } = await (supabase as any).from("sync_logs").select("status, started_at, completed_at, records_processed, records_failed, metadata").eq("organization_id", organizationId).eq("type", "employees").order("started_at", { ascending: false }).limit(1);
    const config = configRows?.[0];
    setZohoConnected(Boolean(config?.enabled));
    setZohoLastSync(logRows?.[0] || null);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const settings = { emailProvider, apiKey, fromEmail, quickbooksStatus, xeroStatus, standardBankStatus, stanbicStatus };
    const { error } = await supabase.from('settings').upsert({ user_id: user.id, category: 'integrations', key: 'integration_settings', value: settings });
    if (error) { toast({ title: "Error", description: "Failed to save integration settings", variant: "destructive" }); }
    else { toast({ title: "Success", description: "Integration settings saved successfully" }); }
  };

  const handleTestConnection = () => { toast({ title: "Testing Connection", description: "Connection test initiated..." }); };

  const handleConnectZoho = async () => {
    if (!organizationId) { toast({ title: "Organization Required", description: "Select an active organization before connecting Zoho People.", variant: "destructive" }); return; }
    try { setZohoBusy(true); const { authUrl } = await ZohoIntegrationService.startAuth(organizationId); window.open(authUrl, "_blank", "noopener,noreferrer"); } catch (error: any) { toast({ title: "Connection Failed", description: error?.message || "Could not start Zoho authentication.", variant: "destructive" }); setZohoBusy(false); }
  };

  const handlePreviewZoho = async () => {
    if (!organizationId) { toast({ title: "Organization Required", description: "Select an active organization before running Zoho sync.", variant: "destructive" }); return; }
    try { setZohoBusy(true); const result = await ZohoIntegrationService.previewEmployees({ organizationId, mode: zohoMode, previewLimit: 100 }); setZohoSyncSummary(result.summary || null); setZohoPreview(result.preview || null); setZohoPreviewMode(zohoMode); setZohoPreviewOpen(true); toast({ title: "Preview Ready", description: "Review the proposed Zoho employee changes before confirming the sync." }); } catch (error: any) { toast({ title: "Zoho Preview Failed", description: error?.message || "Zoho employee preview failed.", variant: "destructive" }); } finally { setZohoBusy(false); }
  };

  const handleConfirmZohoSync = async () => {
    if (!organizationId) return;
    try { setZohoBusy(true); const result = await ZohoIntegrationService.runEmployeeSync({ organizationId, mode: zohoPreviewMode || zohoMode }); setZohoSyncSummary(result.summary || null); setZohoPreview(null); setZohoPreviewMode(null); setZohoPreviewOpen(false); toast({ title: "Sync Complete", description: "Zoho employee sync finished successfully." }); await loadZohoStatus(); } catch (error: any) { toast({ title: "Zoho Sync Failed", description: error?.message || "Zoho employee sync failed.", variant: "destructive" }); } finally { setZohoBusy(false); }
  };

  const handleDisconnectZoho = async () => {
    if (!organizationId) return;
    try { setZohoBusy(true); await ZohoIntegrationService.disconnect(organizationId); setZohoConnected(false); setZohoLastSync(null); setZohoPreview(null); setZohoPreviewMode(null); setZohoPreviewOpen(false); toast({ title: "Zoho Disconnected", description: "The Zoho People connection has been removed for this organization." }); await loadZohoStatus(); } catch (error: any) { toast({ title: "Disconnect Failed", description: error?.message || "Could not disconnect Zoho People.", variant: "destructive" }); } finally { setZohoBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground">Connect external services for HR sync, email, accounting, and banking.</p>
      </div>

      <Tabs defaultValue="hr" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hr" className="gap-1.5"><Users className="h-3.5 w-3.5" /> HR Sync</TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Service</TabsTrigger>
          <TabsTrigger value="accounting" className="gap-1.5"><Calculator className="h-3.5 w-3.5" /> Accounting</TabsTrigger>
          <TabsTrigger value="banking" className="gap-1.5"><Landmark className="h-3.5 w-3.5" /> Banking</TabsTrigger>
        </TabsList>

        <TabsContent value="hr" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Zoho People HR Sync</CardTitle>
              <CardDescription>Manual employee sync using tenant-scoped Zoho People credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Status:</span>
                <span className={`text-xs font-medium ${zohoConnected ? "text-green-600" : "text-muted-foreground"}`}>{zohoConnected ? "Connected" : "Disconnected"}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sync Mode</Label>
                  <Select value={zohoMode} onValueChange={(value) => setZohoMode(value as ZohoSyncMode)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">Import from Zoho</SelectItem>
                      <SelectItem value="export">Export to Zoho</SelectItem>
                      <SelectItem value="bidirectional">Bidirectional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 text-sm">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Organization</Label>
                  <div className="rounded-md border bg-muted/40 px-3 py-2">{organizationId || "No active organization selected"}</div>
                </div>
              </div>
              {zohoLastSync && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div>Last Sync: <span className="font-medium">{zohoLastSync.status}</span></div>
                  <div>Processed: {zohoLastSync.records_processed ?? 0} · Failed: {zohoLastSync.records_failed ?? 0}</div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleConnectZoho} disabled={zohoBusy || !organizationId}>{zohoConnected ? "Reconnect Zoho" : "Connect Zoho"}</Button>
                <Button variant="outline" onClick={() => void handlePreviewZoho()} disabled={zohoBusy || !zohoConnected}>Preview Changes</Button>
                <Button variant="ghost" onClick={handleDisconnectZoho} disabled={zohoBusy || !zohoConnected}>Disconnect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Service</CardTitle>
              <CardDescription>Configure transactional email provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provider</Label>
                <Select value={emailProvider} onValueChange={setEmailProvider}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API Key</Label>
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter API key" className="h-10 max-w-md" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From Email</Label>
                <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="payroll@qpayroll.com" className="h-10 max-w-md" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save Email Settings</Button>
                <Button onClick={handleTestConnection} variant="outline">Test Connection</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting" className="mt-0">
          <ZohoBooksSection />
        </TabsContent>

        <TabsContent value="banking" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bank Integrations</CardTitle>
              <CardDescription>Connect bank feeds for payment processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Standard Bank", status: standardBankStatus, toggle: () => setStandardBankStatus(standardBankStatus === "connected" ? "disconnected" : "connected") },
                { label: "Stanbic Bank", status: stanbicStatus, toggle: () => setStanbicStatus(stanbicStatus === "connected" ? "disconnected" : "connected") },
                { label: "Custom Bank Feed", status: "configure", toggle: () => {} },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Button variant="outline" size="sm" onClick={item.toggle}>
                    {item.status === "connected" ? "Disconnect" : item.status === "configure" ? "Configure" : "Connect"}
                  </Button>
                </div>
              ))}
              <Button onClick={handleSave}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ZohoSyncPreviewDialog open={zohoPreviewOpen} onOpenChange={setZohoPreviewOpen} mode={zohoPreviewMode || zohoMode} summary={zohoSyncSummary} preview={zohoPreview} confirming={zohoBusy} onConfirm={() => void handleConfirmZohoSync()} />
    </div>
  );
};
