# Advanced Payslip Design System

## Overview

The Advanced Payslip Design System is a comprehensive solution for creating professional, branded payslips with automated data integration and extensive customization options. Built with modern React components and TypeScript, it provides a powerful drag-and-drop interface for designing payslips that match your company's branding.

## Features

### 🎨 Professional Templates
- **Corporate Template**: Clean, professional design with company branding
- **Minimal Template**: Simple, clean design focused on readability
- **Premium Template**: Premium design with gradient accents and enhanced branding

### 🛠️ Advanced Customization
- **Color Schemes**: Customize primary, secondary, accent, and background colors
- **Typography**: Control font family, sizes, and weights
- **Layout**: Enable/disable sections and reorder content
- **Branding**: Company logo, watermarks, and confidentiality settings

### 📱 Responsive Design
- Mobile-friendly payslip layouts
- Print-optimized styling
- Cross-browser compatibility

### 🔒 Security Features
- Password protection for sensitive payslips
- Watermark support
- Confidentiality footers
- Export security options

### 📊 Data Integration
- Automated data mapping from payroll systems
- Real-time preview with sample data
- Support for multiple currencies and formats

## Architecture

### Core Components

```
src/components/payslip/
├── PayslipTemplate.tsx          # Main template renderer
├── PayslipPreview.tsx           # Live preview component
├── PayslipDesigner.tsx          # Drag & drop designer interface
├── PayslipTemplateSelector.tsx  # Template selection
├── PayslipCustomizationPanel.tsx # Customization controls
├── PayslipExportSettings.tsx    # Export configuration
└── PayslipDemo.tsx             # Demo component
```

### Services

```
src/lib/services/
├── payslip-generator.ts         # Data generation and mapping
├── payslip-pdf-export.ts       # PDF generation and export
└── payslip-template-manager.ts  # Template management
```

### Types

```
src/lib/types/
└── payslip.ts                  # TypeScript interfaces
```

## Usage

### Basic Implementation

```tsx
import { PayslipTemplate } from '@/components/payslip/PayslipTemplate';
import { PayslipGenerator } from '@/lib/services/payslip-generator';

const MyComponent = () => {
  const [payslipData, setPayslipData] = useState(null);

  useEffect(() => {
    // Generate sample data
    const data = PayslipGenerator.generateSamplePayslipData();
    setPayslipData(data);
  }, []);

  return (
    <PayslipTemplate
      data={payslipData}
      config={templateConfig}
      template="corporate"
    />
  );
};
```

### Using the Designer

```tsx
import { PayslipDesigner } from '@/components/payslip/PayslipDesigner';

const DesignerPage = () => {
  const handleSave = (config) => {
    // Save template configuration
    console.log('Template saved:', config);
  };

  const handleExport = (config) => {
    // Export payslip
    console.log('Exporting with config:', config);
  };

  return (
    <PayslipDesigner
      onSave={handleSave}
      onExport={handleExport}
    />
  );
};
```

### PDF Export

```tsx
import { PayslipPDFExport } from '@/lib/services/payslip-pdf-export';

const exportPayslip = async () => {
  const exportSettings = {
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
    payslipData,
    templateConfig,
    exportSettings,
    'payslip.pdf'
  );
};
```

## Template Configuration

### Layout Configuration

```typescript
const layoutConfig = {
  header: {
    showLogo: true,
    showCompanyInfo: true,
    alignment: 'center' // 'left' | 'center' | 'right'
  },
  sections: {
    employeeInfo: true,
    payPeriod: true,
    earnings: true,
    deductions: true,
    contributions: true,
    totals: true,
    leave: false
  },
  order: ['employeeInfo', 'payPeriod', 'earnings', 'deductions', 'contributions', 'totals']
};
```

### Styling Configuration

```typescript
const stylingConfig = {
  primaryColor: '#0e7288',
  secondaryColor: '#f6ba15',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  accentColor: '#10b981',
  borderColor: '#e2e8f0',
  fontFamily: 'Inter, sans-serif',
  headingSize: '1.75rem',
  bodySize: '0.875rem',
  smallSize: '0.75rem',
  fontWeight: {
    normal: '400',
    medium: '500',
    bold: '600'
  }
};
```

### Branding Configuration

```typescript
const brandingConfig = {
  showCompanyLogo: true,
  showWatermark: false,
  watermarkText: '',
  confidentialityFooter: true
};
```

## Data Structure

### PayslipData Interface

```typescript
interface PayslipData {
  employee: {
    code: string;
    name: string;
    jobTitle: string;
    department: string;
    hireDate: string;
    nssfNo: string;
    tin: string;
    bank: {
      name: string;
      account: string;
    };
  };
  company: {
    name: string;
    address: string;
    email: string;
    logo: string;
  };
  payPeriod: {
    start: string;
    end: string;
    display: string;
  };
  earnings: Array<{
    description: string;
    amount: number;
  }>;
  deductions: Array<{
    description: string;
    amount: number;
  }>;
  contributions: {
    nssf: {
      company: number;
      employee: number;
      total: number;
    };
    privatePension: {
      company: number;
      employee: number;
      total: number;
    };
  };
  totals: {
    gross: number;
    deductions: number;
    net: number;
  };
  leave: {
    taken: number;
    due: number;
  };
}
```

## Database Schema

### Payslip Templates Table

```sql
CREATE TABLE public.payslip_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Payslip Generations Log

```sql
CREATE TABLE public.payslip_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.payslip_templates(id) ON DELETE CASCADE,
    pay_run_id UUID REFERENCES public.pay_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    export_format TEXT NOT NULL DEFAULT 'pdf',
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id)
);
```

## Integration with Existing System

### Settings Integration

The payslip designer is integrated into the main settings page:

```tsx
// In Settings.tsx
case "payslip-designer":
  return <PayslipDesignerSection />;
```

### Payroll Integration

The system integrates with existing payroll data:

```typescript
// Generate payslip data from pay run
const payslipData = await PayslipGenerator.generatePayslipData(
  payRunId,
  employeeId
);
```

## Customization Options

### Color Customization
- Primary color for headers and accents
- Secondary color for secondary text
- Background color for the payslip
- Text color for main content
- Accent color for highlights
- Border color for separators

### Typography Customization
- Font family selection
- Heading sizes
- Body text sizes
- Font weights (normal, medium, bold)

### Layout Customization
- Section visibility toggles
- Section ordering
- Header layout options
- Company logo placement

### Branding Customization
- Company logo display
- Watermark options
- Confidentiality footer
- Custom styling

## Export Options

### PDF Export Settings

```typescript
interface PayslipExportSettings {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  quality: 'low' | 'medium' | 'high';
  security: {
    passwordProtected: boolean;
    password?: string;
    watermark?: string;
  };
}
```

### Export Features
- High-quality PDF generation
- Multiple page formats (A4, Letter)
- Custom margins
- Security options (password protection, watermarks)
- Batch export for multiple employees

## Best Practices

### Template Design
1. Keep designs clean and professional
2. Ensure good contrast for readability
3. Use consistent spacing and alignment
4. Test on different screen sizes
5. Consider print requirements

### Data Integration
1. Validate data before rendering
2. Handle missing data gracefully
3. Format currency consistently
4. Use appropriate date formats
5. Ensure data privacy compliance

### Performance
1. Use React.memo for expensive components
2. Implement lazy loading for large datasets
3. Optimize PDF generation
4. Cache template configurations
5. Use efficient data structures

## Troubleshooting

### Common Issues

1. **Template not rendering**: Check if all required data is provided
2. **PDF generation fails**: Verify jsPDF dependencies are installed
3. **Styling issues**: Ensure CSS is properly imported
4. **Data mapping errors**: Check data structure matches interface

### Debug Mode

Enable debug mode to see detailed logging:

```typescript
const debugMode = process.env.NODE_ENV === 'development';
```

## Future Enhancements

- [ ] Email integration for automatic payslip delivery
- [ ] Advanced template editor with drag-and-drop
- [ ] Multi-language support
- [ ] Advanced security features
- [ ] Template marketplace
- [ ] Analytics and usage tracking
- [ ] Mobile app integration
- [ ] API for third-party integrations

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

## License

This payslip design system is part of the Q-Payroll application and follows the same licensing terms.
