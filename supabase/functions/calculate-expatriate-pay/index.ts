import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { employee_id, daily_rate, days_worked, allowances, currency, exchange_rate_to_local, tax_country } = await req.json();
    console.log("🧾 Calculating expatriate payroll for employee:", employee_id);
    console.log("📊 Input data:", { employee_id, daily_rate, days_worked, allowances, currency, exchange_rate_to_local, tax_country });

    // Validate input - allow 0 values for numeric fields, but check for undefined/null
    const missingFields: string[] = [];
    if (!employee_id || employee_id === undefined || employee_id === null) missingFields.push('employee_id');
    if (daily_rate === undefined || daily_rate === null) missingFields.push('daily_rate');
    if (days_worked === undefined || days_worked === null) missingFields.push('days_worked');
    if (!currency || currency === undefined || currency === null) missingFields.push('currency');
    if (exchange_rate_to_local === undefined || exchange_rate_to_local === null) missingFields.push('exchange_rate_to_local');
    if (!tax_country || tax_country === undefined || tax_country === null) missingFields.push('tax_country');

    // Allow allowances to be 0, but ensure it's a number
    if (allowances === undefined || allowances === null) {
      // Allowances can default to 0 if not provided
    }

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          missing_fields: missingFields,
          received_data: { employee_id, daily_rate, days_worked, allowances, currency, exchange_rate_to_local, tax_country }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure numeric values are numbers
    const dailyRate = Number(daily_rate) || 0;
    const daysWorked = Number(days_worked) || 0;
    const totalAllowances = Number(allowances) || 0;
    const exchangeRate = Number(exchange_rate_to_local) || 1;

    // Calculate net pay in foreign currency
    const gross_foreign = (dailyRate * daysWorked) + totalAllowances;

    // Convert to local currency
    const gross_local = gross_foreign * exchangeRate;

    // For now, we'll use a simple calculation for net pay
    // In a real system, you'd have proper tax calculations
    const tax_rate = 0.20; // 20% tax rate as example
    const tax_amount = gross_foreign * tax_rate;
    const net_foreign = gross_foreign - tax_amount;
    const net_local = net_foreign * exchangeRate;

    const result = {
      employee_id,
      gross_foreign,
      net_foreign,
      gross_local,
      net_local,
      details: {
        tax_country,
        exchange_rate: exchangeRate,
        daily_rate: dailyRate,
        days_worked: daysWorked,
        allowances: totalAllowances,
        currency
      }
    };

    console.log(`💰 Employee ${employee_id}: Gross $${gross_foreign.toFixed(2)} → UGX ${gross_local.toFixed(2)}`);

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