import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, Download, Trash2 } from "lucide-react";

export const DataManagementSection = () => {
  const { toast } = useToast();
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [backupRetention, setBackupRetention] = useState("30");
  const [backupLocation, setBackupLocation] = useState("cloud");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [includeSensitive, setIncludeSensitive] = useState("yes");
  const [compressExports, setCompressExports] = useState("yes");
  const [autoArchive, setAutoArchive] = useState("yes");
  const [archiveAfter, setArchiveAfter] = useState("12");
  const [deleteDrafts, setDeleteDrafts] = useState("3");

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('settings').select('*').eq('category', 'data_management').eq('user_id', user.id).limit(1);
    const settingsRow = data?.[0];
    if (settingsRow?.value) {
      const s = settingsRow.value as any;
      setBackupFrequency(s.backupFrequency || "daily"); setBackupRetention(s.backupRetention || "30");
      setBackupLocation(s.backupLocation || "cloud"); setExportFormat(s.exportFormat || "pdf");
      setIncludeSensitive(s.includeSensitive || "yes"); setCompressExports(s.compressExports || "yes");
      setAutoArchive(s.autoArchive || "yes"); setArchiveAfter(s.archiveAfter || "12");
      setDeleteDrafts(s.deleteDrafts || "3");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const settings = { backupFrequency, backupRetention, backupLocation, exportFormat, includeSensitive, compressExports, autoArchive, archiveAfter, deleteDrafts };
    const { error } = await supabase.from('settings').upsert({ user_id: user.id, category: 'data_management', key: 'data_management_settings', value: settings });
    if (error) { toast({ title: "Error", description: "Failed to save data management settings", variant: "destructive" }); }
    else { toast({ title: "Success", description: "Data management settings saved successfully" }); }
  };

  const handleBackupNow = () => { toast({ title: "Backup Initiated", description: "Database backup is being created..." }); };
  const handleExportAll = () => { toast({ title: "Export Initiated", description: "Exporting all data..." }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Data Management</h2>
          <p className="text-sm text-muted-foreground">Backup, export, and cleanup configuration.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBackupNow} variant="outline" size="sm">Backup Now</Button>
          <Button onClick={handleExportAll} variant="outline" size="sm">Export All</Button>
        </div>
      </div>

      <Tabs defaultValue="backup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backup" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" /> Backup</TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</TabsTrigger>
          <TabsTrigger value="cleanup" className="gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Cleanup</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Auto-Backup</CardTitle>
              <CardDescription>Configure automatic database backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frequency</Label>
                  <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Retention</Label>
                  <Select value={backupRetention} onValueChange={setBackupRetention}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</Label>
                  <Select value={backupLocation} onValueChange={setBackupLocation}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave}>Save Backup Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Export</CardTitle>
              <CardDescription>Configure default export settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Include Sensitive Data</Label>
                <RadioGroup value={includeSensitive} onValueChange={setIncludeSensitive} className="flex gap-6">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="sensitive-yes" /><Label htmlFor="sensitive-yes" className="font-normal cursor-pointer">Yes</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="sensitive-no" /><Label htmlFor="sensitive-no" className="font-normal cursor-pointer">No</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compress Exports</Label>
                <RadioGroup value={compressExports} onValueChange={setCompressExports} className="flex gap-6">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="compress-yes" /><Label htmlFor="compress-yes" className="font-normal cursor-pointer">Yes</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="compress-no" /><Label htmlFor="compress-no" className="font-normal cursor-pointer">No</Label></div>
                </RadioGroup>
              </div>
              <Button onClick={handleSave}>Save Export Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleanup" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Cleanup</CardTitle>
              <CardDescription>Automatic archival and draft cleanup rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-archive Old Pay Runs</Label>
                <RadioGroup value={autoArchive} onValueChange={setAutoArchive} className="flex gap-6">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="archive-yes" /><Label htmlFor="archive-yes" className="font-normal cursor-pointer">Yes</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="archive-no" /><Label htmlFor="archive-no" className="font-normal cursor-pointer">No</Label></div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Archive After</Label>
                  <Select value={archiveAfter} onValueChange={setArchiveAfter}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delete Drafts After</Label>
                  <Select value={deleteDrafts} onValueChange={setDeleteDrafts}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave}>Save Cleanup Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
