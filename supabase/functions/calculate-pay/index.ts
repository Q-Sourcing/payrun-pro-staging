import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types for the calculation logic
interface TaxBracket {
  min: number;
  max?: number;
  rate: number;
}

interface DeductionRule {
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

interface CalculationInput {
  employee_id: string;
  pay_run_id?: string;
  hours_worked?: number;
  pieces_completed?: number;
  pay_rate?: number;
  pay_type?: 'hourly' | 'piece_rate' | 'salary';
  employee_type?: 'local' | 'expatriate';
  country?: string;
  custom_deductions?: Array<{
    name: string;
    amount: number;
    type: 'benefit' | 'deduction' | 'allowance';
  }>;
  benefit_deductions?: number;
}

interface CalculationResult {
  gross_pay: number;
  paye_tax: number;
  nssf_employee: number;
  nssf_employer: number;
  total_deductions: number;
  net_pay: number;
  employer_contributions: number;
  breakdown: Array<{
    description: string;
    amount: number;
    type: 'addition' | 'deduction';
  }>;
  standard_deductions: { [key: string]: number };
}

// Country-specific deduction configurations (copied from client-side)
const COUNTRY_DEDUCTIONS = {
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
        description: "NSSF Employee - 5% (cap at 1,200,000 UGX pensionable)"
      },
      {
        name: "NSSF Employer",
        type: "percentage",
        percentage: 10,
        mandatory: true,
        employerContribution: 10,
        description: "NSSF Employer - 10% (cap at 1,200,000 UGX pensionable)"
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
const calculateProgressiveTax = (grossPay: number, brackets: TaxBracket[], countryCode?: string): number => {
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

const calculateDeduction = (grossPay: number, rule: DeductionRule, countryCode?: string): number => {
  switch (rule.type) {
    case 'fixed':
      return rule.amount || 0;
    case 'percentage':
      // Apply NSSF cap for Uganda (employee portion)
      if (countryCode === 'UG' && (rule.name === 'NSSF' || rule.name === 'NSSF Employee')) {
        const cappedAmount = Math.min(grossPay, 1200000);
        return cappedAmount * ((rule.percentage || 0) / 100);
      }
      return grossPay * ((rule.percentage || 0) / 100);
    case 'progressive':
      // Pass country code for Kenya PAYE personal relief
      const isPAYE = rule.name === 'PAYE';
      return calculateProgressiveTax(grossPay, rule.brackets || [], isPAYE ? countryCode : undefined);
    default:
      return 0;
  }
};

const getCountryDeductions = (countryNameOrCode: string): DeductionRule[] => {
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
  
  return (COUNTRY_DEDUCTIONS as any)[countryCode]?.deductions || [];
};

// Main calculation function
const calculatePay = (input: CalculationInput): CalculationResult => {
  const {
    hours_worked = 0,
    pieces_completed = 0,
    pay_rate = 0,
    pay_type = 'salary',
    employee_type = 'local',
    country = 'Uganda',
    custom_deductions = [],
    benefit_deductions = 0
  } = input;

  // Calculate base gross pay
  let baseGrossPay = 0;
  if (pay_type === 'hourly') {
    baseGrossPay = hours_worked * pay_rate;
  } else if (pay_type === 'piece_rate') {
    baseGrossPay = pieces_completed * pay_rate;
  } else {
    baseGrossPay = pay_rate;
  }

  // Custom additions that affect gross (type: 'benefit')
  const grossAffectingAdditions = custom_deductions
    .filter(d => d.type === 'benefit')
    .reduce((sum, d) => sum + d.amount, 0);

  // Calculate final gross pay including gross-affecting additions
  const grossPay = baseGrossPay + grossAffectingAdditions;

  let calculatedTaxDeduction = 0;
  let employerContributions = 0;
  const standardDeductions: { [key: string]: number } = {};
  const breakdown: Array<{ description: string; amount: number; type: 'addition' | 'deduction' }> = [];

  // Add gross-affecting additions to breakdown
  if (grossAffectingAdditions > 0) {
    breakdown.push({
      description: 'Benefits',
      amount: grossAffectingAdditions,
      type: 'addition'
    });
  }

  if (employee_type === 'expatriate') {
    // For expatriates, apply simplified flat tax (default 15%)
    const flatTaxRate = 0.15; // Default 15%
    calculatedTaxDeduction = grossPay * flatTaxRate;
    standardDeductions['Flat Tax (15%)'] = calculatedTaxDeduction;
    breakdown.push({
      description: 'Flat Tax (15%)',
      amount: calculatedTaxDeduction,
      type: 'deduction'
    });
    
    // Expatriates are typically exempt from social security
    employerContributions = 0;
  } else {
    // For local employees, apply standard country-specific deductions
    const deductionRules = getCountryDeductions(country);
    
    deductionRules.forEach(rule => {
      if (rule.mandatory) {
        const amount = calculateDeduction(grossPay, rule, country);
        // Exclude NSSF Employer from employee deductions; track as employer contribution only
        if (rule.name === 'NSSF Employer') {
          employerContributions += Math.min(grossPay, 1200000) * ((rule.percentage || 0) / 100);
        } else {
          standardDeductions[rule.name] = amount;
          calculatedTaxDeduction += amount;
          breakdown.push({
            description: rule.name,
            amount: amount,
            type: 'deduction'
          });
          // If rule has an employer portion (rare), add to employerContributions without affecting deductions
          if (rule.employerContribution) {
            employerContributions += grossPay * ((rule.employerContribution || 0) / 100);
          }
        }
      }
    });
  }

  // Custom deductions
  const customDeductionsTotal = custom_deductions
    .filter(d => d.type === 'deduction')
    .reduce((sum, d) => sum + d.amount, 0);

  // Add custom deductions to breakdown
  if (customDeductionsTotal > 0) {
    breakdown.push({
      description: 'Custom Deductions',
      amount: customDeductionsTotal,
      type: 'deduction'
    });
  }

  // Custom additions that DON'T affect gross (type: 'allowance')
  const customAllowancesTotal = custom_deductions
    .filter(d => d.type === 'allowance')
    .reduce((sum, d) => sum + d.amount, 0);

  // Add allowances to breakdown
  if (customAllowancesTotal > 0) {
    breakdown.push({
      description: 'Allowances',
      amount: customAllowancesTotal,
      type: 'addition'
    });
  }

  // Add benefit deductions to breakdown
  if (benefit_deductions > 0) {
    breakdown.push({
      description: 'Benefit Deductions',
      amount: benefit_deductions,
      type: 'deduction'
    });
  }

  const totalDeductions = calculatedTaxDeduction + benefit_deductions + customDeductionsTotal;
  const netPay = grossPay + customAllowancesTotal - totalDeductions;

  return { 
    gross_pay: grossPay, 
    paye_tax: calculatedTaxDeduction, 
    total_deductions: totalDeductions, 
    net_pay: netPay,
    nssf_employee: standardDeductions['NSSF Employee'] || standardDeductions['NSSF'] || 0,
    nssf_employer: employerContributions,
    employer_contributions: employerContributions,
    breakdown,
    standard_deductions: standardDeductions
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing or invalid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client with service role key for server-side operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { employee_id, pay_run_id, ...calculationInput }: CalculationInput & { employee_id: string } = await req.json()

    // Validate required fields
    if (!employee_id) {
      return new Response(
        JSON.stringify({ error: 'employee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch employee data from database
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, pay_rate, pay_type, employee_type, country')
      .eq('id', employee_id)
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: `Employee not found: ${employeeError?.message || 'Unknown error'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Merge employee data with input data
    const fullInput: CalculationInput = {
      employee_id,
      pay_run_id,
      pay_rate: calculationInput.pay_rate ?? employee.pay_rate,
      pay_type: calculationInput.pay_type ?? employee.pay_type,
      employee_type: calculationInput.employee_type ?? employee.employee_type,
      country: calculationInput.country ?? employee.country,
      hours_worked: calculationInput.hours_worked,
      pieces_completed: calculationInput.pieces_completed,
      custom_deductions: calculationInput.custom_deductions,
      benefit_deductions: calculationInput.benefit_deductions
    }

    // Perform calculation
    const result = calculatePay(fullInput)

    // Log calculation to audit table
    await supabase
      .from('pay_calculation_audit_log')
      .insert({
        employee_id,
        pay_run_id,
        input_data: fullInput,
        output_data: result,
        calculation_type: 'payroll_calculation'
      })

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        employee: {
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`.trim()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-pay function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
