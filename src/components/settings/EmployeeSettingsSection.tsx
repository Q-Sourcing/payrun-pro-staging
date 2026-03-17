import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Hash, UserPlus, ClipboardList } from "lucide-react";

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
      await supabase.from('settings').upsert({ user_id: user?.id || null, category: 'employee', key: 'auto_generate_ids', value: autoGenerate });
      await supabase.from('settings').upsert({ user_id: user?.id || null, category: 'employee', key: 'mandatory_fields', value: mandatoryFields });
      toast({ title: "Employee settings saved", description: "Your preferences have been updated successfully." });
    } catch (error) {
      toast({ title: "Error saving settings", description: "Failed to save employee settings.", variant: "destructive" });
    }
  };

  const mandatoryFieldItems = [
    { key: 'nationalId' as const, label: 'National ID Number' },
    { key: 'socialSecurity' as const, label: 'Social Security Number (NSSF)' },
    { key: 'tin' as const, label: 'TIN (Tax Identification Number)' },
    { key: 'bankAccount' as const, label: 'Bank Account Details' },
    { key: 'dob' as const, label: 'Date of Birth' },
    { key: 'gender' as const, label: 'Gender' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Employee Settings</h2>
        <p className="text-sm text-muted-foreground">Configure employee numbering, onboarding, and data collection rules.</p>
      </div>

      <Tabs defaultValue="numbering" className="space-y-4">
        <TabsList>
          <TabsTrigger value="numbering" className="gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            Numbering
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Data Collection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="numbering" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employee Numbering</CardTitle>
              <CardDescription>Configure automatic employee ID generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-generate Employee IDs</Label>
                <RadioGroup value={autoGenerate ? "yes" : "no"} onValueChange={(v) => setAutoGenerate(v === "yes")} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="auto-yes" />
                    <Label htmlFor="auto-yes" className="font-normal cursor-pointer">Yes — system assigns IDs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="auto-no" />
                    <Label htmlFor="auto-no" className="font-normal cursor-pointer">No — manual entry</Label>
                  </div>
                </RadioGroup>
              </div>
              {autoGenerate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Format</Label>
                    <Select value={idFormat} onValueChange={setIdFormat}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMP-001">EMP-001</SelectItem>
                        <SelectItem value="DEP-001">DEP-001</SelectItem>
                        <SelectItem value="COUNTRY-EMP-001">COUNTRY-EMP-001</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Number</Label>
                    <Input value={nextNumber} onChange={(e) => setNextNumber(e.target.value)} className="h-10 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prefix</Label>
                    <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="h-10 font-mono" />
                  </div>
                </div>
              )}
              <Button onClick={handleSave}>Save Numbering Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Onboarding</CardTitle>
              <CardDescription>New employee onboarding workflow settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border border-border">
                <Checkbox id="require-approval" checked={requireApproval} onCheckedChange={(checked) => setRequireApproval(checked as boolean)} className="mt-0.5" />
                <div>
                  <Label htmlFor="require-approval" className="font-medium cursor-pointer">Require Manager Approval</Label>
                  <p className="text-xs text-muted-foreground mt-1">New employees must be approved by their reporting manager before being fully activated</p>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleSave}>Save Onboarding Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Collection</CardTitle>
              <CardDescription>Define which fields are mandatory during employee registration</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">Mandatory Fields</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mandatoryFieldItems.map(item => (
                  <div key={item.key} className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <Checkbox id={item.key} checked={mandatoryFields[item.key]} onCheckedChange={(checked) => setMandatoryFields(prev => ({ ...prev, [item.key]: checked as boolean }))} />
                    <Label htmlFor={item.key} className="font-normal cursor-pointer text-sm flex-1">{item.label}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button onClick={handleSave}>Save Data Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
