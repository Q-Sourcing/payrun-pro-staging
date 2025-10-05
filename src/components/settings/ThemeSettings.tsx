import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ui/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ThemeSettings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [uiDensity, setUiDensity] = useState("comfortable");
  const [fontSize, setFontSize] = useState("medium");
  const [rowsPerPage, setRowsPerPage] = useState("25");
  const [showImages, setShowImages] = useState(true);
  const [alternateRows, setAlternateRows] = useState(true);

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const settings = [
        { category: 'theme', key: 'mode', value: theme },
        { category: 'theme', key: 'ui_density', value: uiDensity },
        { category: 'theme', key: 'font_size', value: fontSize },
        { category: 'theme', key: 'rows_per_page', value: rowsPerPage },
        { category: 'theme', key: 'show_images', value: showImages },
        { category: 'theme', key: 'alternate_rows', value: alternateRows },
      ];

      for (const setting of settings) {
        await supabase.from('settings').upsert({
          user_id: user?.id || null,
          category: setting.category,
          key: setting.key,
          value: setting.value,
        });
      }

      toast({
        title: "Theme settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save your theme preferences.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display & Theme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Theme Mode</Label>
          <RadioGroup value={theme} onValueChange={(value: any) => setTheme(value)} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="font-normal cursor-pointer">Light Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="font-normal cursor-pointer">Dark Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="font-normal cursor-pointer">Auto (System Preference)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">UI Density</Label>
          <RadioGroup value={uiDensity} onValueChange={setUiDensity} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="compact" id="compact" />
              <Label htmlFor="compact" className="font-normal cursor-pointer">Compact (More content on screen)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comfortable" id="comfortable" />
              <Label htmlFor="comfortable" className="font-normal cursor-pointer">Comfortable (Recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="spacious" id="spacious" />
              <Label htmlFor="spacious" className="font-normal cursor-pointer">Spacious (Larger touch targets)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Font Size</Label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rows Per Page</Label>
            <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Show Images in Tables</Label>
            <Switch checked={showImages} onCheckedChange={setShowImages} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Alternate Row Colors</Label>
            <Switch checked={alternateRows} onCheckedChange={setAlternateRows} />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave}>Save Theme Settings</Button>
          <Button variant="outline" onClick={() => {
            setTheme('light');
            setUiDensity('comfortable');
            setFontSize('medium');
            setRowsPerPage('25');
            setShowImages(true);
            setAlternateRows(true);
          }}>Reset to Default</Button>
        </div>
      </CardContent>
    </Card>
  );
};
