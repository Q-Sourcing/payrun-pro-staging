import React, { useState } from 'react';
import { PayslipTemplate } from './PayslipTemplate';
import { PayslipPreview } from './PayslipPreview';
import { PayslipGenerator } from '@/lib/services/payslip-generator';
import { PayslipPDFExport } from '@/lib/services/payslip-pdf-export';
import { DEFAULT_PAYSLIP_TEMPLATES } from '@/lib/constants/payslip-templates';
import { PayslipData, PayslipTemplateConfig, PayslipExportSettings } from '@/lib/types/payslip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Eye, 
  Palette,
  Settings,
  Star,
  Zap
} from 'lucide-react';

export const PayslipDemo: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('corporate');
  const [sampleData] = useState<PayslipData>(PayslipGenerator.generateSamplePayslipData());
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const template = DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate);
      if (!template) return;

      const exportSettings: PayslipExportSettings = {
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
      };

      await PayslipPDFExport.downloadPDF(
        sampleData,
        template.config,
        exportSettings,
        `payslip-demo-${selectedTemplate}.pdf`
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const template = DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Advanced Payslip Design System</h2>
        <p className="text-muted-foreground text-lg">
          Professional, customizable payslips with automated data integration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Choose Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEFAULT_PAYSLIP_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                    {selectedTemplate === template.id && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Professional Templates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Live Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Custom Branding</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">PDF Export</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Responsive Design</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Security Options</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
              
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Preview Full Screen
              </Button>
              
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Open Designer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {selectedTemplate} Template
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <PayslipPreview
              template={selectedTemplate as 'corporate' | 'minimal' | 'premium'}
              config={template?.config || DEFAULT_PAYSLIP_TEMPLATES[0].config}
              showControls={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Primary Color:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: template?.config.styling.primaryColor }}
                  ></div>
                  <span className="text-sm">{template?.config.styling.primaryColor}</span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Font Family:</span>
                <span className="text-sm ml-2">{template?.config.styling.fontFamily}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Sections:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(template?.config.layout.sections || {})
                    .filter(([_, enabled]) => enabled)
                    .map(([section, _]) => (
                      <Badge key={section} variant="outline" className="text-xs">
                        {section.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Employee:</span>
                <span className="font-medium">{sampleData.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Department:</span>
                <span className="font-medium">{sampleData.employee.subDepartment}</span>
              </div>
              <div className="flex justify-between">
                <span>Gross Pay:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-UG', {
                    style: 'currency',
                    currency: 'UGX',
                    minimumFractionDigits: 0
                  }).format(sampleData.totals.gross)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Net Pay:</span>
                <span className="font-medium text-green-600">
                  {new Intl.NumberFormat('en-UG', {
                    style: 'currency',
                    currency: 'UGX',
                    minimumFractionDigits: 0
                  }).format(sampleData.totals.net)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
