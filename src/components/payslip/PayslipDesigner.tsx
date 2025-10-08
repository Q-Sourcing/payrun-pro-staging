import React, { useState, useCallback } from 'react';
import { PayslipTemplateConfig, PayslipDesignerState } from '@/lib/types/payslip';
import { PayslipPreview } from './PayslipPreview';
import { PayslipTemplateSelector } from './PayslipTemplateSelector';
import { PayslipCustomizationPanel } from './PayslipCustomizationPanel';
import { PayslipExportSettings } from './PayslipExportSettings';
import { DEFAULT_PAYSLIP_TEMPLATES, DEFAULT_PAYSLIP_CONFIG } from '@/lib/constants/payslip-templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Layout, 
  Settings, 
  Download, 
  Save, 
  Undo, 
  Redo,
  Eye,
  Code
} from 'lucide-react';

interface PayslipDesignerProps {
  onSave?: (config: PayslipTemplateConfig) => void;
  onExport?: (config: PayslipTemplateConfig) => void;
  initialConfig?: PayslipTemplateConfig;
  className?: string;
}

export const PayslipDesigner: React.FC<PayslipDesignerProps> = ({
  onSave,
  onExport,
  initialConfig = DEFAULT_PAYSLIP_CONFIG,
  className = ''
}) => {
  const [designerState, setDesignerState] = useState<PayslipDesignerState>({
    selectedTemplate: 'corporate',
    customConfig: initialConfig,
    previewScale: 1,
    isPreviewMode: false
  });

  const [history, setHistory] = useState<PayslipTemplateConfig[]>([initialConfig]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const handleTemplateChange = useCallback((templateId: string) => {
    const template = DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newConfig = { ...template.config };
      setDesignerState(prev => ({
        ...prev,
        selectedTemplate: templateId,
        customConfig: newConfig
      }));
      addToHistory(newConfig);
    }
  }, []);

  const handleConfigChange = useCallback((newConfig: PayslipTemplateConfig) => {
    setDesignerState(prev => ({
      ...prev,
      customConfig: newConfig
    }));
    addToHistory(newConfig);
  }, []);

  const addToHistory = (config: PayslipTemplateConfig) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(config);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDesignerState(prev => ({
        ...prev,
        customConfig: history[newIndex]
      }));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDesignerState(prev => ({
        ...prev,
        customConfig: history[newIndex]
      }));
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(designerState.customConfig);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(designerState.customConfig);
    }
  };

  const handlePreviewToggle = () => {
    setDesignerState(prev => ({
      ...prev,
      isPreviewMode: !prev.isPreviewMode
    }));
  };

  return (
    <div className={`payslip-designer ${className}`}>
      <div className="designer-header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Payslip Designer</h2>
            <p className="text-muted-foreground">
              Create and customize professional payslip templates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex === 0}
            >
              <Undo className="h-4 w-4 mr-1" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
            >
              <Redo className="h-4 w-4 mr-1" />
              Redo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewToggle}
            >
              <Eye className="h-4 w-4 mr-1" />
              {designerState.isPreviewMode ? 'Design' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="designer-layout">
        {designerState.isPreviewMode ? (
          <div className="preview-mode">
            <PayslipPreview
              template={designerState.selectedTemplate as 'corporate' | 'minimal' | 'premium'}
              config={designerState.customConfig}
              showControls={true}
              className="w-full"
            />
          </div>
        ) : (
          <div className="designer-grid">
            <div className="designer-sidebar">
              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="templates">
                    <Layout className="h-4 w-4 mr-1" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="customize">
                    <Palette className="h-4 w-4 mr-1" />
                    Customize
                  </TabsTrigger>
                  <TabsTrigger value="export">
                    <Settings className="h-4 w-4 mr-1" />
                    Export
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="mt-4">
                  <PayslipTemplateSelector
                    selectedTemplate={designerState.selectedTemplate}
                    onTemplateChange={handleTemplateChange}
                  />
                </TabsContent>

                <TabsContent value="customize" className="mt-4">
                  <PayslipCustomizationPanel
                    config={designerState.customConfig}
                    onConfigChange={handleConfigChange}
                  />
                </TabsContent>

                <TabsContent value="export" className="mt-4">
                  <PayslipExportSettings
                    onExport={handleExport}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="designer-canvas">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Live Preview
                    </CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {designerState.selectedTemplate} Template
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="preview-container">
                    <PayslipPreview
                      template={designerState.selectedTemplate as 'corporate' | 'minimal' | 'premium'}
                      config={designerState.customConfig}
                      showControls={false}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
