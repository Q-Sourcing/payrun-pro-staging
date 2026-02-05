import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApprovalWorkflows } from "./PayrollSettings/ApprovalWorkflows";
import { Settings as GearIcon } from "lucide-react";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">Payroll Settings</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenAdvanced?.()}
          title="Advanced Payroll Settings"
          className="hover:bg-slate-100"
        >
          <GearIcon className="h-5 w-5 text-slate-500" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <PayrollAdvancedSettingsModal
          open={showAdvancedModal}
          onClose={() => setShowAdvancedModal(false)}
        />


        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">TAX & COMPLIANCE</h3>

          <div className="space-y-2">
            <Label>Default Tax Percentage (%)</Label>
            <Input
              type="number"
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(e.target.value)}
              min="0"
              max="100"
            />
          </div>

          <div className="space-y-2">
            <Label>Auto-calculate Taxes</Label>
            <RadioGroup value={autoCalculateTax} onValueChange={setAutoCalculateTax}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="auto-tax-yes" />
                <Label htmlFor="auto-tax-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="auto-tax-no" />
                <Label htmlFor="auto-tax-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Tax Rounding</Label>
            <Select value={taxRounding} onValueChange={setTaxRounding}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest whole number</SelectItem>
                <SelectItem value="up">Round up</SelectItem>
                <SelectItem value="down">Round down</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">PAYMENT</h3>

          <div className="space-y-2">
            <Label>Default Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="mobile">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Processing Days</Label>
            <Input
              type="number"
              value={processingDays}
              onChange={(e) => setProcessingDays(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Auto-generate Payment Files</Label>
            <RadioGroup value={autoGenerateFiles} onValueChange={setAutoGenerateFiles}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="auto-files-yes" />
                <Label htmlFor="auto-files-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="auto-files-no" />
                <Label htmlFor="auto-files-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground w-full border-b pb-2">APPROVAL WORKFLOWS</h3>
          <div className="pt-6 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">NOTIFICATIONS & TEMPLATES</h3>
            <PayrollNotificationTemplates />
          </div>
          <ApprovalWorkflows />
        </div>

        <Button onClick={handleSave} className="w-full">Save Payroll Settings</Button>
      </CardContent>
    </Card>
  );
};
