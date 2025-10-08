import React, { useState } from 'react';
import { PayslipTemplate } from './PayslipTemplate';
import { PayslipData, PayslipTemplateConfig } from '@/lib/types/payslip';
import { PayslipGenerator } from '@/lib/services/payslip-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye } from 'lucide-react';

interface PayslipPreviewProps {
  template: 'corporate' | 'minimal' | 'premium';
  config: PayslipTemplateConfig;
  data?: PayslipData;
  showControls?: boolean;
  className?: string;
}

export const PayslipPreview: React.FC<PayslipPreviewProps> = ({
  template,
  config,
  data,
  showControls = true,
  className = ''
}) => {
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sampleData] = useState<PayslipData>(data || PayslipGenerator.generateSamplePayslipData());

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    // This would trigger PDF generation
    console.log('Download payslip as PDF');
  };

  const scaleOptions = [
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.25, label: '125%' },
    { value: 1.5, label: '150%' }
  ];

  const previewContent = (
    <div 
      className={`payslip-preview-container ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        transition: 'transform 0.2s ease'
      }}
    >
      <PayslipTemplate
        data={sampleData}
        config={config}
        template={template}
        className="payslip-preview"
      />
    </div>
  );

  if (!showControls) {
    return (
      <div className={`payslip-preview-wrapper ${className}`}>
        {previewContent}
      </div>
    );
  }

  return (
    <div className={`payslip-preview-wrapper ${className}`}>
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {template} Template
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Scale:</span>
              <div className="flex gap-1">
                {scaleOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={scale === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleScaleChange(option.value)}
                    className="h-8 px-3"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(1)}
                className="h-8 px-3"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreen}
                className="h-8 px-3"
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 px-3"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={`preview-container ${isFullscreen ? 'fullscreen' : ''}`}>
        {previewContent}
      </div>
    </div>
  );
};
