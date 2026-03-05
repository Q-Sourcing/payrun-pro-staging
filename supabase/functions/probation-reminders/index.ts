import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date();
  const thresholds = [
    { days: 30, type: "30_days" },
    { days: 7, type: "7_days" },
    { days: 1, type: "1_day" },
  ];

  let totalSent = 0;
  const errors: string[] = [];

  for (const threshold of thresholds) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + threshold.days);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    // Find employees whose probation ends on targetDate and haven't been reminded yet
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, organization_id, probation_end_date, probation_status")
      .eq("probation_end_date", targetDateStr)
      .eq("probation_status", "active")
      .eq("status", "active");

    if (empError) {
      errors.push(`Query error for ${threshold.type}: ${empError.message}`);
      continue;
    }

    for (const emp of employees ?? []) {
      // Check if reminder already sent
      const { data: existing } = await supabase
        .from("probation_reminder_logs")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("reminder_type", threshold.type)
        .maybeSingle();

      if (existing) continue; // Already sent

      const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ");

      // Queue email via email_outbox
      const { error: emailError } = await supabase.from("email_outbox").insert({
        event_key: "probation_reminder",
        recipient_email: emp.email,
        recipient_name: fullName,
        subject: `Probation Review Reminder: ${fullName} — ${threshold.days} day(s) remaining`,
        body_html: `
          <h2>Probation Period Reminder</h2>
          <p>This is an automated reminder that <strong>${fullName}</strong>'s probation period ends on <strong>${emp.probation_end_date}</strong> (${threshold.days} day(s) from today).</p>
          <p>Please schedule the probation review meeting and update the employee's status accordingly.</p>
        `,
        org_id: emp.organization_id,
        status: "pending",
      });

      if (emailError) {
        errors.push(`Email queue error for ${emp.id}: ${emailError.message}`);
        continue;
      }

      // Log the reminder
      await supabase.from("probation_reminder_logs").insert({
        employee_id: emp.id,
        organization_id: emp.organization_id,
        reminder_type: threshold.type,
      });

      totalSent++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, reminders_sent: totalSent, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
