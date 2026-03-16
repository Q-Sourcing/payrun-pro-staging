import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ReminderRule = {
  id: string;
  organization_id: string;
  rule_type: "probation_expiry" | "contract_expiry" | "approval_reminder";
  days_before: number | null;
  days_after: number | null;
  notify_roles: string[];
  notification_template: string | null;
  is_active: boolean;
};

function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUtc(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toYyyyMmDdUtc(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renderTemplate(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(values)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not found");

    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret) {
      const got = req.headers.get("x-cron-secret") || "";
      if (got !== cronSecret) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const body = (await req.json().catch(() => ({}))) as { organizationId?: string };
    const orgFilter = body.organizationId?.trim() || null;

    let rulesQuery = supabaseAdmin
      .from("reminder_rules")
      .select("id, organization_id, rule_type, days_before, days_after, notify_roles, notification_template, is_active")
      .eq("is_active", true);
    if (orgFilter) rulesQuery = rulesQuery.eq("organization_id", orgFilter);

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) throw rulesError;

    const today = todayUtcDate();
    const notificationInserts: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    }> = [];

    // ── Probation reminders ───────────────────────────────────────────────
    const probationRules = ((rules ?? []) as ReminderRule[]).filter((r) => r.rule_type === "probation_expiry");

    for (const rule of probationRules) {
      if (!rule.days_before) continue;
      const targetDate = toYyyyMmDdUtc(addDaysUtc(today, rule.days_before));

      const { data: employees } = await supabaseAdmin
        .from("employees")
        .select("id, organization_id, first_name, last_name, email, project_id, probation_end_date, probation_status")
        .eq("organization_id", rule.organization_id)
        .eq("status", "active")
        .in("probation_status", ["on_probation", "extended"])
        .eq("probation_end_date", targetDate);

      if (!employees || employees.length === 0) continue;

      const notifyRoleKeys = rule.notify_roles?.length ? rule.notify_roles : ["ORG_HR", "ORG_ADMIN"];
      const { data: orgRoles } = await supabaseAdmin
        .from("org_roles")
        .select("id, key")
        .eq("org_id", rule.organization_id)
        .in("key", notifyRoleKeys);
      const roleIds = (orgRoles ?? []).map((r: any) => r.id);

      let hrUserIds: string[] = [];
      if (roleIds.length > 0) {
        const { data: our } = await supabaseAdmin
          .from("org_user_roles")
          .select("org_user_id")
          .in("role_id", roleIds);
        const orgUserIds = Array.from(new Set((our ?? []).map((x: any) => x.org_user_id)));
        if (orgUserIds.length > 0) {
          const { data: orgUsers } = await supabaseAdmin
            .from("org_users")
            .select("user_id, status")
            .eq("org_id", rule.organization_id)
            .in("id", orgUserIds);
          hrUserIds = Array.from(new Set((orgUsers ?? []).filter((ou: any) => ou.status === "active").map((ou: any) => ou.user_id)));
        }
      }

      const projectIds = Array.from(new Set(employees.map((e: any) => e.project_id).filter(Boolean))) as string[];
      const projectManagerByProject = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projects } = await supabaseAdmin.from("projects").select("id, responsible_manager_id").in("id", projectIds);
        (projects ?? []).forEach((p: any) => { if (p?.id && p?.responsible_manager_id) projectManagerByProject.set(p.id, p.responsible_manager_id); });
      }

      for (const emp of employees as any[]) {
        const employeeName = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim() || emp.email;
        const template = rule.notification_template || "Probation for {{employee_name}} ends in {{days_before}} day(s).";
        const message = renderTemplate(template, {
          employee_name: employeeName,
          days_before: String(rule.days_before),
          probation_end_date: String(emp.probation_end_date || ""),
        });
        const recipients = new Set<string>(hrUserIds);
        const mgrId = emp.project_id ? projectManagerByProject.get(emp.project_id) : undefined;
        if (mgrId) recipients.add(mgrId);

        for (const recipientId of recipients) {
          notificationInserts.push({
            user_id: recipientId,
            type: "probation_reminder",
            title: "Probation Expiry Reminder",
            message,
            metadata: { rule_type: "probation_expiry", days_before: rule.days_before, employee_id: emp.id, probation_end_date: emp.probation_end_date, organization_id: emp.organization_id },
          });
        }
      }
    }

    // ── Approval reminders ────────────────────────────────────────────────
    const approvalRules = ((rules ?? []) as ReminderRule[]).filter((r) => r.rule_type === "approval_reminder");

    for (const rule of approvalRules) {
      if (!rule.days_after) continue;

      // Find payruns that have been pending_approval for >= days_after days
      const submittedBefore = toYyyyMmDdUtc(addDaysUtc(today, -rule.days_after));

      const { data: stalePayruns } = await supabaseAdmin
        .from("pay_runs")
        .select("id, approval_current_level, approval_submitted_at, organization_id")
        .eq("approval_status", "pending_approval")
        .lte("approval_submitted_at", submittedBefore + "T23:59:59Z")
        .eq("organization_id", rule.organization_id);

      if (!stalePayruns || stalePayruns.length === 0) continue;

      for (const payrun of stalePayruns as any[]) {
        // Find the active step approver
        const { data: activeStep } = await supabaseAdmin
          .from("payrun_approval_steps")
          .select("approver_user_id")
          .eq("payrun_id", payrun.id)
          .eq("status", "pending")
          .eq("level", payrun.approval_current_level)
          .maybeSingle();

        if (!activeStep?.approver_user_id) continue;

        const template = rule.notification_template || "Payrun approval has been pending for {{days_after}} day(s). Please review.";
        const message = renderTemplate(template, {
          days_after: String(rule.days_after),
          payrun_id: payrun.id,
        });

        notificationInserts.push({
          user_id: activeStep.approver_user_id,
          type: "approval_reminder",
          title: "Payrun Approval Reminder",
          message,
          metadata: { rule_type: "approval_reminder", days_after: rule.days_after, payrun_id: payrun.id, organization_id: rule.organization_id },
        });

        // Also trigger email reminder
        try {
          await fetch(`${supabaseUrl}/functions/v1/trigger-approval-email`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payrun_id: payrun.id,
              event_key: "APPROVAL_REMINDER",
              recipient_user_id: activeStep.approver_user_id,
            }),
          });
        } catch (emailErr) {
          console.warn("Approval reminder email failed (non-fatal):", emailErr);
        }
      }
    }

    // ── Insert notifications (with dedup) ─────────────────────────────────
    let inserted = 0;
    if (notificationInserts.length > 0) {
      const startOfDay = today.toISOString();
      const filtered: typeof notificationInserts = [];

      for (const item of notificationInserts) {
        const { data: existing } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("user_id", item.user_id)
          .eq("type", item.type)
          .gte("created_at", startOfDay)
          .contains("metadata", { rule_type: item.metadata.rule_type } as any)
          .limit(1);

        if (!existing || existing.length === 0) filtered.push(item);
      }

      if (filtered.length > 0) {
        const { error: insErr } = await supabaseAdmin.from("notifications").insert(filtered);
        if (insErr) throw insErr;
        inserted = filtered.length;
      }
    }

    return new Response(JSON.stringify({ success: true, processed: notificationInserts.length, inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in check-reminders:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
