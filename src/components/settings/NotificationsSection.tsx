import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const NotificationsSection = () => {
  const { toast } = useToast();
  const [emailPayRun, setEmailPayRun] = useState("yes");
  const [emailApproval, setEmailApproval] = useState("yes");
  const [emailEmployee, setEmailEmployee] = useState("yes");
  const [emailSystem, setEmailSystem] = useState("yes");
  const [browserNotif, setBrowserNotif] = useState("enabled");
  const [mobileNotif, setMobileNotif] = useState("enabled");
  const [workingHours, setWorkingHours] = useState("08:00-17:00");
  const [workingDays, setWorkingDays] = useState("mon-fri");
  const [quietHours, setQuietHours] = useState("yes");
  const [notifTypes, setNotifTypes] = useState("all");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('category', 'notifications')
      .eq('user_id', user.id)
      .limit(1);

    const settingsRow = data?.[0];

    if (settingsRow?.value) {
      const settings = settingsRow.value as any;
      setEmailPayRun(settings.emailPayRun || "yes");
      setEmailApproval(settings.emailApproval || "yes");
      setEmailEmployee(settings.emailEmployee || "yes");
      setEmailSystem(settings.emailSystem || "yes");
      setBrowserNotif(settings.browserNotif || "enabled");
      setMobileNotif(settings.mobileNotif || "enabled");
      setWorkingHours(settings.workingHours || "08:00-17:00");
      setWorkingDays(settings.workingDays || "mon-fri");
      setQuietHours(settings.quietHours || "yes");
      setNotifTypes(settings.notifTypes || "all");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const settings = {
      emailPayRun,
      emailApproval,
      emailEmployee,
      emailSystem,
      browserNotif,
      mobileNotif,
      workingHours,
      workingDays,
      quietHours,
      notifTypes
    };

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        category: 'notifications',
        key: 'notification_settings',
        value: settings
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Notification settings saved successfully"
      });
    }
  };

  const handleTest = () => {
    toast({
      title: "Test Notification",
      description: "This is a test notification from Q-Payroll"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">EMAIL NOTIFICATIONS</h3>
          
          <div className="space-y-2">
            <Label>Pay Run Status</Label>
            <RadioGroup value={emailPayRun} onValueChange={setEmailPayRun}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="email-payrun-yes" />
                <Label htmlFor="email-payrun-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="email-payrun-no" />
                <Label htmlFor="email-payrun-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Approval Requests</Label>
            <RadioGroup value={emailApproval} onValueChange={setEmailApproval}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="email-approval-yes" />
                <Label htmlFor="email-approval-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="email-approval-no" />
                <Label htmlFor="email-approval-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Employee Updates</Label>
            <RadioGroup value={emailEmployee} onValueChange={setEmailEmployee}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="email-employee-yes" />
                <Label htmlFor="email-employee-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="email-employee-no" />
                <Label htmlFor="email-employee-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>System Alerts</Label>
            <RadioGroup value={emailSystem} onValueChange={setEmailSystem}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="email-system-yes" />
                <Label htmlFor="email-system-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="email-system-no" />
                <Label htmlFor="email-system-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">PUSH NOTIFICATIONS</h3>
          
          <div className="space-y-2">
            <Label>Browser Notifications</Label>
            <RadioGroup value={browserNotif} onValueChange={setBrowserNotif}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enabled" id="browser-enabled" />
                <Label htmlFor="browser-enabled">Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="disabled" id="browser-disabled" />
                <Label htmlFor="browser-disabled">Disabled</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Mobile App Notifications</Label>
            <RadioGroup value={mobileNotif} onValueChange={setMobileNotif}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enabled" id="mobile-enabled" />
                <Label htmlFor="mobile-enabled">Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="disabled" id="mobile-disabled" />
                <Label htmlFor="mobile-disabled">Disabled</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">NOTIFICATION SCHEDULE</h3>
          
          <div className="space-y-2">
            <Label>Working Hours</Label>
            <Select value={workingHours} onValueChange={setWorkingHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="08:00-17:00">08:00 - 17:00</SelectItem>
                <SelectItem value="09:00-18:00">09:00 - 18:00</SelectItem>
                <SelectItem value="07:00-16:00">07:00 - 16:00</SelectItem>
                <SelectItem value="24/7">24/7</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Working Days</Label>
            <Select value={workingDays} onValueChange={setWorkingDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mon-fri">Monday - Friday</SelectItem>
                <SelectItem value="mon-sat">Monday - Saturday</SelectItem>
                <SelectItem value="all-days">All Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quiet Hours</Label>
            <RadioGroup value={quietHours} onValueChange={setQuietHours}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="quiet-yes" />
                <Label htmlFor="quiet-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="quiet-no" />
                <Label htmlFor="quiet-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">NOTIFICATION TYPES</h3>
          
          <RadioGroup value={notifTypes} onValueChange={setNotifTypes}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="notif-all" />
              <Label htmlFor="notif-all">All Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="critical" id="notif-critical" />
              <Label htmlFor="notif-critical">Critical Only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="notif-custom" />
              <Label htmlFor="notif-custom">Custom</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">Save Notification Settings</Button>
          <Button onClick={handleTest} variant="outline">Test Notification</Button>
        </div>
      </CardContent>
    </Card>
  );
};
