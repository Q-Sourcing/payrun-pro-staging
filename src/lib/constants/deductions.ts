// Country-specific deduction rules and tax calculations

export interface TaxBracket {
  min: number;
  max?: number;
  rate: number; // percentage
}

export interface DeductionRule {
  name: string;
  type: 'fixed' | 'percentage' | 'progressive';
  amount?: number;
  percentage?: number;
  brackets?: TaxBracket[];
  mandatory: boolean;
  employeeContribution?: number;
  employerContribution?: number;
  description: string;
}

export interface CountryDeductions {
  [countryCode: string]: {
    currency: string;
    deductions: DeductionRule[];
  };
}

// Country-specific deduction configurations
export const COUNTRY_DEDUCTIONS: CountryDeductions = {
  UG: {
    currency: "UGX",
    deductions: [
      {
        name: "PAYE",
        type: "progressive",
        brackets: [
          { min: 0, max: 235000, rate: 0 },
          { min: 235001, max: 335000, rate: 0.10 },
          { min: 335001, max: 410000, rate: 0.20 },
          { min: 410001, max: 10000000, rate: 0.30 },
          { min: 10000001, rate: 0.40 }
        ],
        mandatory: true,
        description: "Pay As You Earn Tax - Progressive income tax"
      },
      {
        name: "NSSF Employee",
        type: "percentage",
        percentage: 5,
        mandatory: true,
        employeeContribution: 5,
        description: "NSSF Employee - 5% (Total gross)"
      },
      {
        name: "NSSF Employer",
        type: "percentage",
        percentage: 10,
        mandatory: true,
        employerContribution: 10,
        description: "NSSF Employer - 10% (Total gross)"
      },
      {
        name: "LST",
        type: "fixed",
        amount: 4000,
        mandatory: false,
        description: "Local Service Tax - 4,000 UGX monthly"
      }
    ]
  },
  KE: {
    currency: "KSH",
    deductions: [
      {
        name: "PAYE",
        type: "progressive",
        brackets: [
          { min: 0, max: 24000, rate: 0.10 },
          { min: 24001, max: 32333, rate: 0.25 },
          { min: 32334, rate: 0.30 }
        ],
        mandatory: true,
        description: "Pay As You Earn Tax - Personal Relief: 2,400 KSH"
      },
      {
        name: "NSSF",
        type: "percentage",
        percentage: 6,
        mandatory: true,
        employeeContribution: 6,
        employerContribution: 6,
        description: "National Social Security Fund - Tiered (max 360 KSH total)"
      },
      {
        name: "NHIF",
        type: "progressive",
        brackets: [
          { min: 0, max: 5999, rate: 0 },
          { min: 6000, max: 7999, rate: 150 },
          { min: 8000, max: 11999, rate: 300 },
          { min: 12000, max: 14999, rate: 400 },
          { min: 15000, max: 19999, rate: 500 },
          { min: 20000, max: 24999, rate: 600 },
          { min: 25000, max: 29999, rate: 750 },
          { min: 30000, max: 34999, rate: 850 },
          { min: 35000, max: 39999, rate: 900 },
          { min: 40000, max: 44999, rate: 950 },
          { min: 45000, max: 49999, rate: 1000 },
          { min: 50000, max: 59999, rate: 1100 },
          { min: 60000, max: 69999, rate: 1200 },
          { min: 70000, max: 79999, rate: 1300 },
          { min: 80000, max: 89999, rate: 1400 },
          { min: 90000, max: 99999, rate: 1500 },
          { min: 100000, rate: 1700 }
        ],
        mandatory: true,
        description: "National Hospital Insurance Fund - Sliding scale"
      },
      {
        name: "Housing Levy",
        type: "percentage",
        percentage: 1.5,
        mandatory: true,
        employeeContribution: 1.5,
        employerContribution: 1.5,
        description: "Housing Development Levy - 1.5% employee + 1.5% employer"
      }
    ]
  },
  TZ: {
    currency: "TZS",
    deductions: [
      {
        name: "PAYE",
        type: "progressive",
        brackets: [
          { min: 0, max: 270000, rate: 0 },
          { min: 270001, max: 520000, rate: 0.08 },
          { min: 520001, max: 760000, rate: 0.20 },
          { min: 760001, max: 1000000, rate: 0.25 },
          { min: 1000001, rate: 0.30 }
        ],
        mandatory: true,
        description: "Pay As You Earn Tax"
      },
      {
        name: "NSSF",
        type: "percentage",
        percentage: 10,
        mandatory: true,
        employeeContribution: 10,
        employerContribution: 10,
        description: "National Social Security Fund - 10% employee + 10% employer"
      },
      {
        name: "Skills Development Levy",
        type: "percentage",
        percentage: 4.5,
        mandatory: true,
        employerContribution: 4.5,
        description: "Skills Development Levy - 4.5% employer paid"
      },
      {
        name: "NHIF",
        type: "percentage",
        percentage: 3,
        mandatory: true,
        description: "Health Insurance - 3-6% variable"
      }
    ]
  },
  RW: {
    currency: "RWF",
    deductions: [
      {
        name: "PAYE",
        type: "progressive",
        brackets: [
          { min: 0, max: 30000, rate: 0 },
          { min: 30001, max: 100000, rate: 0.20 },
          { min: 100001, max: 200000, rate: 0.25 },
          { min: 200001, max: 400000, rate: 0.30 },
          { min: 400001, rate: 0.35 }
        ],
        mandatory: true,
        description: "Pay As You Earn Tax"
      },
      {
        name: "RSSB Pension",
        type: "percentage",
        percentage: 3,
        mandatory: true,
        employeeContribution: 3,
        employerContribution: 3,
        description: "Rwanda Social Security Board - Pension 3% + 3%"
      },
      {
        name: "RSSB Medical",
        type: "percentage",
        percentage: 3,
        mandatory: true,
        employeeContribution: 3,
        employerContribution: 3,
        description: "Rwanda Social Security Board - Medical 3% + 3%"
      },
      {
        name: "RSSB Occupational Hazards",
        type: "percentage",
        percentage: 2,
        mandatory: true,
        employerContribution: 2,
        description: "Rwanda Social Security Board - Occupational Hazards 2% employer"
      }
    ]
  },
  SS: {
    currency: "SSP",
    deductions: [
      {
        name: "PAYE",
        type: "progressive",
        brackets: [
          { min: 0, max: 300, rate: 0 },
          { min: 301, max: 1000, rate: 0.10 },
          { min: 1001, max: 3000, rate: 0.15 },
          { min: 3001, max: 10000, rate: 0.20 },
          { min: 10001, max: 20000, rate: 0.25 },
          { min: 20001, rate: 0.30 }
        ],
        mandatory: true,
        description: "Pay As You Earn Tax - Progressive"
      },
      {
        name: "Pension",
        type: "percentage",
        percentage: 5,
        mandatory: true,
        employeeContribution: 5,
        employerContribution: 7,
        description: "Pension - 5% employee + 7% employer"
      }
    ]
  }
};

// Helper functions for tax calculations
export const calculateProgressiveTax = (grossPay: number, brackets: TaxBracket[], countryCode?: string): number => {
  let totalTax = 0;

  for (const bracket of brackets) {
    const min = bracket.min;
    const max = bracket.max || Infinity;

    if (grossPay <= min) break;

    const taxableAmount = Math.min(grossPay, max) - min;
    if (taxableAmount > 0) {
      if (bracket.rate < 1) {
        // It's a percentage rate (0-1)
        totalTax += taxableAmount * bracket.rate;
      } else {
        // It's a fixed amount (like NHIF in Kenya)
        totalTax = bracket.rate;
      }
    }
  }

  // Apply personal relief for Kenya PAYE
  if (countryCode === 'KE' && totalTax > 0) {
    totalTax = Math.max(0, totalTax - 2400);
  }

  return totalTax;
};

export const calculateDeduction = (grossPay: number, rule: DeductionRule, countryCode?: string): number => {
  switch (rule.type) {
    case 'fixed':
      return rule.amount || 0;
    case 'percentage':
      // Apply NSSF cap for Uganda (employee portion)
      // In Uganda, standard NSSF is 5%/10% of total gross (statutory no cap unless voluntary)
      return grossPay * ((rule.percentage || 0) / 100);
    case 'progressive':
      // Pass country code for Kenya PAYE personal relief
      const isPAYE = rule.name === 'PAYE';
      return calculateProgressiveTax(grossPay, rule.brackets || [], isPAYE ? countryCode : undefined);
    default:
      return 0;
  }
};

export const getCountryDeductions = (countryNameOrCode: string): DeductionRule[] => {
  // Map country names to codes
  const countryCodeMap: { [key: string]: string } = {
    "Uganda": "UG",
    "Kenya": "KE",
    "Tanzania": "TZ",
    "Rwanda": "RW",
    "South Sudan": "SS"
  };

  // Try to get the code from the map, otherwise use the input as-is
  const countryCode = countryCodeMap[countryNameOrCode] || countryNameOrCode;

  return COUNTRY_DEDUCTIONS[countryCode]?.deductions || [];
};