import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Smartphone, Clock, Filter } from "lucide-react";

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

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('settings').select('*').eq('category', 'notifications').eq('user_id', user.id).limit(1);
    const settingsRow = data?.[0];
    if (settingsRow?.value) {
      const s = settingsRow.value as any;
      setEmailPayRun(s.emailPayRun || "yes"); setEmailApproval(s.emailApproval || "yes");
      setEmailEmployee(s.emailEmployee || "yes"); setEmailSystem(s.emailSystem || "yes");
      setBrowserNotif(s.browserNotif || "enabled"); setMobileNotif(s.mobileNotif || "enabled");
      setWorkingHours(s.workingHours || "08:00-17:00"); setWorkingDays(s.workingDays || "mon-fri");
      setQuietHours(s.quietHours || "yes"); setNotifTypes(s.notifTypes || "all");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const settings = { emailPayRun, emailApproval, emailEmployee, emailSystem, browserNotif, mobileNotif, workingHours, workingDays, quietHours, notifTypes };
    const { error } = await supabase.from('settings').upsert({ user_id: user.id, category: 'notifications', key: 'notification_settings', value: settings });
    if (error) {
      toast({ title: "Error", description: "Failed to save notification settings", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Notification settings saved successfully" });
    }
  };

  const handleTest = () => { toast({ title: "Test Notification", description: "This is a test notification from Q-Payroll" }); };

  const RadioYesNo = ({ value, onChange, yesId, noId, yesLabel = "Yes", noLabel = "No" }: any) => (
    <RadioGroup value={value} onValueChange={onChange} className="flex gap-6">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="yes" id={yesId} />
        <Label htmlFor={yesId} className="font-normal cursor-pointer">{yesLabel}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="no" id={noId} />
        <Label htmlFor={noId} className="font-normal cursor-pointer">{noLabel}</Label>
      </div>
    </RadioGroup>
  );

  const RadioEnabledDisabled = ({ value, onChange, enabledId, disabledId }: any) => (
    <RadioGroup value={value} onValueChange={onChange} className="flex gap-6">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="enabled" id={enabledId} />
        <Label htmlFor={enabledId} className="font-normal cursor-pointer">Enabled</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="disabled" id={disabledId} />
        <Label htmlFor={disabledId} className="font-normal cursor-pointer">Disabled</Label>
      </div>
    </RadioGroup>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">Email, push notifications, and delivery schedule preferences.</p>
        </div>
        <Button onClick={handleTest} variant="outline" size="sm">Test Notification</Button>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
          <TabsTrigger value="push" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Push</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5"><Filter className="h-3.5 w-3.5" /> Types</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Notifications</CardTitle>
              <CardDescription>Choose which email notifications to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { label: "Pay Run Status", value: emailPayRun, onChange: setEmailPayRun, yesId: "email-payrun-yes", noId: "email-payrun-no" },
                { label: "Approval Requests", value: emailApproval, onChange: setEmailApproval, yesId: "email-approval-yes", noId: "email-approval-no" },
                { label: "Employee Updates", value: emailEmployee, onChange: setEmailEmployee, yesId: "email-employee-yes", noId: "email-employee-no" },
                { label: "System Alerts", value: emailSystem, onChange: setEmailSystem, yesId: "email-system-yes", noId: "email-system-no" },
              ].map(item => (
                <div key={item.yesId} className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</Label>
                  <RadioYesNo value={item.value} onChange={item.onChange} yesId={item.yesId} noId={item.noId} />
                </div>
              ))}
              <Button onClick={handleSave}>Save Email Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Push Notifications</CardTitle>
              <CardDescription>Browser and mobile notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Browser Notifications</Label>
                <RadioEnabledDisabled value={browserNotif} onChange={setBrowserNotif} enabledId="browser-enabled" disabledId="browser-disabled" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mobile App Notifications</Label>
                <RadioEnabledDisabled value={mobileNotif} onChange={setMobileNotif} enabledId="mobile-enabled" disabledId="mobile-disabled" />
              </div>
              <Button onClick={handleSave}>Save Push Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Schedule</CardTitle>
              <CardDescription>Configure when notifications are delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Working Hours</Label>
                  <Select value={workingHours} onValueChange={setWorkingHours}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00-17:00">08:00 - 17:00</SelectItem>
                      <SelectItem value="09:00-18:00">09:00 - 18:00</SelectItem>
                      <SelectItem value="07:00-16:00">07:00 - 16:00</SelectItem>
                      <SelectItem value="24/7">24/7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Working Days</Label>
                  <Select value={workingDays} onValueChange={setWorkingDays}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mon-fri">Monday - Friday</SelectItem>
                      <SelectItem value="mon-sat">Monday - Saturday</SelectItem>
                      <SelectItem value="all-days">All Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quiet Hours</Label>
                <RadioYesNo value={quietHours} onChange={setQuietHours} yesId="quiet-yes" noId="quiet-no" />
              </div>
              <Button onClick={handleSave}>Save Schedule</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Types</CardTitle>
              <CardDescription>Filter which types of notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <RadioGroup value={notifTypes} onValueChange={setNotifTypes} className="space-y-3">
                {[
                  { value: "all", id: "notif-all", label: "All Notifications" },
                  { value: "critical", id: "notif-critical", label: "Critical Only" },
                  { value: "custom", id: "notif-custom", label: "Custom" },
                ].map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                    <RadioGroupItem value={item.value} id={item.id} />
                    <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              <Button onClick={handleSave}>Save Type Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
