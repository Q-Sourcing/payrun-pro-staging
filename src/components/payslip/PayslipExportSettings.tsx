import React, { useState } from 'react';
import { PayslipExportSettings as ExportSettings } from '@/lib/types/payslip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Shield, 
  Settings,
  Eye,
  Lock
} from 'lucide-react';

interface PayslipExportSettingsProps {
  onExport?: (settings: ExportSettings) => void;
  className?: string;
}

export const PayslipExportSettings: React.FC<PayslipExportSettingsProps> = ({
  onExport,
  className = ''
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'A4',
    orientation: 'portrait',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    quality: 'high',
    security: {
      passwordProtected: false,
      password: '',
      watermark: ''
    }
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSecurityChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }));
  };

  const handleMarginChange = (side: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      margin: {
        ...prev.margin,
        [side]: value
      }
    }));
  };

  const handleExport = () => {
    if (onExport) {
      onExport(settings);
    }
  };

  return (
    <div className={`export-settings ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* PDF Format */}
            <div>
              <Label className="text-base font-medium">PDF Format</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="format">Page Size</Label>
                  <Select
                    value={settings.format}
                    onValueChange={(value: 'A4' | 'Letter') => handleSettingChange('format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                      <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orientation">Orientation</Label>
                  <Select
                    value={settings.orientation}
                    onValueChange={(value: 'portrait' | 'landscape') => handleSettingChange('orientation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Margins */}
            <div>
              <Label className="text-base font-medium">Margins</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="margin-top">Top</Label>
                  <Input
                    id="margin-top"
                    value={settings.margin.top}
                    onChange={(e) => handleMarginChange('top', e.target.value)}
                    placeholder="20mm"
                  />
                </div>
                <div>
                  <Label htmlFor="margin-right">Right</Label>
                  <Input
                    id="margin-right"
                    value={settings.margin.right}
                    onChange={(e) => handleMarginChange('right', e.target.value)}
                    placeholder="15mm"
                  />
                </div>
                <div>
                  <Label htmlFor="margin-bottom">Bottom</Label>
                  <Input
                    id="margin-bottom"
                    value={settings.margin.bottom}
                    onChange={(e) => handleMarginChange('bottom', e.target.value)}
                    placeholder="20mm"
                  />
                </div>
                <div>
                  <Label htmlFor="margin-left">Left</Label>
                  <Input
                    id="margin-left"
                    value={settings.margin.left}
                    onChange={(e) => handleMarginChange('left', e.target.value)}
                    placeholder="15mm"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Quality */}
            <div>
              <Label className="text-base font-medium">Quality</Label>
              <Select
                value={settings.quality}
                onValueChange={(value: 'low' | 'medium' | 'high') => handleSettingChange('quality', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Low (Fast, Small File)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Medium (Balanced)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>High (Best Quality)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Security */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </Label>
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <Label htmlFor="password-protect">Password Protection</Label>
                  </div>
                  <Switch
                    id="password-protect"
                    checked={settings.security.passwordProtected}
                    onCheckedChange={(checked) => handleSecurityChange('passwordProtected', checked)}
                  />
                </div>

                {settings.security.passwordProtected && (
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={settings.security.password}
                      onChange={(e) => handleSecurityChange('password', e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="watermark">Watermark Text</Label>
                  <Input
                    id="watermark"
                    value={settings.security.watermark}
                    onChange={(e) => handleSecurityChange('watermark', e.target.value)}
                    placeholder="Enter watermark text (optional)"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Export Actions */}
            <div className="space-y-3">
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Payslip
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>

            {/* Export Info */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Export Information</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• PDF will be generated with your custom template</p>
                <p>• All security settings will be applied</p>
                <p>• File size depends on quality setting</p>
                <p>• Download will start automatically</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
