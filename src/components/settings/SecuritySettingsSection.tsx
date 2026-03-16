import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Shield, ScrollText } from "lucide-react";

export const SecuritySettingsSection = () => {
  const { toast } = useToast();
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [twoFactorAuth, setTwoFactorAuth] = useState("required");
  const [passwordPolicy, setPasswordPolicy] = useState("strong");
  const [allowBulkOps, setAllowBulkOps] = useState(true);
  const [allowPayRunEdit, setAllowPayRunEdit] = useState(true);
  const [allowEmployeeCreate, setAllowEmployeeCreate] = useState(true);
  const [allowExport, setAllowExport] = useState(true);
  const [logUserActions, setLogUserActions] = useState(true);
  const [logPayRunChanges, setLogPayRunChanges] = useState(true);
  const [logEmployeeChanges, setLogEmployeeChanges] = useState(true);
  const [retentionPeriod, setRetentionPeriod] = useState("2");

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('settings').select('*').eq('category', 'security').eq('user_id', user.id).limit(1);
    const settingsRow = data?.[0];
    if (settingsRow?.value) {
      const s = settingsRow.value as any;
      setSessionTimeout(s.sessionTimeout || "30");
      setTwoFactorAuth(s.twoFactorAuth || "required");
      setPasswordPolicy(s.passwordPolicy || "strong");
      setAllowBulkOps(s.allowBulkOps ?? true);
      setAllowPayRunEdit(s.allowPayRunEdit ?? true);
      setAllowEmployeeCreate(s.allowEmployeeCreate ?? true);
      setAllowExport(s.allowExport ?? true);
      setLogUserActions(s.logUserActions ?? true);
      setLogPayRunChanges(s.logPayRunChanges ?? true);
      setLogEmployeeChanges(s.logEmployeeChanges ?? true);
      setRetentionPeriod(s.retentionPeriod || "2");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const settings = { sessionTimeout, twoFactorAuth, passwordPolicy, allowBulkOps, allowPayRunEdit, allowEmployeeCreate, allowExport, logUserActions, logPayRunChanges, logEmployeeChanges, retentionPeriod };
    const { error } = await supabase.from('settings').upsert({ user_id: user.id, category: 'security', key: 'security_settings', value: settings });
    if (error) {
      toast({ title: "Error", description: "Failed to save security settings", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Security settings saved successfully" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Security & Access</h2>
        <p className="text-sm text-muted-foreground">Authentication, permissions, and audit logging configuration.</p>
      </div>

      <Tabs defaultValue="authentication" className="space-y-4">
        <TabsList>
          <TabsTrigger value="authentication" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Audit Logging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authentication</CardTitle>
              <CardDescription>Session, 2FA, and password policy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session Timeout</Label>
                <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Two-Factor Authentication</Label>
                <RadioGroup value={twoFactorAuth} onValueChange={setTwoFactorAuth} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="required" id="2fa-required" />
                    <Label htmlFor="2fa-required" className="font-normal cursor-pointer">Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="2fa-optional" />
                    <Label htmlFor="2fa-optional" className="font-normal cursor-pointer">Optional</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password Policy</Label>
                <Select value={passwordPolicy} onValueChange={setPasswordPolicy}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong">Strong</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave}>Save Authentication Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissions</CardTitle>
              <CardDescription>Control what actions users can perform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role-Based Access</h3>
                <div className="space-y-2 text-sm p-4 rounded-lg bg-muted/50 border border-border">
                  <p>• Administrator (Full access)</p>
                  <p>• Payroll Manager (Payroll operations)</p>
                  <p>• HR Manager (Employee management)</p>
                  <p>• Viewer (Read-only)</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { id: "bulk-ops", label: "Allow bulk operations", checked: allowBulkOps, onChange: setAllowBulkOps },
                  { id: "payrun-edit", label: "Allow pay run editing", checked: allowPayRunEdit, onChange: setAllowPayRunEdit },
                  { id: "emp-create", label: "Allow employee creation", checked: allowEmployeeCreate, onChange: setAllowEmployeeCreate },
                  { id: "export", label: "Allow export functionality", checked: allowExport, onChange: setAllowExport },
                ].map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                    <Checkbox id={item.id} checked={item.checked} onCheckedChange={(checked) => item.onChange(checked as boolean)} />
                    <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
              <Button onClick={handleSave}>Save Permissions</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Logging</CardTitle>
              <CardDescription>Configure what activities are tracked</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                {[
                  { id: "log-actions", label: "Log all user actions", checked: logUserActions, onChange: setLogUserActions },
                  { id: "log-payrun", label: "Log pay run changes", checked: logPayRunChanges, onChange: setLogPayRunChanges },
                  { id: "log-emp", label: "Log employee data changes", checked: logEmployeeChanges, onChange: setLogEmployeeChanges },
                ].map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                    <Checkbox id={item.id} checked={item.checked} onCheckedChange={(checked) => item.onChange(checked as boolean)} />
                    <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Retention Period</Label>
                <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 year</SelectItem>
                    <SelectItem value="2">2 years</SelectItem>
                    <SelectItem value="5">5 years</SelectItem>
                    <SelectItem value="10">10 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave}>Save Audit Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
