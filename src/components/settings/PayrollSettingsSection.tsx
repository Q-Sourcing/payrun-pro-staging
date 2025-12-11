import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const PayrollSettingsSection = () => {
  const { toast } = useToast();
  const [payFrequency, setPayFrequency] = useState("monthly");
  const [autoSaveDrafts, setAutoSaveDrafts] = useState("yes");
  const [requireApproval, setRequireApproval] = useState("yes");
  const [approvalChain, setApprovalChain] = useState("single");
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
      setPayFrequency(settings.payFrequency || "monthly");
      setAutoSaveDrafts(settings.autoSaveDrafts || "yes");
      setRequireApproval(settings.requireApproval || "yes");
      setApprovalChain(settings.approvalChain || "single");
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
      payFrequency,
      autoSaveDrafts,
      requireApproval,
      approvalChain,
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
      <CardHeader>
        <CardTitle>Payroll Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">PAY RUN DEFAULTS</h3>
          
          <div className="space-y-2">
            <Label>Default Pay Frequency</Label>
            <Select value={payFrequency} onValueChange={setPayFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Auto-save Drafts</Label>
            <RadioGroup value={autoSaveDrafts} onValueChange={setAutoSaveDrafts}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="auto-save-yes" />
                <Label htmlFor="auto-save-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="auto-save-no" />
                <Label htmlFor="auto-save-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Require Approval</Label>
            <RadioGroup value={requireApproval} onValueChange={setRequireApproval}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="approval-yes" />
                <Label htmlFor="approval-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="approval-no" />
                <Label htmlFor="approval-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Approval Chain</Label>
            <Select value={approvalChain} onValueChange={setApprovalChain}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Approver</SelectItem>
                <SelectItem value="multiple">Multiple Approvers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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

        <Button onClick={handleSave} className="w-full">Save Payroll Settings</Button>
      </CardContent>
    </Card>
  );
};
