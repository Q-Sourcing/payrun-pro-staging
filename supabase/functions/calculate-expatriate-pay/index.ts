import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpatriateCalculationInput {
  employee_id: string;
  daily_rate: number;
  days_worked: number;
  allowances: number;
  currency: string;
  exchange_rate_to_local: number;
  tax_country: string;
}

interface ExpatriateCalculationResult {
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

// Tax brackets for different countries (from existing deductions.ts logic)
const TAX_BRACKETS = {
  UG: [
    { min: 0, max: 235000, rate: 0 },
    { min: 235001, max: 335000, rate: 0.10 },
    { min: 335001, max: 410000, rate: 0.20 },
    { min: 410001, max: 10000000, rate: 0.30 },
    { min: 10000001, rate: 0.40 }
  ],
  KE: [
    { min: 0, max: 24000, rate: 0.10 },
    { min: 24001, max: 32333, rate: 0.25 },
    { min: 32334, rate: 0.30 }
  ],
  TZ: [
    { min: 0, max: 270000, rate: 0 },
    { min: 270001, max: 520000, rate: 0.08 },
    { min: 520001, max: 760000, rate: 0.20 },
    { min: 760001, rate: 0.30 }
  ],
  RW: [
    { min: 0, max: 360000, rate: 0 },
    { min: 360001, max: 1200000, rate: 0.20 },
    { min: 1200001, rate: 0.30 }
  ],
  SS: [
    { min: 0, max: 300, rate: 0 },
    { min: 301, max: 1000, rate: 0.10 },
    { min: 1001, max: 3000, rate: 0.15 },
    { min: 3001, max: 10000, rate: 0.20 },
    { min: 10001, max: 20000, rate: 0.25 },
    { min: 20001, rate: 0.30 }
  ]
};

// Social security contribution rates
const SOCIAL_SECURITY_RATES = {
  UG: { employee: 0.05, employer: 0.10, cap: 1200000 },
  KE: { employee: 0.06, employer: 0.06, cap: 6000 },
  TZ: { employee: 0.10, employer: 0.10, cap: 1000000 },
  RW: { employee: 0.03, employer: 0.03, cap: 2000000 },
  SS: { employee: 0.08, employer: 0.08, cap: 1000 }
};

function calculateProgressiveTax(income: number, brackets: Array<{min: number, max?: number, rate: number}>): number {
  let tax = 0;
  let remainingIncome = income;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const bracketMin = bracket.min;
    const bracketMax = bracket.max || Infinity;
    const taxableInBracket = Math.min(remainingIncome, bracketMax - bracketMin + 1);
    
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
    }
  }

  return tax;
}

function calculateSocialSecurity(income: number, country: string): { employee: number, employer: number } {
  const rates = SOCIAL_SECURITY_RATES[country as keyof typeof SOCIAL_SECURITY_RATES];
  if (!rates) return { employee: 0, employer: 0 };

  const cappedIncome = Math.min(income, rates.cap);
  return {
    employee: cappedIncome * rates.employee,
    employer: cappedIncome * rates.employer
  };
}

function calculateGrossFromNet(netIncome: number, country: string): number {
  // This is a simplified reverse calculation
  // In practice, you might need a more sophisticated iterative approach
  const brackets = TAX_BRACKETS[country as keyof typeof TAX_BRACKETS];
  const socialSecurity = SOCIAL_SECURITY_RATES[country as keyof typeof SOCIAL_SECURITY_RATES];
  
  if (!brackets || !socialSecurity) {
    // If no tax brackets, assume 20% effective tax rate
    return netIncome / 0.8;
  }

  // Estimate gross income (this is simplified - real implementation would be iterative)
  const estimatedGross = netIncome * 1.3; // Rough estimate
  const tax = calculateProgressiveTax(estimatedGross, brackets);
  const ssEmployee = calculateSocialSecurity(estimatedGross, country).employee;
  
  // Adjust estimate based on actual deductions
  const totalDeductions = tax + ssEmployee;
  const actualNet = estimatedGross - totalDeductions;
  
  if (Math.abs(actualNet - netIncome) < 1000) { // Within 1000 units tolerance
    return estimatedGross;
  }
  
  // Simple adjustment
  return netIncome + totalDeductions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { employee_id, daily_rate, days_worked, allowances, currency, exchange_rate_to_local, tax_country }: ExpatriateCalculationInput = await req.json()

    // Validate input
    if (!employee_id || !daily_rate || !days_worked || !currency || !exchange_rate_to_local || !tax_country) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate net pay in foreign currency
    const net_foreign = (daily_rate * days_worked) + allowances;
    
    // Convert to local currency
    const net_local = net_foreign * exchange_rate_to_local;
    
    // Calculate gross pay in local currency (reverse calculation)
    const gross_local = calculateGrossFromNet(net_local, tax_country);

    const result: ExpatriateCalculationResult = {
      employee_id,
      net_foreign,
      net_local,
      gross_local,
      details: {
        tax_country,
        exchange_rate: exchange_rate_to_local,
        daily_rate,
        days_worked,
        allowances,
        currency
      }
    };

    // Log the calculation for audit
    await supabaseClient
      .from('pay_calculation_audit_log')
      .insert({
        employee_id,
        input_data: {
          daily_rate,
          days_worked,
          allowances,
          currency,
          exchange_rate_to_local,
          tax_country
        },
        output_data: result,
        calculation_type: 'expatriate_payroll_calculation'
      });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-expatriate-pay:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
