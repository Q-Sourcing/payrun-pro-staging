import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ReminderRule = {
  organization_id: string;
  rule_type: "probation_expiry" | "contract_expiry";
  days_before: number;
  notify_roles: string[];
  notification_template: string | null;
  is_active: boolean;
};

type EmployeeRow = {
  id: string;
  organization_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  project_id: string | null;
  probation_end_date: string | null; // YYYY-MM-DD
  probation_status: string | null;
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
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY not found");
    }

    // Lightweight protection for cron-only invocation.
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

    const body = (await req.json().catch(() => ({}))) as { organizationId?: string };
    const orgFilter = body.organizationId?.trim() || null;

    let rulesQuery = supabaseAdmin
      .from("reminder_rules")
      .select("organization_id, rule_type, days_before, notify_roles, notification_template, is_active")
      .eq("is_active", true);
    if (orgFilter) rulesQuery = rulesQuery.eq("organization_id", orgFilter);

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) throw rulesError;

    const activeProbationRules = ((rules ?? []) as ReminderRule[]).filter((r) => r.rule_type === "probation_expiry");
    if (activeProbationRules.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = todayUtcDate();
    const inserts: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const rule of activeProbationRules) {
      const targetDate = toYyyyMmDdUtc(addDaysUtc(today, rule.days_before));

      const { data: employees, error: empErr } = await supabaseAdmin
        .from("employees")
        .select("id, organization_id, first_name, last_name, email, project_id, probation_end_date, probation_status")
        .eq("organization_id", rule.organization_id)
        .eq("status", "active")
        .in("probation_status", ["on_probation", "extended"])
        .eq("probation_end_date", targetDate);
      if (empErr) throw empErr;

      const dueEmployees = (employees ?? []) as EmployeeRow[];
      if (dueEmployees.length === 0) continue;

      // Resolve HR/admin recipients from notify_roles.
      const notifyRoleKeys = rule.notify_roles?.length ? rule.notify_roles : ["ORG_HR", "ORG_ADMIN"];
      const { data: orgRoles, error: rolesErr } = await supabaseAdmin
        .from("org_roles")
        .select("id, key")
        .eq("org_id", rule.organization_id)
        .in("key", notifyRoleKeys);
      if (rolesErr) throw rolesErr;
      const roleIds = (orgRoles ?? []).map((r: any) => r.id);

      let hrUserIds: string[] = [];
      if (roleIds.length > 0) {
        const { data: our, error: ourErr } = await supabaseAdmin
          .from("org_user_roles")
          .select("org_user_id, role_id")
          .in("role_id", roleIds);
        if (ourErr) throw ourErr;
        const orgUserIds = Array.from(new Set((our ?? []).map((x: any) => x.org_user_id)));

        if (orgUserIds.length > 0) {
          const { data: orgUsers, error: ouErr } = await supabaseAdmin
            .from("org_users")
            .select("id, user_id, status")
            .eq("org_id", rule.organization_id)
            .in("id", orgUserIds);
          if (ouErr) throw ouErr;
          hrUserIds = Array.from(new Set((orgUsers ?? []).filter((ou: any) => ou.status === "active").map((ou: any) => ou.user_id)));
        }
      }

      // Resolve project managers in bulk.
      const projectIds = Array.from(new Set(dueEmployees.map((e) => e.project_id).filter(Boolean))) as string[];
      const projectManagerByProject = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projects, error: projErr } = await supabaseAdmin
          .from("projects")
          .select("id, responsible_manager_id")
          .in("id", projectIds);
        if (projErr) throw projErr;
        (projects ?? []).forEach((p: any) => {
          if (p?.id && p?.responsible_manager_id) projectManagerByProject.set(p.id, p.responsible_manager_id);
        });
      }

      for (const emp of dueEmployees) {
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
          inserts.push({
            user_id: recipientId,
            type: "probation_reminder",
            title: "Probation Expiry Reminder",
            message,
            metadata: {
              rule_type: "probation_expiry",
              days_before: rule.days_before,
              employee_id: emp.id,
              employee_email: emp.email,
              probation_end_date: emp.probation_end_date,
              organization_id: emp.organization_id,
              project_id: emp.project_id,
              manager_user_id: mgrId ?? null,
            },
          });
        }
      }
    }

    if (inserts.length > 0) {
      // Best-effort de-dupe: avoid multiple notifications per user/employee/day.
      const startOfDay = today.toISOString();
      const filtered: typeof inserts = [];

      for (const item of inserts) {
        const { data: existing } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("user_id", item.user_id)
          .eq("type", item.type)
          .gte("created_at", startOfDay)
          .contains("metadata", {
            rule_type: item.metadata.rule_type,
            employee_id: item.metadata.employee_id,
            days_before: item.metadata.days_before,
            probation_end_date: item.metadata.probation_end_date,
          } as any)
          .limit(1);

        if (!existing || existing.length === 0) filtered.push(item);
      }

      if (filtered.length > 0) {
        const { error: insErr } = await supabaseAdmin.from("notifications").insert(filtered);
        if (insErr) throw insErr;
      }

      return new Response(JSON.stringify({ success: true, processed: inserts.length, inserted: filtered.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, processed: 0, inserted: 0 }), {
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

