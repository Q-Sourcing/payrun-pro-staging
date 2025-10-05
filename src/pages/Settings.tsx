import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/ui/theme-provider";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [primary, setPrimary] = useState("#117288");
  const [secondary, setSecondary] = useState("#faa71c");
  const [mode, setMode] = useState(theme);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-1 space-y-2">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">Navigation</div>
            <ul className="space-y-1">
              <li>🏢 Company Settings</li>
              <li>👥 Employee Settings</li>
              <li>💰 Payroll Settings</li>
              <li>📊 Display & Theme</li>
              <li>🔐 Security & Access</li>
              <li>📧 Notifications</li>
              <li>🔄 Integrations</li>
              <li>📁 Data Management</li>
              <li>ℹ️ About & Help</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-3 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Display & Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Theme Mode</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => setTheme(mode)}>Apply Mode</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
              <div>
                <Label>Secondary Color</Label>
                <Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
              </div>
            </div>

            <div className="rounded-md border p-4" style={{
              background: "var(--surface)",
              color: "var(--text)",
              borderColor: "rgba(0,0,0,0.1)",
            }}>
              <div className="text-sm mb-2">Live Preview</div>
              <Button style={{ background: primary, color: '#fff' }} className="mr-2">Primary</Button>
              <Button style={{ background: secondary, color: '#000' }} variant="secondary">Secondary</Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setTheme(mode)}>Save Theme Settings</Button>
              <Button variant="outline" onClick={() => { setMode('light'); setTheme('light'); }}>Reset to Default</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;


