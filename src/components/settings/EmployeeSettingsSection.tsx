import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const EmployeeSettingsSection = () => {
  const { toast } = useToast();
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [idFormat, setIdFormat] = useState("EMP-001");
  const [nextNumber, setNextNumber] = useState("024");
  const [prefix, setPrefix] = useState("EMP");
  const [requireApproval, setRequireApproval] = useState(true);
  const [mandatoryFields, setMandatoryFields] = useState({
    nationalId: true,
    socialSecurity: true,
    tin: true,
    bankAccount: true,
    dob: true,
    gender: true,
  });

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('settings').upsert({
        user_id: user?.id || null,
        category: 'employee',
        key: 'auto_generate_ids',
        value: autoGenerate,
      });

      await supabase.from('settings').upsert({
        user_id: user?.id || null,
        category: 'employee',
        key: 'mandatory_fields',
        value: mandatoryFields,
      });

      toast({
        title: "Employee settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save employee settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">EMPLOYEE NUMBERING</h3>
          <div className="space-y-3">
            <Label>Auto-generate Employee IDs</Label>
            <RadioGroup value={autoGenerate ? "yes" : "no"} onValueChange={(v) => setAutoGenerate(v === "yes")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="auto-yes" />
                <Label htmlFor="auto-yes" className="font-normal cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="auto-no" />
                <Label htmlFor="auto-no" className="font-normal cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Format</Label>
              <Select value={idFormat} onValueChange={setIdFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMP-001">EMP-001</SelectItem>
                  <SelectItem value="DEP-001">DEP-001</SelectItem>
                  <SelectItem value="COUNTRY-EMP-001">COUNTRY-EMP-001</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Number</Label>
              <Input value={nextNumber} onChange={(e) => setNextNumber(e.target.value)} />
            </div>
            <div>
              <Label>Prefix</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">ONBOARDING</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="require-approval"
              checked={requireApproval}
              onCheckedChange={(checked) => setRequireApproval(checked as boolean)}
            />
            <Label htmlFor="require-approval" className="font-normal cursor-pointer">
              Require Manager Approval
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">DATA COLLECTION</h3>
          <Label>Mandatory Fields</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="national-id"
                checked={mandatoryFields.nationalId}
                onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, nationalId: checked as boolean }))}
              />
              <Label htmlFor="national-id" className="font-normal cursor-pointer">National ID Number</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="social-security"
                checked={mandatoryFields.socialSecurity}
                onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, socialSecurity: checked as boolean }))}
              />
              <Label htmlFor="social-security" className="font-normal cursor-pointer">Social Security Number</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tin"
                checked={mandatoryFields.tin}
                onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, tin: checked as boolean }))}
              />
              <Label htmlFor="tin" className="font-normal cursor-pointer">TIN (Tax ID)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bank-account"
                checked={mandatoryFields.bankAccount}
                onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, bankAccount: checked as boolean }))}
              />
              <Label htmlFor="bank-account" className="font-normal cursor-pointer">Bank Account Details</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dob"
                checked={mandatoryFields.dob}
                onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, dob: checked as boolean }))}
              />
              <Label htmlFor="dob" className="font-normal cursor-pointer">Date of Birth</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gender"
                checked={mandatoryFields.gender}
                onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, gender: checked as boolean }))}
              />
              <Label htmlFor="gender" className="font-normal cursor-pointer">Gender</Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave}>Save Employee Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
};
