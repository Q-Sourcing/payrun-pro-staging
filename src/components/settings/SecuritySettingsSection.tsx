import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('category', 'security')
      .eq('user_id', user.id)
      .single();

    if (data?.value) {
      const settings = data.value as any;
      setSessionTimeout(settings.sessionTimeout || "30");
      setTwoFactorAuth(settings.twoFactorAuth || "required");
      setPasswordPolicy(settings.passwordPolicy || "strong");
      setAllowBulkOps(settings.allowBulkOps ?? true);
      setAllowPayRunEdit(settings.allowPayRunEdit ?? true);
      setAllowEmployeeCreate(settings.allowEmployeeCreate ?? true);
      setAllowExport(settings.allowExport ?? true);
      setLogUserActions(settings.logUserActions ?? true);
      setLogPayRunChanges(settings.logPayRunChanges ?? true);
      setLogEmployeeChanges(settings.logEmployeeChanges ?? true);
      setRetentionPeriod(settings.retentionPeriod || "2");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const settings = {
      sessionTimeout,
      twoFactorAuth,
      passwordPolicy,
      allowBulkOps,
      allowPayRunEdit,
      allowEmployeeCreate,
      allowExport,
      logUserActions,
      logPayRunChanges,
      logEmployeeChanges,
      retentionPeriod
    };

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        category: 'security',
        key: 'security_settings',
        value: settings
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save security settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Security settings saved successfully"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security & Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">AUTHENTICATION</h3>
          
          <div className="space-y-2">
            <Label>Session Timeout</Label>
            <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Two-Factor Authentication</Label>
            <RadioGroup value={twoFactorAuth} onValueChange={setTwoFactorAuth}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="required" id="2fa-required" />
                <Label htmlFor="2fa-required">Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="optional" id="2fa-optional" />
                <Label htmlFor="2fa-optional">Optional</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Password Policy</Label>
            <Select value={passwordPolicy} onValueChange={setPasswordPolicy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strong">Strong</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">ROLE-BASED ACCESS</h3>
          <div className="space-y-2 text-sm">
            <p>• Administrator (Full access)</p>
            <p>• Payroll Manager (Payroll operations)</p>
            <p>• HR Manager (Employee management)</p>
            <p>• Viewer (Read-only)</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">PERMISSIONS</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="bulk-ops" checked={allowBulkOps} onCheckedChange={(checked) => setAllowBulkOps(checked as boolean)} />
            <Label htmlFor="bulk-ops">Allow bulk operations</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="payrun-edit" checked={allowPayRunEdit} onCheckedChange={(checked) => setAllowPayRunEdit(checked as boolean)} />
            <Label htmlFor="payrun-edit">Allow pay run editing</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="emp-create" checked={allowEmployeeCreate} onCheckedChange={(checked) => setAllowEmployeeCreate(checked as boolean)} />
            <Label htmlFor="emp-create">Allow employee creation</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="export" checked={allowExport} onCheckedChange={(checked) => setAllowExport(checked as boolean)} />
            <Label htmlFor="export">Allow export functionality</Label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">AUDIT LOGGING</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="log-actions" checked={logUserActions} onCheckedChange={(checked) => setLogUserActions(checked as boolean)} />
            <Label htmlFor="log-actions">Log all user actions</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="log-payrun" checked={logPayRunChanges} onCheckedChange={(checked) => setLogPayRunChanges(checked as boolean)} />
            <Label htmlFor="log-payrun">Log pay run changes</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="log-emp" checked={logEmployeeChanges} onCheckedChange={(checked) => setLogEmployeeChanges(checked as boolean)} />
            <Label htmlFor="log-emp">Log employee data changes</Label>
          </div>

          <div className="space-y-2">
            <Label>Retention Period</Label>
            <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 year</SelectItem>
                <SelectItem value="2">2 years</SelectItem>
                <SelectItem value="5">5 years</SelectItem>
                <SelectItem value="10">10 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">Save Security Settings</Button>
      </CardContent>
    </Card>
  );
};
