import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApprovalWorkflows } from "./PayrollSettings/ApprovalWorkflows";
import { Settings as GearIcon, Receipt, CreditCard, Bell, GitBranch } from "lucide-react";
import { PayrollAdvancedSettingsModal } from "./PayrollSettings/PayrollAdvancedSettingsModal";
import { PayrollNotificationTemplates } from "./PayrollSettings/PayrollNotificationTemplates";

export const PayrollSettingsSection = ({ onOpenAdvanced }: { onOpenAdvanced?: () => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

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
    <div className="space-y-6">
      <PayrollAdvancedSettingsModal
        open={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
      />

      {/* Tax & Compliance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Tax & Compliance</CardTitle>
                <CardDescription>Configure tax calculation rules and compliance settings</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenAdvanced?.()}
              title="Advanced Payroll Settings"
            >
              <GearIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
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
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Payment</CardTitle>
              <CardDescription>Default payment methods and processing configuration</CardDescription>
            </div>
          </div>
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
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notification Templates</CardTitle>
              <CardDescription>Configure payroll notification messages</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PayrollNotificationTemplates />
        </CardContent>
      </Card>

      {/* Approval Workflows */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Approval Workflows</CardTitle>
              <CardDescription>Multi-level payroll approval chains</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ApprovalWorkflows />
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} size="lg">Save Payroll Settings</Button>
      </div>
    </div>
  );
};
