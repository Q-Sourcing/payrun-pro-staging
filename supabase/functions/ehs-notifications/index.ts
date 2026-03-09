import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(d: Date, days: number): string {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().split("T")[0];
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

interface NotificationInsert {
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const notifications: NotificationInsert[] = [];
    const summary = { hazards: 0, training: 0, inspections: 0, corrective_actions: 0 };

    // ─── 1. 48-Hour Hazard Escalation ─────────────────────────
    // Hazards that have been open (reported/identified) for more than 48 hours
    const cutoff48h = hoursAgo(48);
    const { data: escalatedHazards, error: hazErr } = await supabase
      .from("ehs_hazards")
      .select("id, hazard_number, description, organization_id, assigned_to, site_location, risk_level, created_at")
      .in("status", ["reported", "identified"])
      .lt("created_at", cutoff48h);

    if (hazErr) console.error("Hazard query error:", hazErr.message);

    for (const hazard of escalatedHazards || []) {
      // Find org admins to notify
      const admins = await getOrgAdmins(supabase, hazard.organization_id);
      const targetUsers = hazard.assigned_to ? [hazard.assigned_to, ...admins] : admins;
      const uniqueUsers = [...new Set(targetUsers)];

      for (const userId of uniqueUsers) {
        // Check if we already sent this notification (deduplicate)
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "ehs_hazard_escalation")
          .contains("metadata", { hazard_id: hazard.id })
          .limit(1);

        if (existing && existing.length > 0) continue;

        notifications.push({
          user_id: userId,
          type: "ehs_hazard_escalation",
          title: `⚠️ Hazard Escalation: ${hazard.hazard_number}`,
          message: `Hazard "${hazard.description?.substring(0, 80)}" (${hazard.risk_level} risk) at ${hazard.site_location || "unspecified location"} has been open for more than 48 hours and requires immediate attention.`,
          metadata: { hazard_id: hazard.id, hazard_number: hazard.hazard_number, risk_level: hazard.risk_level },
        });
        summary.hazards++;
      }
    }

    // ─── 2. Training Expiry Alerts (30 days) ──────────────────
    // Training records expiring within the next 30 days
    const today = todayUtc().toISOString().split("T")[0];
    const thirtyDaysOut = addDays(todayUtc(), 30);

    const { data: expiringTraining, error: trainErr } = await supabase
      .from("ehs_training_records")
      .select("id, course_name, employee_id, organization_id, expiry_date, training_type")
      .eq("status", "completed")
      .gte("expiry_date", today)
      .lte("expiry_date", thirtyDaysOut);

    if (trainErr) console.error("Training query error:", trainErr.message);

    for (const record of expiringTraining || []) {
      // Notify the employee and org admins
      const admins = await getOrgAdmins(supabase, record.organization_id);

      // Get the employee's linked user_id
      const { data: empProfile } = await supabase
        .from("employees")
        .select("user_id")
        .eq("id", record.employee_id)
        .single();

      const targetUsers = empProfile?.user_id
        ? [empProfile.user_id, ...admins]
        : admins;
      const uniqueUsers = [...new Set(targetUsers)];

      const daysLeft = Math.ceil(
        (new Date(record.expiry_date!).getTime() - todayUtc().getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const userId of uniqueUsers) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "ehs_training_expiry")
          .contains("metadata", { training_id: record.id })
          .limit(1);

        if (existing && existing.length > 0) continue;

        notifications.push({
          user_id: userId,
          type: "ehs_training_expiry",
          title: `📋 Training Expiring: ${record.course_name}`,
          message: `${record.training_type} training "${record.course_name}" expires in ${daysLeft} day(s) on ${record.expiry_date}. Please schedule renewal.`,
          metadata: { training_id: record.id, expiry_date: record.expiry_date, employee_id: record.employee_id },
        });
        summary.training++;
      }
    }

    // ─── 3. Inspection Overdue Alerts ─────────────────────────
    // Inspections with scheduled_date in the past that are still scheduled (not completed/cancelled)
    const { data: overdueInspections, error: inspErr } = await supabase
      .from("ehs_inspections")
      .select("id, inspection_number, organization_id, inspector_id, scheduled_date, type")
      .eq("status", "scheduled")
      .lt("scheduled_date", today);

    if (inspErr) console.error("Inspection query error:", inspErr.message);

    for (const insp of overdueInspections || []) {
      const admins = await getOrgAdmins(supabase, insp.organization_id);
      const targetUsers = insp.inspector_id ? [insp.inspector_id, ...admins] : admins;
      const uniqueUsers = [...new Set(targetUsers)];

      const daysOverdue = Math.ceil(
        (todayUtc().getTime() - new Date(insp.scheduled_date!).getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const userId of uniqueUsers) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "ehs_inspection_overdue")
          .contains("metadata", { inspection_id: insp.id })
          .limit(1);

        if (existing && existing.length > 0) continue;

        notifications.push({
          user_id: userId,
          type: "ehs_inspection_overdue",
          title: `🔍 Inspection Overdue: ${insp.inspection_number}`,
          message: `${insp.type} inspection ${insp.inspection_number} was scheduled for ${insp.scheduled_date} and is now ${daysOverdue} day(s) overdue. Please complete or reschedule.`,
          metadata: { inspection_id: insp.id, inspection_number: insp.inspection_number, scheduled_date: insp.scheduled_date },
        });
        summary.inspections++;
      }
    }

    // ─── 4. Corrective Action Deadline Reminders ──────────────
    // CAs with due_date within the next 7 days or already past due
    const sevenDaysOut = addDays(todayUtc(), 7);

    const { data: upcomingCAs, error: caErr } = await supabase
      .from("ehs_corrective_actions")
      .select("id, description, organization_id, assigned_to, responsible_person, due_date, priority, status")
      .in("status", ["open", "in_progress"])
      .lte("due_date", sevenDaysOut);

    if (caErr) console.error("Corrective action query error:", caErr.message);

    for (const ca of upcomingCAs || []) {
      const admins = await getOrgAdmins(supabase, ca.organization_id);
      const targetUsers = [
        ...(ca.assigned_to ? [ca.assigned_to] : []),
        ...(ca.responsible_person ? [ca.responsible_person] : []),
        ...admins,
      ];
      const uniqueUsers = [...new Set(targetUsers)];

      const dueDateObj = new Date(ca.due_date!);
      const daysDiff = Math.ceil(
        (dueDateObj.getTime() - todayUtc().getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysDiff < 0;
      const urgencyLabel = isOverdue
        ? `${Math.abs(daysDiff)} day(s) OVERDUE`
        : daysDiff === 0
        ? "DUE TODAY"
        : `due in ${daysDiff} day(s)`;

      for (const userId of uniqueUsers) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "ehs_ca_deadline")
          .contains("metadata", { ca_id: ca.id })
          .limit(1);

        if (existing && existing.length > 0) continue;

        notifications.push({
          user_id: userId,
          type: "ehs_ca_deadline",
          title: `${isOverdue ? "🔴" : "🟡"} Corrective Action ${urgencyLabel}`,
          message: `${ca.priority} priority corrective action "${ca.description?.substring(0, 80)}" is ${urgencyLabel} (${ca.due_date}). Status: ${ca.status}.`,
          metadata: { ca_id: ca.id, due_date: ca.due_date, priority: ca.priority },
        });
        summary.corrective_actions++;
      }
    }

    // ─── Insert all notifications ─────────────────────────────
    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertErr) {
        console.error("Failed to insert notifications:", insertErr.message);
        return new Response(
          JSON.stringify({ success: false, error: insertErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`EHS notifications processed: ${JSON.stringify(summary)}, total: ${notifications.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notifications.length,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("EHS notification error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helper: Get org admin user IDs ───────────────────────
async function getOrgAdmins(
  supabase: ReturnType<typeof createClient>,
  orgId: string
): Promise<string[]> {
  try {
    // Get org roles that are admin-level
    const { data: roles } = await supabase
      .from("org_roles")
      .select("id")
      .eq("org_id", orgId)
      .in("key", ["ORG_OWNER", "ORG_ADMIN", "ORG_HR"]);

    if (!roles || roles.length === 0) return [];
    const roleIds = roles.map((r: { id: string }) => r.id);

    // Get org_user_roles matching these roles
    const { data: userRoles } = await supabase
      .from("org_user_roles")
      .select("org_user_id")
      .in("role_id", roleIds);

    if (!userRoles || userRoles.length === 0) return [];
    const orgUserIds = userRoles.map((ur: { org_user_id: string }) => ur.org_user_id);

    // Get actual user IDs from org_users
    const { data: orgUsers } = await supabase
      .from("org_users")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("status", "active")
      .in("id", orgUserIds);

    return (orgUsers || []).map((ou: { user_id: string }) => ou.user_id);
  } catch (e) {
    console.error("Error fetching org admins:", e);
    return [];
  }
}
