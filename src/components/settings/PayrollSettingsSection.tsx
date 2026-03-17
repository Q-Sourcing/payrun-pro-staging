import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApprovalWorkflows } from "./PayrollSettings/ApprovalWorkflows";
import { Settings as GearIcon, Receipt, CreditCard, Bell, GitBranch, Sliders } from "lucide-react";
import { PayrollAdvancedSettingsModal } from "./PayrollSettings/PayrollAdvancedSettingsModal";
import { PayrollNotificationTemplates } from "./PayrollSettings/PayrollNotificationTemplates";

export const PayrollSettingsSection = ({ onOpenAdvanced }: { onOpenAdvanced?: () => void }) => {
  const { toast } = useToast();

  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState("0");
  const [autoCalculateTax, setAutoCalculateTax] = useState("yes");
  const [taxRounding, setTaxRounding] = useState("nearest");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [processingDays, setProcessingDays] = useState("2");
  const [autoGenerateFiles, setAutoGenerateFiles] = useState("yes");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('category', 'payroll')
      .eq('user_id', user.id)
      .limit(1);

    const settingsRow = data?.[0];

    if (settingsRow?.value) {
      const settings = settingsRow.value as any;
      setTaxPercentage(settings.taxPercentage || "0");
      setAutoCalculateTax(settings.autoCalculateTax || "yes");
      setTaxRounding(settings.taxRounding || "nearest");
      setPaymentMethod(settings.paymentMethod || "bank");
      setProcessingDays(settings.processingDays || "2");
      setAutoGenerateFiles(settings.autoGenerateFiles || "yes");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const settings = {
      taxPercentage,
      autoCalculateTax,
      taxRounding,
      paymentMethod,
      processingDays,
      autoGenerateFiles
    };

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        category: 'payroll',
        key: 'payroll_settings',
        value: settings
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save payroll settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Payroll settings saved successfully"
      });
    }
  };

  return (
    <div className="space-y-4">
      <PayrollAdvancedSettingsModal
        open={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Payroll Settings</h2>
          <p className="text-sm text-muted-foreground">Configure payroll processing, tax rules, approvals and notifications.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenAdvanced?.()}
          className="gap-2"
        >
          <GearIcon className="h-4 w-4" />
          Advanced
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Tax & Compliance
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Payment
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Settings</CardTitle>
              <CardDescription>Core payroll configuration and defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Tax Percentage (%)</Label>
                  <Input
                    type="number"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    min="0"
                    max="100"
                    className="h-10 max-w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check / Cheque</SelectItem>
                      <SelectItem value="mobile">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax & Compliance */}
        <TabsContent value="tax" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tax & Compliance</CardTitle>
              <CardDescription>Configure tax calculation rules and compliance settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Tax Percentage (%)</Label>
                  <Input
                    type="number"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    min="0"
                    max="100"
                    className="h-10 max-w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax Rounding</Label>
                  <Select value={taxRounding} onValueChange={setTaxRounding}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nearest">Nearest whole number</SelectItem>
                      <SelectItem value="up">Always round up</SelectItem>
                      <SelectItem value="down">Always round down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-calculate Taxes</Label>
                <RadioGroup value={autoCalculateTax} onValueChange={setAutoCalculateTax} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="auto-tax-yes" />
                    <Label htmlFor="auto-tax-yes" className="font-normal cursor-pointer">Yes — apply tax rules automatically</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="auto-tax-no" />
                    <Label htmlFor="auto-tax-no" className="font-normal cursor-pointer">No — manual tax entry</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave}>Save Tax Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals */}
        <TabsContent value="approvals" className="mt-0">
          <ApprovalWorkflows />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Templates</CardTitle>
              <CardDescription>Configure payroll notification messages</CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollNotificationTemplates />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment</CardTitle>
              <CardDescription>Default payment methods and processing configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check / Cheque</SelectItem>
                      <SelectItem value="mobile">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Processing Days</Label>
                  <Input
                    type="number"
                    value={processingDays}
                    onChange={(e) => setProcessingDays(e.target.value)}
                    min="1"
                    className="h-10 max-w-[200px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-generate Payment Files</Label>
                <RadioGroup value={autoGenerateFiles} onValueChange={setAutoGenerateFiles} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="auto-files-yes" />
                    <Label htmlFor="auto-files-yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="auto-files-no" />
                    <Label htmlFor="auto-files-no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave}>Save Payment Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
