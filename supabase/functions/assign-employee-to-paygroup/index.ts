import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { employee_id, pay_group_id, assigned_by, notes } = await req.json();
    
    if (!employee_id || !pay_group_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // First, check if there's an existing record (active or inactive)
    const { data: existingRecord, error: checkError } = await supabase
      .from("paygroup_employees")
      .select("id, active")
      .eq("employee_id", employee_id)
      .eq("pay_group_id", pay_group_id)
      .maybeSingle();

    if (checkError) {
      return new Response(
        JSON.stringify({ error: `Check failed: ${checkError.message}` }), 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let data, error;

    if (existingRecord) {
      if (existingRecord.active) {
        // Employee is already actively assigned
        return new Response(
          JSON.stringify({ error: "Employee is already assigned to this pay group" }), 
          { 
            status: 409,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        // Reactivate the soft-deleted assignment
        const { data: reactivatedData, error: reactivateError } = await supabase
          .from("paygroup_employees")
          .update({ 
            active: true,
            assigned_by,
            notes,
            assigned_at: new Date().toISOString(),
            removed_at: null
          })
          .eq("id", existingRecord.id)
          .select()
          .single();
        
        data = reactivatedData;
        error = reactivateError;
      }
    } else {
      // Create new assignment
      const { data: newData, error: newError } = await supabase
        .from("paygroup_employees")
        .insert([{ 
          employee_id, 
          pay_group_id, 
          assigned_by, 
          notes,
          assigned_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      data = newData;
      error = newError;
    }

    if (error) {
      const msg = String(error.message || "");
      if (msg.includes("Strict Mode")) {
        return new Response(
          JSON.stringify({
            error: "This employee is already active in another paygroup. Your organization uses strict mode."
          }), 
          { 
            status: 409,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: msg }), 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }), 
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }), 
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
