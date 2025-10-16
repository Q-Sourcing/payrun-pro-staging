import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { employee_id, pay_group_id, assigned_by, notes } = await req.json();
    
    if (!employee_id || !pay_group_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400 }
      );
    }

    const { data, error } = await supabase
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

    if (error) {
      const msg = String(error.message || "");
      if (msg.includes("Strict Mode")) {
        return new Response(
          JSON.stringify({
            error: "This employee is already active in another paygroup. Your organization uses strict mode."
          }), 
          { status: 409 }
        );
      }
      return new Response(
        JSON.stringify({ error: msg }), 
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }), 
      { status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }), 
      { status: 400 }
    );
  }
});
