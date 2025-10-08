import React, { useState } from 'react';
import { PayslipDesigner } from '@/components/payslip/PayslipDesigner';
import { PayslipTemplateConfig } from '@/lib/types/payslip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Palette, 
  Download, 
  Settings,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const PayslipDesignerSection: React.FC = () => {
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [savedConfig, setSavedConfig] = useState<PayslipTemplateConfig | null>(null);
  const { toast } = useToast();

  const handleSave = (config: PayslipTemplateConfig) => {
    setSavedConfig(config);
    toast({
      title: "Payslip Template Saved",
      description: "Your custom payslip template has been saved successfully.",
    });
  };

  const handleExport = (config: PayslipTemplateConfig) => {
    toast({
      title: "Export Started",
      description: "Your payslip template is being exported. Download will start shortly.",
    });
  };

  if (isDesignerOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Payslip Designer</h2>
            <p className="text-muted-foreground">
              Create and customize professional payslip templates
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsDesignerOpen(false)}
          >
            Back to Settings
          </Button>
        </div>
        
        <PayslipDesigner
          onSave={handleSave}
          onExport={handleExport}
          initialConfig={savedConfig || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payslip Designer</h2>
        <p className="text-muted-foreground">
          Create professional, branded payslips with our advanced design system
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Templates Available</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Palette className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Customization Options</p>
                <p className="text-2xl font-bold">15+</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Download className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Export Formats</p>
                <p className="text-2xl font-bold">PDF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Design Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Professional Templates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Custom Color Schemes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Typography Controls</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Layout Customization</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Company Branding</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Advanced Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Live Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Drag & Drop Interface</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">PDF Export</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Template Management</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Security Options</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Template Status */}
      {savedConfig && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            You have a custom payslip template saved. 
            <Button
              variant="link"
              className="p-0 h-auto ml-1"
              onClick={() => setIsDesignerOpen(true)}
            >
              Edit template
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Template Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Template Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 rounded mb-3 flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold">Professional Corporate</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Clean, professional design with company branding
              </p>
              <Badge variant="outline" className="text-xs">Corporate</Badge>
            </div>

            <div className="border rounded-lg p-4">
              <div className="aspect-video bg-gradient-to-br from-gray-500 to-gray-600 rounded mb-3 flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold">Minimal Modern</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Simple, clean design focused on readability
              </p>
              <Badge variant="outline" className="text-xs">Minimal</Badge>
            </div>

            <div className="border rounded-lg p-4">
              <div className="aspect-video bg-gradient-to-br from-purple-500 to-purple-600 rounded mb-3 flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold">Branded Premium</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Premium design with gradient accents and enhanced branding
              </p>
              <Badge variant="outline" className="text-xs">Premium</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium">Choose a Template</h4>
                <p className="text-sm text-muted-foreground">
                  Start with one of our professional templates or create from scratch
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium">Customize Design</h4>
                <p className="text-sm text-muted-foreground">
                  Adjust colors, typography, layout, and branding to match your company
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium">Preview & Export</h4>
                <p className="text-sm text-muted-foreground">
                  Preview your design and export as PDF with your preferred settings
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={() => setIsDesignerOpen(true)}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              Open Payslip Designer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
