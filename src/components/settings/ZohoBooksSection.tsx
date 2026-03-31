import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from '@/lib/auth/OrgProvider';
import {
  ZohoBooksService,
  GL_MAPPING_LABELS,
  GL_MAPPING_REQUIRED,
  type GlAccount,
  type GlMappingKey,
  type SavedGlMapping,
  type ZohoBooksConnectionStatus,
} from "@/lib/services/zoho-books.service";
import { CheckCircle2, XCircle, RefreshCw, ExternalLink, Loader2, BookOpen } from "lucide-react";

const GL_MAPPING_KEYS: GlMappingKey[] = [
  "gross_pay",
  "paye_tax",
  "nssf_employee",
  "nssf_employer",
  "benefit_deductions",
  "net_pay",
];

export const ZohoBooksSection = () => {
  const { toast } = useToast();
  const { companyId } = useOrg();

  const [connectionStatus, setConnectionStatus] = useState<ZohoBooksConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [accounts, setAccounts] = useState<GlAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const [savedMappings, setSavedMappings] = useState<SavedGlMapping[]>([]);
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!companyId) return;
    setStatusLoading(true);
    try {
      const status = await ZohoBooksService.getConnectionStatus(companyId);
      setConnectionStatus(status);
    } catch (e: any) {
      console.error(e);
    } finally {
      setStatusLoading(false);
    }
  }, [companyId]);

  const loadAccounts = useCallback(async () => {
    if (!companyId || !connectionStatus?.connected) return;
    setAccountsLoading(true);
    try {
      const accs = await ZohoBooksService.getAccounts(companyId);
      setAccounts(accs.filter((a) => a.isActive));
    } catch (e: any) {
      toast({ title: "Could not load chart of accounts", description: e.message, variant: "destructive" });
    } finally {
      setAccountsLoading(false);
    }
  }, [companyId, connectionStatus?.connected]);

  const loadMappings = useCallback(async () => {
    if (!companyId) return;
    try {
      const mappings = await ZohoBooksService.getGlMappings(companyId);
      setSavedMappings(mappings);
    } catch (e: any) {
      console.error(e);
    }
  }, [companyId]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (connectionStatus?.connected) {
      void loadAccounts();
      void loadMappings();
    }
  }, [connectionStatus?.connected, loadAccounts, loadMappings]);

  const handleConnect = async () => {
    if (!companyId) {
      toast({ title: "No active company", description: "Select a company first.", variant: "destructive" });
      return;
    }
    try {
      setConnecting(true);
      const { authUrl } = await ZohoBooksService.startAuth(companyId);
      const popup = window.open(authUrl, "_blank", "noopener,noreferrer,width=600,height=700");
      // Poll for connection (popup closes after callback)
      const poll = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(poll);
          setConnecting(false);
          await loadStatus();
        }
      }, 1000);
    } catch (e: any) {
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!companyId) return;
    try {
      setDisconnecting(true);
      await ZohoBooksService.disconnect(companyId);
      setConnectionStatus({ connected: false, zohoBooksOrgName: null, zohoBooksOrgId: null, connectedAt: null });
      setAccounts([]);
      setSavedMappings([]);
      toast({ title: "Zoho Books disconnected" });
    } catch (e: any) {
      toast({ title: "Disconnect failed", description: e.message, variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveMapping = async (mappingKey: GlMappingKey) => {
    if (!companyId) return;
    const accountId = pendingMappings[mappingKey];
    if (!accountId) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setSavingKey(mappingKey);
    try {
      await ZohoBooksService.saveGlMapping(companyId, mappingKey, account.id, account.name);
      await loadMappings();
      setPendingMappings((prev) => { const next = { ...prev }; delete next[mappingKey]; return next; });
      toast({ title: "Mapping saved", description: `${GL_MAPPING_LABELS[mappingKey]} → ${account.name}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  const getSavedMapping = (key: string) => savedMappings.find((m) => m.mapping_key === key);

  const mappingComplete = GL_MAPPING_REQUIRED.every((k) => getSavedMapping(k));

  if (!companyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Zoho Books
          </CardTitle>
          <CardDescription>Connect your accounting platform to push payroll journals automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select an active company to manage Zoho Books settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Zoho Books
        </CardTitle>
        <CardDescription>
          Push approved payroll journal entries directly to Zoho Books. Each company connects to its own Books subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection status */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {statusLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : connectionStatus?.connected ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {connectionStatus?.connected
                ? connectionStatus.zohoBooksOrgName
                  ? `Connected — ${connectionStatus.zohoBooksOrgName}`
                  : "Connected"
                : "Not connected"}
            </span>
            {connectionStatus?.connected && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadStatus()}
              disabled={statusLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin" : ""}`} />
            </Button>
            {connectionStatus?.connected ? (
              <>
                <Button size="sm" variant="outline" onClick={() => void handleConnect()} disabled={connecting}>
                  Reconnect
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleDisconnect()}
                  disabled={disconnecting}
                  className="text-destructive hover:text-destructive"
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => void handleConnect()} disabled={connecting}>
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Connect Zoho Books
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {connectionStatus?.connected && (
          <>
            <Separator />

            {/* GL Account Mapping */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold">GL Account Mapping</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Map each payroll component to a Zoho Books account. Required fields are marked *.
                  {!mappingComplete && (
                    <span className="text-amber-600 ml-1">Complete required mappings before pushing journals.</span>
                  )}
                </p>
              </div>

              {accountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading chart of accounts…
                </div>
              ) : (
                <div className="space-y-2">
                  {GL_MAPPING_KEYS.map((key) => {
                    const isRequired = GL_MAPPING_REQUIRED.includes(key);
                    const saved = getSavedMapping(key);
                    const pending = pendingMappings[key];
                    const isSaving = savingKey === key;
                    const hasPending = !!pending && pending !== saved?.zoho_account_id;

                    return (
                      <div key={key} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-medium">{GL_MAPPING_LABELS[key as GlMappingKey]}</span>
                            {isRequired && <span className="text-destructive text-xs">*</span>}
                            {saved && !hasPending && (
                              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            )}
                          </div>
                          <Select
                            value={pending ?? saved?.zoho_account_id ?? ""}
                            onValueChange={(val) => setPendingMappings((prev) => ({ ...prev, [key]: val }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select an account…" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                  {acc.code ? `${acc.code} — ` : ""}{acc.name}
                                  <span className="ml-1.5 text-muted-foreground">({acc.type})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          variant={hasPending ? "default" : "outline"}
                          disabled={!hasPending || isSaving}
                          onClick={() => void handleSaveMapping(key)}
                          className="shrink-0 h-8 text-xs mt-5"
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {mappingComplete && (
              <>
                <Separator />
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
                  GL mapping complete. Approved pay runs can now be pushed to Zoho Books from the pay run details view.
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
