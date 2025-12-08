// PayGroup Types and Interfaces

export type PayGroupType = 'regular' | 'expatriate' | 'piece_rate' | 'intern';

// New hierarchy types
export type PayGroupCategory = 'head_office' | 'projects';
export type HeadOfficeSubType = 'regular' | 'expatriate' | 'interns';
export type ProjectsSubType = 'manpower' | 'ippms' | 'expatriate';
export type ManpowerFrequency = 'daily' | 'bi_weekly' | 'monthly';
export type IppmsType = 'piece_rate';

export interface PayGroupTypeDefinition {
  id: PayGroupType;
  name: string;
  description: string;
  icon: string;
  color: string;
  prefix: string;
  supportsDailyRate: boolean;
  supportsExchangeRate: boolean;
  supportsTaxCountry: boolean;
  defaultFields: PayGroupField[];
}

export interface PayGroupField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'currency' | 'exchange_rate' | 'tax_country';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string; flag?: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
}

export interface BasePayGroup {
  id: string;
  paygroup_id: string; // Auto-generated ID like EXPG-U001
  name: string;
  code?: string; // Readable code
  type: PayGroupType;
  category?: PayGroupCategory; // New: head_office or projects
  employee_type?: HeadOfficeSubType | ProjectsSubType; // Employee type based on category (renamed from sub_type)
  pay_frequency?: ManpowerFrequency | string; // New: for projects.manpower
  country: string;
  currency: string;
  status: 'active' | 'inactive';
  employee_count: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  // Source fields for pay_group_master compatibility
  source_table?: string;
  source_id?: string;
}

export interface RegularPayGroup extends BasePayGroup {
  type: 'regular';
  pay_frequency: string;
  default_tax_percentage: number;
  tax_country: string;
}

export interface ExpatriatePayGroup extends BasePayGroup {
  type: 'expatriate';
  exchange_rate_to_local: number;
  default_daily_rate: number;
  tax_country: string;
}

export interface PieceRatePayGroup extends BasePayGroup {
  type: 'piece_rate';
  // IPPMS-specific selection to segregate pay runs and employees
  pay_type?: 'piece_rate' | 'daily_rate';
  piece_type: string; // Unit of measurement (crates, boxes, units, etc.)
  default_piece_rate: number; // Rate per piece/unit
  default_tax_percentage: number;
  tax_country: string;
  minimum_pieces?: number;
  maximum_pieces?: number;
  pay_frequency?: string;
}

export interface InternPayGroup extends BasePayGroup {
  type: 'intern';
  internship_duration: number; // in months
  stipend_amount: number;
  tax_country: string;
  academic_institution?: string;
}

export type PayGroup = RegularPayGroup | ExpatriatePayGroup | PieceRatePayGroup | InternPayGroup;

export interface PayGroupFormData {
  name: string;
  type: PayGroupType;
  category?: PayGroupCategory; // New: head_office or projects
  employee_type?: HeadOfficeSubType | ProjectsSubType; // Employee type based on category (renamed from sub_type)
  pay_frequency?: ManpowerFrequency | string; // New: for projects.manpower, or legacy for regular paygroups
  // IPPMS: Pay type selection to separate piece rate and daily rate flows
  pay_type?: 'piece_rate' | 'daily_rate';
  // Project-aware linkage (for category = 'projects')
  project_id?: string;
  country: string;
  currency: string;
  status: 'active' | 'inactive';
  notes?: string;

  // Regular PayGroup fields
  default_tax_percentage?: number;
  tax_country?: string;

  // Expatriate PayGroup fields
  exchange_rate_to_local?: number;
  default_daily_rate?: number;

  // Piece Rate PayGroup fields
  piece_type?: string;
  default_piece_rate?: number;
  minimum_pieces?: number;
  maximum_pieces?: number;

  // Intern PayGroup fields
  internship_duration?: number;
  stipend_amount?: number;
  academic_institution?: string;
}

export interface PayGroupSummary {
  totalGroups: number;
  activeGroups: number;
  totalEmployees: number;
  currencies: string[];
  types: PayGroupType[];
}

// PayGroup Type Definitions
export const PAYGROUP_TYPES: Record<PayGroupType, PayGroupTypeDefinition> = {
  regular: {
    id: 'regular',
    name: 'Regular PayGroups',
    description: 'Standard payroll groups for local employees',
    icon: 'Users',
    color: 'blue',
    prefix: 'REGP',
    supportsDailyRate: false,
    supportsExchangeRate: false,
    supportsTaxCountry: true,
    defaultFields: [
      {
        id: 'pay_frequency', name: 'Pay Frequency', type: 'select', required: true, options: [
          { value: 'weekly', label: 'Weekly' },
          { value: 'bi-weekly', label: 'Bi-weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' }
        ]
      },
      {
        id: 'default_tax_percentage', name: 'Default Tax Percentage', type: 'number', required: true,
        validation: { min: 0, max: 100, message: 'Tax percentage must be between 0 and 100' }
      },
      {
        id: 'tax_country', name: 'Tax Country', type: 'tax_country', required: true,
        helpText: 'The tax country determines which country\'s tax regulations apply to this pay group'
      }
    ]
  },
  expatriate: {
    id: 'expatriate',
    name: 'Expatriate PayGroups',
    description: 'Payroll groups for employees paid in foreign currencies',
    icon: 'Globe2',
    color: 'emerald',
    prefix: 'EXPG',
    supportsDailyRate: false,
    supportsExchangeRate: true,
    supportsTaxCountry: true,
    defaultFields: [
      {
        id: 'exchange_rate_to_local', name: 'Exchange Rate to Local', type: 'exchange_rate', required: true,
        validation: { min: 0, message: 'Exchange rate must be greater than 0' },
        helpText: 'Exchange rate from foreign currency to local currency'
      },
      {
        id: 'tax_country', name: 'Tax Country', type: 'tax_country', required: true,
        helpText: 'The tax country determines which country\'s tax regulations apply to this pay group'
      }
    ]
  },
  piece_rate: {
    id: 'piece_rate',
    name: 'Piece Rate PayGroups',
    description: 'Payroll groups for employees paid per piece/unit completed',
    icon: 'Package',
    color: 'amber',
    prefix: 'PCE',
    supportsDailyRate: false,
    supportsExchangeRate: false,
    supportsTaxCountry: true,
    defaultFields: [
      {
        id: 'piece_type', name: 'Piece Type', type: 'select', required: true, options: [
          { value: 'crates', label: 'Crates' },
          { value: 'boxes', label: 'Boxes' },
          { value: 'units', label: 'Units' },
          { value: 'packages', label: 'Packages' },
          { value: 'items', label: 'Items' },
          { value: 'tons', label: 'Tons' },
          { value: 'kilograms', label: 'Kilograms' },
          { value: 'custom', label: 'Custom' }
        ],
        helpText: 'Unit of measurement for piece rate calculations'
      },
      {
        id: 'default_piece_rate', name: 'Default Piece Rate', type: 'currency', required: true,
        validation: { min: 0, message: 'Piece rate must be greater than 0' },
        helpText: 'Default rate per piece/unit (e.g., 1000 UGX per crate)'
      },
      {
        id: 'default_tax_percentage', name: 'Default Tax Percentage', type: 'number', required: true,
        validation: { min: 0, max: 100, message: 'Tax percentage must be between 0 and 100' },
        helpText: 'Default tax percentage (fallback only; actual tax rules come from tax_country)'
      },
      {
        id: 'tax_country', name: 'Tax Country', type: 'tax_country', required: true,
        helpText: 'The tax country determines which country\'s tax regulations apply to this pay group (work location)'
      },
      {
        id: 'minimum_pieces', name: 'Minimum Pieces', type: 'number', required: false,
        validation: { min: 0, message: 'Minimum pieces must be 0 or greater' },
        helpText: 'Minimum pieces required per pay period (optional, for validation)'
      },
      {
        id: 'maximum_pieces', name: 'Maximum Pieces', type: 'number', required: false,
        validation: { min: 1, message: 'Maximum pieces must be 1 or greater' },
        helpText: 'Maximum pieces allowed per pay period (optional, for validation)'
      },
      {
        id: 'pay_frequency', name: 'Pay Frequency', type: 'select', required: false, options: [
          { value: 'weekly', label: 'Weekly' },
          { value: 'bi-weekly', label: 'Bi-weekly' },
          { value: 'monthly', label: 'Monthly' }
        ],
        helpText: 'Pay frequency for reporting (optional)'
      }
    ]
  },
  intern: {
    id: 'intern',
    name: 'Intern PayGroups',
    description: 'Payroll groups for interns and trainees',
    icon: 'GraduationCap',
    color: 'purple',
    prefix: 'INTR',
    supportsDailyRate: false,
    supportsExchangeRate: false,
    supportsTaxCountry: true,
    defaultFields: [
      {
        id: 'internship_duration', name: 'Internship Duration (months)', type: 'number', required: true,
        validation: { min: 1, max: 12, message: 'Internship duration must be between 1 and 12 months' }
      },
      {
        id: 'stipend_amount', name: 'Stipend Amount', type: 'currency', required: true,
        validation: { min: 0, message: 'Stipend amount must be greater than 0' }
      },
      {
        id: 'tax_country', name: 'Tax Country', type: 'tax_country', required: true,
        helpText: 'The tax country determines which country\'s tax regulations apply to this pay group'
      },
      {
        id: 'academic_institution', name: 'Academic Institution', type: 'text', required: false,
        placeholder: 'University or college name'
      }
    ]
  }
};

// Supported countries with flags
export const SUPPORTED_COUNTRIES = [
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', currency: 'SSP' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' }
] as const;

// Supported currencies
export const SUPPORTED_CURRENCIES = [
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

// Tax countries (subset of supported countries)
export const TAX_COUNTRIES = [
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' }
] as const;

// Helper functions
export const getPayGroupTypeDefinition = (type: PayGroupType): PayGroupTypeDefinition => {
  return PAYGROUP_TYPES[type];
};

export const generatePayGroupId = (type: PayGroupType, country: string): string => {
  const typeDef = PAYGROUP_TYPES[type];
  const countryCode = country.substring(0, 1).toUpperCase();

  // This would typically query the database for the next number
  // For now, we'll use a timestamp-based approach
  const timestamp = Date.now().toString().slice(-3);
  return `${typeDef.prefix}-${countryCode}${timestamp}`;
};

export const getCountryByCode = (code: string) => {
  return SUPPORTED_COUNTRIES.find(country => country.code === code);
};

export const getCurrencyByCode = (code: string) => {
  return SUPPORTED_CURRENCIES.find(currency => currency.code === code);
};

export const getCurrencySymbol = (code: string): string => {
  const currency = getCurrencyByCode(code);
  return currency?.symbol || code;
};

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString()}`;
};

// Helper functions for category/sub_type validation
export const getSubTypesForCategory = (category: PayGroupCategory): Array<HeadOfficeSubType | ProjectsSubType> => {
  if (category === 'head_office') {
    return ['regular', 'expatriate', 'interns'];
  } else {
    return ['manpower', 'ippms', 'expatriate'];
  }
};

export const requiresPayFrequency = (category?: PayGroupCategory, subType?: string): boolean => {
  return category === 'projects' && subType === 'manpower';
};

export const getDefaultPayType = (category?: PayGroupCategory, subType?: string, payFrequency?: ManpowerFrequency): string => {
  if (subType === 'regular') return 'salary';
  if (subType === 'expatriate') return 'daily_rate';
  if (subType === 'interns') return 'salary';
  if (subType === 'manpower') {
    if (payFrequency === 'daily') return 'daily_rate';
    return 'salary'; // bi_weekly and monthly
  }
  if (subType === 'ippms') return 'piece_rate';
  return 'salary'; // default
};

export const isValidCategorySubType = (category: PayGroupCategory, subType: string): boolean => {
  if (category === 'head_office') {
    return ['regular', 'expatriate', 'interns'].includes(subType);
  } else if (category === 'projects') {
    return ['manpower', 'ippms', 'expatriate'].includes(subType);
  }
  return false;
};
