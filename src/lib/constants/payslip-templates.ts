import { PayslipTemplate, PayslipTemplateConfig } from '@/lib/types/payslip';

export const DEFAULT_PAYSLIP_TEMPLATES: PayslipTemplate[] = [
  {
    id: 'corporate',
    name: 'Professional Corporate',
    description: 'Clean, professional design with company branding',
    preview: '/assets/payslip-templates/corporate-preview.png',
    config: {
      layout: {
        header: {
          showLogo: true,
          showCompanyInfo: true,
          alignment: 'center'
        },
        sections: {
          employeeInfo: true,
          payPeriod: true,
          earnings: true,
          deductions: true,
          contributions: true,
          totals: true,
          leave: false,
          expatriateDetails: false
        },
        order: ['employeeInfo', 'payPeriod', 'earnings', 'deductions', 'contributions', 'totals']
      },
      styling: {
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
      },
      branding: {
        showCompanyLogo: true,
        showWatermark: false,
        watermarkText: '',
        confidentialityFooter: true
      }
    }
  },
  {
    id: 'minimal',
    name: 'Minimal Modern',
    description: 'Simple, clean design focused on readability',
    preview: '/assets/payslip-templates/minimal-preview.png',
    config: {
      layout: {
        header: {
          showLogo: false,
          showCompanyInfo: true,
          alignment: 'left'
        },
        sections: {
          employeeInfo: true,
          payPeriod: true,
          earnings: true,
          deductions: true,
          contributions: false,
          totals: true,
          leave: false,
          expatriateDetails: false
        },
        order: ['employeeInfo', 'payPeriod', 'earnings', 'deductions', 'totals']
      },
      styling: {
        primaryColor: '#0f172a',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        accentColor: '#0e7288',
        borderColor: '#f1f5f9',
        fontFamily: 'Inter, sans-serif',
        headingSize: '1.5rem',
        bodySize: '0.875rem',
        smallSize: '0.75rem',
        fontWeight: {
          normal: '400',
          medium: '500',
          bold: '600'
        }
      },
      branding: {
        showCompanyLogo: false,
        showWatermark: false,
        watermarkText: '',
        confidentialityFooter: true
      }
    }
  },
  {
    id: 'premium',
    name: 'Branded Premium',
    description: 'Premium design with gradient accents and enhanced branding',
    preview: '/assets/payslip-templates/premium-preview.png',
    config: {
      layout: {
        header: {
          showLogo: true,
          showCompanyInfo: true,
          alignment: 'center'
        },
        sections: {
          employeeInfo: true,
          payPeriod: true,
          earnings: true,
          deductions: true,
          contributions: true,
          totals: true,
          leave: true,
          expatriateDetails: false
        },
        order: ['employeeInfo', 'payPeriod', 'earnings', 'deductions', 'contributions', 'leave', 'totals']
      },
      styling: {
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
      },
      branding: {
        showCompanyLogo: true,
        showWatermark: true,
        watermarkText: 'CONFIDENTIAL',
        confidentialityFooter: true
      }
    }
  }
];

export const DEFAULT_PAYSLIP_CONFIG: PayslipTemplateConfig = {
  layout: {
    header: {
      showLogo: true,
      showCompanyInfo: true,
      alignment: 'center'
    },
    sections: {
      employeeInfo: true,
      payPeriod: true,
      earnings: true,
      deductions: true,
      contributions: true,
      totals: true,
      leave: false,
      expatriateDetails: false
    },
    order: ['employeeInfo', 'payPeriod', 'earnings', 'deductions', 'contributions', 'totals']
  },
  styling: {
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
  },
  branding: {
    showCompanyLogo: true,
    showWatermark: false,
    watermarkText: '',
    confidentialityFooter: true
  }
};
