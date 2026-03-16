import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/ui/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Monitor, Eye, Palette, LayoutGrid, Table } from "lucide-react";

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
        await supabase.from('settings').upsert({ user_id: user?.id || null, category: setting.category, key: setting.key, value: setting.value });
      }
      toast({ title: "Theme settings saved", description: "Your preferences have been updated successfully." });
    } catch (error) {
      toast({ title: "Error saving settings", description: "Failed to save your theme preferences.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setTheme('light'); setHighContrast(false); setUiDensity('comfortable');
    setFontSize('medium'); setRowsPerPage('25'); setShowImages(true); setAlternateRows(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Display & Theme</h2>
        <p className="text-sm text-muted-foreground">Customize appearance, layout density, and table display preferences.</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="layout" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Layout</TabsTrigger>
          <TabsTrigger value="tables" className="gap-1.5"><Table className="h-3.5 w-3.5" /> Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Theme Mode</CardTitle>
              <CardDescription>Choose your preferred color scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={theme} onValueChange={(value: any) => setTheme(value)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`theme-preview-card preview-light cursor-pointer transition-all duration-300 ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2"><Sun className="h-4 w-4 text-amber-500" /><Label className="font-semibold cursor-pointer">Light Mode</Label></div>
                      <RadioGroupItem value="light" id="light" />
                    </div>
                    <div className="space-y-3">
                      <div className="preview-sidebar-sample light"><div className="preview-sidebar-header"></div><div className="preview-menu-item"></div><div className="preview-menu-item"></div><div className="preview-menu-item"></div></div>
                      <div className="grid grid-cols-3 gap-2"><div className="h-3 bg-white border border-gray-200 rounded"></div><div className="h-3 bg-teal-600 rounded"></div><div className="h-3 bg-gray-100 border border-gray-200 rounded"></div></div>
                      <p className="text-xs text-gray-600">Clean white sidebar with glass effects</p>
                    </div>
                  </div>
                  <div className={`theme-preview-card preview-dark cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2"><Moon className="h-4 w-4 text-blue-400" /><Label className="font-semibold cursor-pointer">Dark Mode</Label></div>
                      <RadioGroupItem value="dark" id="dark" />
                    </div>
                    <div className="space-y-3">
                      <div className="preview-sidebar-sample dark"><div className="preview-sidebar-header"></div><div className="preview-menu-item"></div><div className="preview-menu-item"></div><div className="preview-menu-item"></div></div>
                      <div className="grid grid-cols-3 gap-2"><div className="h-3 bg-slate-900 border border-slate-700 rounded"></div><div className="h-3 bg-teal-600 rounded"></div><div className="h-3 bg-slate-800 border border-slate-600 rounded"></div></div>
                      <p className="text-xs text-gray-400">Enhanced WCAG compliant dark</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="system" id="system" />
                    <div className="flex items-center space-x-2"><Monitor className="h-4 w-4" /><Label htmlFor="system" className="font-normal cursor-pointer">Auto (System Preference)</Label></div>
                  </div>
                </div>
              </RadioGroup>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2"><Eye className="h-4 w-4" /><Label className="text-base font-semibold">High Contrast Mode</Label></div>
                  <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                </div>
                <p className="text-sm text-muted-foreground">Increases color contrast for better readability and accessibility.</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={handleReset}>Reset to Default</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Layout & Density</CardTitle>
              <CardDescription>Control spacing and font size</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">UI Density</Label>
                <RadioGroup value={uiDensity} onValueChange={setUiDensity} className="space-y-2">
                  {[
                    { value: "compact", label: "Compact (More content on screen)" },
                    { value: "comfortable", label: "Comfortable (Recommended)" },
                    { value: "spacious", label: "Spacious (Larger touch targets)" },
                  ].map(item => (
                    <div key={item.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                      <RadioGroupItem value={item.value} id={item.value} />
                      <Label htmlFor={item.value} className="font-normal cursor-pointer">{item.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Font Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave}>Save Layout Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Table Display</CardTitle>
              <CardDescription>Configure how data tables appear</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rows Per Page</Label>
                <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                  <SelectTrigger className="h-10 max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label>Show Images in Tables</Label>
                  <Switch checked={showImages} onCheckedChange={setShowImages} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label>Alternate Row Colors</Label>
                  <Switch checked={alternateRows} onCheckedChange={setAlternateRows} />
                </div>
              </div>
              <Button onClick={handleSave}>Save Table Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
