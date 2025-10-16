// Expatriate Payroll Types and Interfaces

export interface ExpatriatePayGroup {
  id: string;
  name: string;
  country: string;
  currency: string;
  exchange_rate_to_local: number;
  default_daily_rate: number;
  tax_country: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpatriatePayRunItem {
  id: string;
  employee_id: string;
  pay_run_id: string;
  daily_rate: number;
  days_worked: number;
  allowances_foreign: number;
  net_foreign: number;
  net_local: number;
  gross_local: number;
  currency: string;
  exchange_rate: number;
  tax_country: string;
  created_at: string;
  updated_at: string;
}

export interface ExpatriateCalculationInput {
  employee_id: string;
  daily_rate: number;
  days_worked: number;
  allowances: number;
  currency: string;
  exchange_rate_to_local: number;
  tax_country: string;
}

export interface ExpatriateCalculationResult {
  employee_id: string;
  net_foreign: number;
  net_local: number;
  gross_local: number;
  details: {
    tax_country: string;
    exchange_rate: number;
    daily_rate: number;
    days_worked: number;
    allowances: number;
    currency: string;
  };
}

export interface ExpatriatePayGroupFormData {
  name: string;
  country: string;
  currency: string;
  exchange_rate_to_local: number;
  default_daily_rate: number;
  tax_country: string;
  notes?: string;
}

// Currency options for expatriate payrolls
export const EXPATRIATE_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SS£' }
] as const;

// Supported tax countries for expatriate payrolls
export const SUPPORTED_TAX_COUNTRIES = [
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP' }
] as const;
