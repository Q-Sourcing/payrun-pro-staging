import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { employee_id, daily_rate, days_worked, allowances, currency, exchange_rate_to_local, tax_country } = await req.json();
    console.log("🧾 Calculating expatriate payroll for employee:", employee_id);

    // Validate input
    if (!employee_id || !daily_rate || !days_worked || !currency || !exchange_rate_to_local || !tax_country) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate net pay in foreign currency
    const gross_foreign = (daily_rate * days_worked) + allowances;
    
    // Convert to local currency
    const gross_local = gross_foreign * exchange_rate_to_local;
    
    // For now, we'll use a simple calculation for net pay
    // In a real system, you'd have proper tax calculations
    const tax_rate = 0.20; // 20% tax rate as example
    const tax_amount = gross_foreign * tax_rate;
    const net_foreign = gross_foreign - tax_amount;
    const net_local = net_foreign * exchange_rate_to_local;

    const result = {
      employee_id,
      gross_foreign,
      net_foreign,
      gross_local,
      net_local,
      details: {
        tax_country,
        exchange_rate: exchange_rate_to_local,
        daily_rate,
        days_worked,
        allowances,
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