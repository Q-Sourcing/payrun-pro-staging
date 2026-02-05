export interface PayslipData {
  employee: {
    code: string;
    name: string;
    jobTitle: string;
    subDepartment: string;
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
  expatriateDetails?: {
    isExpatriate: boolean;
    foreignCurrency: string;
    foreignAmount: number;
    localAmount: number;
    exchangeRate: number;
    dailyRate: number;
    daysWorked: number;
    allowances: number;
    taxCountry: string;
  };
}

export interface PayslipTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  config: PayslipTemplateConfig;
}

export interface PayslipTemplateConfig {
  layout: {
    header: {
      showLogo: boolean;
      showCompanyInfo: boolean;
      alignment: 'left' | 'center' | 'right';
    };
    sections: {
      employeeInfo: boolean;
      payPeriod: boolean;
      earnings: boolean;
      deductions: boolean;
      contributions: boolean;
      totals: boolean;
      leave: boolean;
      expatriateDetails: boolean;
    };
    order: string[];
  };
  styling: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderColor: string;
    fontFamily: string;
    headingSize: string;
    bodySize: string;
    smallSize: string;
    fontWeight: {
      normal: string;
      medium: string;
      bold: string;
    };
  };
  branding: {
    showCompanyLogo: boolean;
    showWatermark: boolean;
    watermarkText: string;
    confidentialityFooter: boolean;
  };
}

export interface PayslipDesignerState {
  selectedTemplate: string;
  customConfig: PayslipTemplateConfig;
  previewScale: number;
  isPreviewMode: boolean;
}

export interface PayslipExportSettings {
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
