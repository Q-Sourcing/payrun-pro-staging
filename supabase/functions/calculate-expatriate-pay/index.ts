import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Uganda progressive PAYE brackets (monthly, UGX)
const UG_PAYE_BRACKETS = [
  { min: 0,        max: 235000,    rate: 0.00 },
  { min: 235001,   max: 335000,    rate: 0.10 },
  { min: 335001,   max: 410000,    rate: 0.20 },
  { min: 410001,   max: 10000000,  rate: 0.30 },
  { min: 10000001, max: Infinity,  rate: 0.40 },
];

function calculateProgressivePAYE(grossLocalMonthly: number, brackets: typeof UG_PAYE_BRACKETS): number {
  let tax = 0;
  for (const bracket of brackets) {
    if (grossLocalMonthly <= bracket.min - 1) break;
    const taxable = Math.min(grossLocalMonthly, bracket.max) - (bracket.min - 1);
    if (taxable > 0) tax += taxable * bracket.rate;
  }
  return Math.max(0, tax);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      employee_id,
      daily_rate,
      days_worked,
      allowances,          // total allowances (legacy scalar, used if allowances_detail absent)
      allowances_detail,   // optional: array of { amount, allowance_type }
      currency,
      exchange_rate_to_local,
      tax_country,
      tax_residency_status = 'non_resident',  // 'resident' | 'non_resident' | 'pending'
      lst_exempt = false,
    } = body;

    console.log("🧾 Calculating expatriate payroll for employee:", employee_id);
    console.log("📊 Input:", { employee_id, daily_rate, days_worked, currency, exchange_rate_to_local, tax_country, tax_residency_status });

    // Validate required fields
    const missingFields: string[] = [];
    if (!employee_id) missingFields.push('employee_id');
    if (daily_rate === undefined || daily_rate === null) missingFields.push('daily_rate');
    if (days_worked === undefined || days_worked === null) missingFields.push('days_worked');
    if (!currency) missingFields.push('currency');
    if (exchange_rate_to_local === undefined || exchange_rate_to_local === null) missingFields.push('exchange_rate_to_local');
    if (!tax_country) missingFields.push('tax_country');

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', missing_fields: missingFields }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dailyRate = Number(daily_rate) || 0;
    const daysWorked = Number(days_worked) || 0;
    const exchangeRate = Number(exchange_rate_to_local) || 1;

    // ── Allowance separation ────────────────────────────────────
    // allowances_detail: [{ amount, allowance_type }]
    // allowance_type: 'taxable' | 'tax_exempt' | 'social_tax_exempt'
    let taxableAllowancesForeign = 0;
    let exemptAllowancesForeign = 0;

    if (Array.isArray(allowances_detail) && allowances_detail.length > 0) {
      for (const item of allowances_detail) {
        const amt = Number(item.amount) || 0;
        if (item.allowance_type === 'tax_exempt') {
          exemptAllowancesForeign += amt;
        } else {
          // 'taxable' and 'social_tax_exempt' both go into PAYE base
          taxableAllowancesForeign += amt;
        }
      }
    } else {
      // Legacy: treat scalar allowances as taxable
      taxableAllowancesForeign = Number(allowances) || 0;
    }

    const totalAllowancesForeign = taxableAllowancesForeign + exemptAllowancesForeign;

    // ── Gross calculations ──────────────────────────────────────
    const grossForeignEarnings = (dailyRate * daysWorked);
    const gross_foreign = grossForeignEarnings + totalAllowancesForeign;

    // Taxable gross (for PAYE) excludes tax_exempt allowances
    const taxable_foreign = grossForeignEarnings + taxableAllowancesForeign;

    // Convert to local currency (UGX for Uganda)
    const gross_local = gross_foreign * exchangeRate;
    const taxable_local = taxable_foreign * exchangeRate;

    // ── Fetch expatriate policy for the tax country ─────────────
    const { data: policy, error: policyError } = await supabase
      .from('expatriate_policies')
      .select('*')
      .eq('country', tax_country)
      .maybeSingle();

    if (policyError) {
      console.warn("Policy fetch error (using fallback):", policyError.message);
    }

    // ── PAYE calculation ────────────────────────────────────────
    let paye_deduction = 0;
    const isNonResident = tax_residency_status === 'non_resident' || tax_residency_status === 'pending';

    if (isNonResident && policy?.apply_flat_tax && policy?.flat_tax_rate) {
      // Non-resident: flat rate on taxable gross in local currency
      paye_deduction = taxable_local * (Number(policy.flat_tax_rate) / 100);
    } else {
      // Resident: progressive PAYE on taxable local amount
      // Use Uganda brackets as default; can be extended per country
      paye_deduction = calculateProgressivePAYE(taxable_local, UG_PAYE_BRACKETS);
    }

    // ── NSSF calculation ────────────────────────────────────────
    // Non-resident (<3 yrs): no employee contribution; employer pays 10% special
    // Resident: 5% employee + 10% employer
    let nssf_employee = 0;
    let nssf_employer = 0;
    const nssf_employer_rate = policy?.nssf_non_resident_employer_rate != null
      ? Number(policy.nssf_non_resident_employer_rate) / 100
      : 0.10;

    if (isNonResident) {
      nssf_employee = 0;
      nssf_employer = gross_local * nssf_employer_rate;  // special employer contribution
    } else {
      nssf_employee = gross_local * 0.05;
      nssf_employer = gross_local * 0.10;
    }

    // ── LST calculation (Uganda: 4,000 UGX/month) ───────────────
    let lst_deduction = 0;
    const policyExemptLst = policy?.exempt_lst === true;
    if (!policyExemptLst && !lst_exempt) {
      // Only apply LST if tax country has LST (Uganda). Other countries don't have it.
      if (tax_country === 'Uganda') {
        lst_deduction = 4000; // UGX fixed
      }
    }

    // ── Net calculations ────────────────────────────────────────
    const total_deductions_local = paye_deduction + nssf_employee + lst_deduction;
    const net_local = gross_local - total_deductions_local;
    const net_foreign = exchangeRate > 0 ? net_local / exchangeRate : 0;

    const result = {
      employee_id,
      gross_foreign,
      net_foreign,
      gross_local,
      net_local,
      paye_deduction,
      nssf_employee,
      nssf_employer,
      lst_deduction,
      total_deductions_local,
      details: {
        tax_country,
        tax_residency_status,
        exchange_rate: exchangeRate,
        daily_rate: dailyRate,
        days_worked: daysWorked,
        taxable_allowances_foreign: taxableAllowancesForeign,
        exempt_allowances_foreign: exemptAllowancesForeign,
        total_allowances_foreign: totalAllowancesForeign,
        currency,
        paye_rate_applied: isNonResident ? `${policy?.flat_tax_rate ?? 15}% flat (non-resident)` : 'progressive',
        nssf_type: isNonResident ? 'employer_special' : 'standard',
      }
    };

    console.log(`💰 Employee ${employee_id}: Gross ${currency} ${gross_foreign.toFixed(2)} → Local ${gross_local.toFixed(2)} | PAYE ${paye_deduction.toFixed(2)} | Net ${net_local.toFixed(2)}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error("💥 Unexpected server error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
