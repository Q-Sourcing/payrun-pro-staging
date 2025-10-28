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

    // First, check if employee is already in another active pay group
    const { data: existingActiveAssignment, error: activeCheckError } = await supabase
      .from("paygroup_employees")
      .select("id, pay_group_id, active")
      .eq("employee_id", employee_id)
      .eq("active", true)
      .maybeSingle();

    if (activeCheckError) {
      return new Response(
        JSON.stringify({ error: `Check failed: ${activeCheckError.message}` }), 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check if there's an existing record for this specific pay group (active or inactive)
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

    if (existingActiveAssignment && existingActiveAssignment.pay_group_id !== pay_group_id) {
      // Employee is already in another pay group - move them to this one
      // First, deactivate the current assignment
      const { error: deactivateError } = await supabase
        .from("paygroup_employees")
        .update({ 
          active: false, 
          removed_at: new Date().toISOString() 
        })
        .eq("id", existingActiveAssignment.id);

      if (deactivateError) {
        return new Response(
          JSON.stringify({ error: `Failed to deactivate existing assignment: ${deactivateError.message}` }), 
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Then create or reactivate assignment to the new pay group
      if (existingRecord) {
        // Reactivate the existing record for this pay group
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
      } else {
        // Use upsert to handle any existing records gracefully
        // The unique constraint is on employee_id only, so we use that for conflict resolution
        const { data: newData, error: newError } = await supabase
          .from("paygroup_employees")
          .upsert({ 
            employee_id, 
            pay_group_id, 
            assigned_by, 
            notes,
            assigned_at: new Date().toISOString(),
            active: true,
            removed_at: null
          }, {
            onConflict: 'employee_id'
          })
          .select()
          .single();
        
        data = newData;
        error = newError;
      }
    } else if (existingRecord) {
      if (existingRecord.active) {
        // Employee is already actively assigned to this pay group
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
      // Use upsert to handle any existing records gracefully
      // The unique constraint is on employee_id only, so we use that for conflict resolution
      const { data: newData, error: newError } = await supabase
        .from("paygroup_employees")
        .upsert({ 
          employee_id, 
          pay_group_id, 
          assigned_by, 
          notes,
          assigned_at: new Date().toISOString(),
          active: true,
          removed_at: null
        }, {
          onConflict: 'employee_id'
        })
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
