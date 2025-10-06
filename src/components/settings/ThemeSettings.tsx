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
import { Sun, Moon, Monitor, Eye } from "lucide-react";

export const ThemeSettings = () => {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme();
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
        { category: 'theme', key: 'high_contrast', value: highContrast },
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
        <div className="space-y-4">
          <Label className="text-base font-semibold">Theme Mode</Label>
          <RadioGroup value={theme} onValueChange={(value: any) => setTheme(value)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Light Mode Preview */}
              <div 
                className={`theme-preview-card preview-light cursor-pointer transition-all duration-300 ${
                  theme === 'light' ? 'active' : ''
                }`}
                onClick={() => setTheme('light')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <Label className="font-semibold cursor-pointer">Light Mode</Label>
                  </div>
                  <RadioGroupItem value="light" id="light" />
                </div>
              <div className="space-y-3">
                <div className="preview-sidebar-sample light">
                  <div className="preview-sidebar-header"></div>
                  <div className="preview-menu-item"></div>
                  <div className="preview-menu-item"></div>
                  <div className="preview-menu-item"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-3 bg-white border border-gray-200 rounded"></div>
                  <div className="h-3 bg-teal-600 rounded"></div>
                  <div className="h-3 bg-gray-100 border border-gray-200 rounded"></div>
                </div>
                <p className="text-xs text-gray-600">Clean white sidebar with glass effects</p>
              </div>
              </div>

              {/* Dark Mode Preview */}
              <div 
                className={`theme-preview-card preview-dark cursor-pointer transition-all duration-300 ${
                  theme === 'dark' ? 'active' : ''
                }`}
                onClick={() => setTheme('dark')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Moon className="h-4 w-4 text-blue-400" />
                    <Label className="font-semibold cursor-pointer">Dark Mode</Label>
                  </div>
                  <RadioGroupItem value="dark" id="dark" />
                </div>
              <div className="space-y-3">
                <div className="preview-sidebar-sample dark">
                  <div className="preview-sidebar-header"></div>
                  <div className="preview-menu-item"></div>
                  <div className="preview-menu-item"></div>
                  <div className="preview-menu-item"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-3 bg-slate-900 border border-slate-700 rounded"></div>
                  <div className="h-3 bg-teal-600 rounded"></div>
                  <div className="h-3 bg-slate-800 border border-slate-600 rounded"></div>
                </div>
                <p className="text-xs text-gray-400">Enhanced WCAG compliant dark</p>
              </div>
              </div>
            </div>

            {/* System Preference */}
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="system" id="system" />
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <Label htmlFor="system" className="font-normal cursor-pointer">Auto (System Preference)</Label>
                </div>
              </div>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-gradient-to-r from-white to-slate-900 border border-gray-300 rounded"></div>
                <div className="w-4 h-4 bg-gradient-to-r from-teal-600 to-amber-400 rounded"></div>
                <div className="w-4 h-4 bg-gradient-to-r from-gray-100 to-slate-800 border border-gray-300 rounded"></div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <Label className="text-base font-semibold">High Contrast Mode</Label>
            </div>
            <Switch checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
          <p className="text-sm text-muted-foreground">
            Increases color contrast for better readability and accessibility.
          </p>
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
            setHighContrast(false);
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
