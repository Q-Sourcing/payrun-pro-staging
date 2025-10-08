import React, { useState } from 'react';
import { PayslipTemplateConfig } from '@/lib/types/payslip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Type, 
  Layout, 
  Eye, 
  EyeOff,
  RotateCcw,
  Save
} from 'lucide-react';

interface PayslipCustomizationPanelProps {
  config: PayslipTemplateConfig;
  onConfigChange: (config: PayslipTemplateConfig) => void;
  className?: string;
}

export const PayslipCustomizationPanel: React.FC<PayslipCustomizationPanelProps> = ({
  config,
  onConfigChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'layout' | 'branding'>('colors');

  const handleColorChange = (colorType: string, value: string) => {
    const newConfig = { ...config };
    if (colorType in newConfig.styling) {
      (newConfig.styling as any)[colorType] = value;
      onConfigChange(newConfig);
    }
  };

  const handleTypographyChange = (property: string, value: string) => {
    const newConfig = { ...config };
    if (property in newConfig.styling) {
      (newConfig.styling as any)[property] = value;
      onConfigChange(newConfig);
    }
  };

  const handleLayoutChange = (section: string, enabled: boolean) => {
    const newConfig = { ...config };
    if (section in newConfig.layout.sections) {
      (newConfig.layout.sections as any)[section] = enabled;
      onConfigChange(newConfig);
    }
  };

  const handleBrandingChange = (property: string, value: boolean | string) => {
    const newConfig = { ...config };
    if (property in newConfig.branding) {
      (newConfig.branding as any)[property] = value;
      onConfigChange(newConfig);
    }
  };

  const resetToDefaults = () => {
    // Reset to default template configuration
    onConfigChange(config);
  };

  const tabs = [
    { id: 'colors', label: 'Colors', icon: <Palette className="h-4 w-4" /> },
    { id: 'typography', label: 'Typography', icon: <Type className="h-4 w-4" /> },
    { id: 'layout', label: 'Layout', icon: <Layout className="h-4 w-4" /> },
    { id: 'branding', label: 'Branding', icon: <Eye className="h-4 w-4" /> }
  ];

  return (
    <div className={`customization-panel ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Customize Design
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1"
                >
                  {tab.icon}
                  <span className="ml-1">{tab.label}</span>
                </Button>
              ))}
            </div>

            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={config.styling.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={config.styling.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={config.styling.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={config.styling.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={config.styling.accentColor}
                        onChange={(e) => handleColorChange('accentColor', e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={config.styling.accentColor}
                        onChange={(e) => handleColorChange('accentColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="border-color">Border Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="border-color"
                        type="color"
                        value={config.styling.borderColor}
                        onChange={(e) => handleColorChange('borderColor', e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        value={config.styling.borderColor}
                        onChange={(e) => handleColorChange('borderColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="background-color">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background-color"
                      type="color"
                      value={config.styling.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={config.styling.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Typography Tab */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="font-family">Font Family</Label>
                  <Select
                    value={config.styling.fontFamily}
                    onValueChange={(value) => handleTypographyChange('fontFamily', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                      <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                      <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                      <SelectItem value="Lato, sans-serif">Lato</SelectItem>
                      <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="heading-size">Heading Size</Label>
                    <Select
                      value={config.styling.headingSize}
                      onValueChange={(value) => handleTypographyChange('headingSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.25rem">Small (1.25rem)</SelectItem>
                        <SelectItem value="1.5rem">Medium (1.5rem)</SelectItem>
                        <SelectItem value="1.75rem">Large (1.75rem)</SelectItem>
                        <SelectItem value="2rem">Extra Large (2rem)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="body-size">Body Size</Label>
                    <Select
                      value={config.styling.bodySize}
                      onValueChange={(value) => handleTypographyChange('bodySize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.75rem">Small (0.75rem)</SelectItem>
                        <SelectItem value="0.875rem">Medium (0.875rem)</SelectItem>
                        <SelectItem value="1rem">Large (1rem)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="font-weight-normal">Normal Weight</Label>
                    <Select
                      value={config.styling.fontWeight.normal}
                      onValueChange={(value) => handleTypographyChange('fontWeight.normal', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">Light (300)</SelectItem>
                        <SelectItem value="400">Normal (400)</SelectItem>
                        <SelectItem value="500">Medium (500)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="font-weight-medium">Medium Weight</Label>
                    <Select
                      value={config.styling.fontWeight.medium}
                      onValueChange={(value) => handleTypographyChange('fontWeight.medium', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">Normal (400)</SelectItem>
                        <SelectItem value="500">Medium (500)</SelectItem>
                        <SelectItem value="600">Semi Bold (600)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="font-weight-bold">Bold Weight</Label>
                    <Select
                      value={config.styling.fontWeight.bold}
                      onValueChange={(value) => handleTypographyChange('fontWeight.bold', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="600">Semi Bold (600)</SelectItem>
                        <SelectItem value="700">Bold (700)</SelectItem>
                        <SelectItem value="800">Extra Bold (800)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Sections</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which sections to include in your payslip
                  </p>
                </div>

                <div className="space-y-3">
                  {Object.entries(config.layout.sections).map(([section, enabled]) => (
                    <div key={section} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`section-${section}`} className="capitalize">
                          {section.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <Switch
                        id={`section-${section}`}
                        checked={enabled}
                        onCheckedChange={(checked) => handleLayoutChange(section, checked)}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Header Layout</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-logo">Show Company Logo</Label>
                      <Switch
                        id="show-logo"
                        checked={config.layout.header.showLogo}
                        onCheckedChange={(checked) => {
                          const newConfig = { ...config };
                          newConfig.layout.header.showLogo = checked;
                          onConfigChange(newConfig);
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-company-info">Show Company Info</Label>
                      <Switch
                        id="show-company-info"
                        checked={config.layout.header.showCompanyInfo}
                        onCheckedChange={(checked) => {
                          const newConfig = { ...config };
                          newConfig.layout.header.showCompanyInfo = checked;
                          onConfigChange(newConfig);
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="header-alignment">Header Alignment</Label>
                      <Select
                        value={config.layout.header.alignment}
                        onValueChange={(value: 'left' | 'center' | 'right') => {
                          const newConfig = { ...config };
                          newConfig.layout.header.alignment = value;
                          onConfigChange(newConfig);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-company-logo">Show Company Logo</Label>
                    <Switch
                      id="show-company-logo"
                      checked={config.branding.showCompanyLogo}
                      onCheckedChange={(checked) => handleBrandingChange('showCompanyLogo', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-watermark">Show Watermark</Label>
                    <Switch
                      id="show-watermark"
                      checked={config.branding.showWatermark}
                      onCheckedChange={(checked) => handleBrandingChange('showWatermark', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confidentiality-footer">Confidentiality Footer</Label>
                    <Switch
                      id="confidentiality-footer"
                      checked={config.branding.confidentialityFooter}
                      onCheckedChange={(checked) => handleBrandingChange('confidentialityFooter', checked)}
                    />
                  </div>
                </div>

                {config.branding.showWatermark && (
                  <div>
                    <Label htmlFor="watermark-text">Watermark Text</Label>
                    <Input
                      id="watermark-text"
                      value={config.branding.watermarkText}
                      onChange={(e) => handleBrandingChange('watermarkText', e.target.value)}
                      placeholder="Enter watermark text"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
