// Expatriate Payroll Types and Interfaces

export type AllowanceType = 'taxable' | 'tax_exempt' | 'social_tax_exempt';
export type TaxResidencyStatus = 'resident' | 'non_resident' | 'pending';
export type WorkPermitClass = 'G1' | 'G2' | 'G3' | 'F' | 'EAC_National' | 'Other';
export type WorkPermitStatus = 'active' | 'expired' | 'renewal_pending' | 'cancelled';

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

export interface ExpatriateAllowance {
  id: string;
  expatriate_pay_run_item_id: string;
  name: string;
  amount: number;
  allowance_type: AllowanceType;
  created_at: string;
  updated_at: string;
}

export interface ExpatriatePayRunItem {
  id: string;
  employee_id: string;
  pay_run_id: string;
  daily_rate: number;
  days_worked: number;
  allowances_foreign: number; // Deprecated - kept for backward compatibility, use allowances array instead
  net_foreign: number;
  net_local: number;
  gross_local: number;
  gross_foreign?: number;
  currency: string;
  exchange_rate: number;
  exchange_rate_to_local?: number;
  tax_country: string;
  notes?: string;
  allowances?: ExpatriateAllowance[]; // Array of named allowances
  created_at: string;
  updated_at: string;
}

export interface ExpatriateCalculationInput {
  employee_id: string;
  daily_rate: number;
  days_worked: number;
  allowances: number;
  allowances_detail?: Array<{ amount: number; allowance_type: AllowanceType }>;
  currency: string;
  exchange_rate_to_local: number;
  tax_country: string;
  tax_residency_status?: TaxResidencyStatus;
  lst_exempt?: boolean;
}

export interface ExpatriateCalculationResult {
  employee_id: string;
  gross_foreign: number;
  net_foreign: number;
  gross_local: number;
  net_local: number;
  paye_deduction: number;
  nssf_employee: number;
  nssf_employer: number;
  lst_deduction: number;
  total_deductions_local: number;
  details: {
    tax_country: string;
    tax_residency_status: TaxResidencyStatus;
    exchange_rate: number;
    daily_rate: number;
    days_worked: number;
    taxable_allowances_foreign: number;
    exempt_allowances_foreign: number;
    total_allowances_foreign: number;
    currency: string;
    paye_rate_applied: string;
    nssf_type: 'employer_special' | 'standard';
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

export interface WorkPermit {
  id: string;
  org_id: string;
  employee_id: string;
  permit_class: WorkPermitClass;
  permit_number?: string | null;
  issue_date?: string | null;
  expiry_date: string;
  fee_paid_usd?: number | null;
  status: WorkPermitStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
}

export interface WorkPermitFormData {
  employee_id: string;
  permit_class: WorkPermitClass;
  permit_number: string;
  issue_date: string;
  expiry_date: string;
  fee_paid_usd: string;
  status: WorkPermitStatus;
  notes: string;
}

export interface TaxTreaty {
  id: string;
  country_a: string;
  country_b: string;
  in_force_since?: string | null;
  notes?: string | null;
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

export const WORK_PERMIT_CLASSES: Array<{ value: WorkPermitClass; label: string; description: string }> = [
  { value: 'G1', label: 'Class G1', description: 'Missionaries and volunteers (NGOs)' },
  { value: 'G2', label: 'Class G2', description: 'Salaried employees – USD 2,500/yr' },
  { value: 'G3', label: 'Class G3', description: 'Agro-processing, manufacturing, mining specialists' },
  { value: 'F',  label: 'Class F',  description: 'Prescribed professions (doctors, lawyers, engineers)' },
  { value: 'EAC_National', label: 'EAC National', description: 'Citizens of EAC member states (no fee)' },
  { value: 'Other', label: 'Other', description: 'Other permit type' },
];

// Allowance type defaults by common allowance name
export const ALLOWANCE_TYPE_DEFAULTS: Record<string, AllowanceType> = {
  housing: 'taxable',
  accommodation: 'taxable',
  transport: 'tax_exempt',
  medical: 'tax_exempt',
  health: 'tax_exempt',
  hardship: 'tax_exempt',
  leave_travel: 'tax_exempt',
  travel: 'tax_exempt',
  school_fees: 'social_tax_exempt',
  education: 'social_tax_exempt',
  meal: 'tax_exempt',
  utility: 'taxable',
  other: 'taxable',
};

export const ALLOWANCE_TYPE_LABELS: Record<AllowanceType, string> = {
  taxable: 'Taxable',
  tax_exempt: 'Tax Exempt',
  social_tax_exempt: 'Social Tax Exempt',
};

export const ALLOWANCE_TYPE_DESCRIPTIONS: Record<AllowanceType, string> = {
  taxable: 'Included in PAYE base',
  tax_exempt: 'Excluded from PAYE and NSSF',
  social_tax_exempt: 'Excluded from NSSF only (e.g. school fees paid directly to institution)',
};
