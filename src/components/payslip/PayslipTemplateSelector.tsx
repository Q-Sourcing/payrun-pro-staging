import React from 'react';
import { PayslipTemplate } from '@/lib/types/payslip';
import { DEFAULT_PAYSLIP_TEMPLATES } from '@/lib/constants/payslip-templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Palette, Layout, Zap } from 'lucide-react';

interface PayslipTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  className?: string;
}

export const PayslipTemplateSelector: React.FC<PayslipTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  className = ''
}) => {
  const templateFeatures = {
    corporate: {
      icon: <Layout className="h-5 w-5" />,
      features: ['Professional Header', 'Company Branding', 'Detailed Breakdown', 'Confidentiality Footer'],
      color: 'bg-blue-500'
    },
    minimal: {
      icon: <Palette className="h-5 w-5" />,
      features: ['Clean Design', 'Simple Layout', 'Easy to Read', 'Mobile Friendly'],
      color: 'bg-gray-500'
    },
    premium: {
      icon: <Star className="h-5 w-5" />,
      features: ['Premium Design', 'Gradient Accents', 'Enhanced Branding', 'Full Features'],
      color: 'bg-purple-500'
    }
  };

  const getTemplateFeatures = (templateId: string) => {
    return templateFeatures[templateId as keyof typeof templateFeatures] || templateFeatures.corporate;
  };

  return (
    <div className={`template-selector ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Choose Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {DEFAULT_PAYSLIP_TEMPLATES.map((template) => {
              const features = getTemplateFeatures(template.id);
              const isSelected = selectedTemplate === template.id;
              
              return (
                <Card 
                  key={template.id}
                  className={`template-card cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => onTemplateChange(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${features.color} text-white`}>
                          {features.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            {isSelected && (
                              <Badge variant="default" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {features.features.map((feature, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTemplateChange(template.id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Selected
                          </>
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Pro Tip</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Start with a template and customize it to match your company's branding. 
              You can always switch templates and your customizations will be preserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
