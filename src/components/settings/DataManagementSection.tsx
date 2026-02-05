import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('category', 'data_management')
      .eq('user_id', user.id)
      .limit(1);

    const settingsRow = data?.[0];

    if (settingsRow?.value) {
      const settings = settingsRow.value as any;
      setBackupFrequency(settings.backupFrequency || "daily");
      setBackupRetention(settings.backupRetention || "30");
      setBackupLocation(settings.backupLocation || "cloud");
      setExportFormat(settings.exportFormat || "pdf");
      setIncludeSensitive(settings.includeSensitive || "yes");
      setCompressExports(settings.compressExports || "yes");
      setAutoArchive(settings.autoArchive || "yes");
      setArchiveAfter(settings.archiveAfter || "12");
      setDeleteDrafts(settings.deleteDrafts || "3");
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const settings = {
      backupFrequency,
      backupRetention,
      backupLocation,
      exportFormat,
      includeSensitive,
      compressExports,
      autoArchive,
      archiveAfter,
      deleteDrafts
    };

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        category: 'data_management',
        key: 'data_management_settings',
        value: settings
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save data management settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Data management settings saved successfully"
      });
    }
  };

  const handleBackupNow = () => {
    toast({
      title: "Backup Initiated",
      description: "Database backup is being created..."
    });
  };

  const handleExportAll = () => {
    toast({
      title: "Export Initiated",
      description: "Exporting all data..."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">AUTO-BACKUP</h3>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={backupFrequency} onValueChange={setBackupFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Retention</Label>
            <Select value={backupRetention} onValueChange={setBackupRetention}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Backup Location</Label>
            <Select value={backupLocation} onValueChange={setBackupLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloud">Cloud Storage</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">DATA EXPORT</h3>

          <div className="space-y-2">
            <Label>Default Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Include Sensitive Data</Label>
            <RadioGroup value={includeSensitive} onValueChange={setIncludeSensitive}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="sensitive-yes" />
                <Label htmlFor="sensitive-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="sensitive-no" />
                <Label htmlFor="sensitive-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Compress Exports</Label>
            <RadioGroup value={compressExports} onValueChange={setCompressExports}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="compress-yes" />
                <Label htmlFor="compress-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="compress-no" />
                <Label htmlFor="compress-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">DATA CLEANUP</h3>

          <div className="space-y-2">
            <Label>Auto-archive Old Pay Runs</Label>
            <RadioGroup value={autoArchive} onValueChange={setAutoArchive}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="archive-yes" />
                <Label htmlFor="archive-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="archive-no" />
                <Label htmlFor="archive-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Archive After</Label>
            <Select value={archiveAfter} onValueChange={setArchiveAfter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Delete Drafts After</Label>
            <Select value={deleteDrafts} onValueChange={setDeleteDrafts}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 month</SelectItem>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleBackupNow} variant="outline">Backup Now</Button>
          <Button onClick={handleExportAll} variant="outline">Export All Data</Button>
          <Button onClick={handleSave} className="flex-1">Save Data Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
};
