import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

import {
  createServiceRoleClient,
  handleCorsPreflight,
  jsonResponse,
  requirePlatformAdmin,
} from "../_shared/platform-admin-auth.ts";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    org_id: z.string().uuid(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
    search: z.string().min(1).optional(),
    role_key: z.string().min(1).optional(),
    company_id: z.string().uuid().optional(),
    license: z.enum(["assigned", "unassigned"]).optional(),
    status: z.enum(["active", "disabled", "invited"]).optional(),
  }),
  z.object({
    action: z.literal("add_user"),
    org_id: z.string().uuid(),
    email: z.string().email(),
    status: z.string().optional(),
  }),
  z.object({
    action: z.literal("set_status"),
    org_user_id: z.string().uuid(),
    status: z.string(),
  }),
  z.object({
    action: z.literal("set_role"),
    org_user_id: z.string().uuid(),
    role_id: z.string().uuid(),
    add: z.boolean(),
  }),
  z.object({
    action: z.literal("set_company"),
    user_id: z.string().uuid(),
    company_id: z.string().uuid(),
    add: z.boolean(),
  }),
  z.object({
    action: z.literal("set_license"),
    org_id: z.string().uuid(),
    user_id: z.string().uuid(),
    active: z.boolean(),
    seat_type: z.string().optional(),
  }),
  z.object({
    action: z.literal("remove_user"),
    org_user_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("update_profile"),
    org_user_id: z.string().uuid(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
  }),
]);

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const auth = await requirePlatformAdmin(supabaseAdmin, req);
    if (!auth.ok) return auth.response;

    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => null);
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ success: false, message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    if (input.action === "list") {
      const orgId = input.org_id;
      const limit = input.limit ?? 25;
      const offset = input.offset ?? 0;
      const search = input.search?.trim();

      // Build filtered user_id/org_user_id sets for search/role/company/license
      let userIdFilter: string[] | null = null;
      let orgUserIdFilter: string[] | null = null;

      if (search) {
        const term = `%${search}%`;
        const { data: profileIds, error: pErr } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`);
        if (pErr) return jsonResponse({ success: false, message: "Search failed", error: pErr }, { status: 500 });
        userIdFilter = (profileIds ?? []).map((p) => p.id);
        if (userIdFilter.length === 0) {
          return jsonResponse({ success: true, users: [], total: 0 }, { status: 200 });
        }
      }

      if (input.company_id) {
        const { data: memberships, error: mErr } = await supabaseAdmin
          .from("user_company_memberships")
          .select("user_id")
          .eq("company_id", input.company_id);
        if (mErr) return jsonResponse({ success: false, message: "Company filter failed", error: mErr }, { status: 500 });
        const ids = Array.from(new Set((memberships ?? []).map((m) => m.user_id)));
        userIdFilter = userIdFilter ? userIdFilter.filter((id) => ids.includes(id)) : ids;
        if (userIdFilter.length === 0) {
          return jsonResponse({ success: true, users: [], total: 0 }, { status: 200 });
        }
      }

      if (input.license) {
        const { data: seats, error: sErr } = await supabaseAdmin
          .from("org_license_assignments")
          .select("user_id, active")
          .eq("org_id", orgId);
        if (sErr) return jsonResponse({ success: false, message: "License filter failed", error: sErr }, { status: 500 });
        const assigned = Array.from(
          new Set((seats ?? []).filter((s) => (s.active ?? true) === true).map((s) => s.user_id)),
        );
        if (input.license === "assigned") {
          userIdFilter = userIdFilter ? userIdFilter.filter((id) => assigned.includes(id)) : assigned;
        } else {
          // unassigned
          if (assigned.length > 0) {
            userIdFilter = userIdFilter ? userIdFilter.filter((id) => !assigned.includes(id)) : null;
          }
        }
        if (userIdFilter && userIdFilter.length === 0) {
          return jsonResponse({ success: true, users: [], total: 0 }, { status: 200 });
        }
      }

      if (input.role_key) {
        const { data: roleRow, error: rErr } = await supabaseAdmin
          .from("org_roles")
          .select("id")
          .eq("org_id", orgId)
          .eq("key", input.role_key)
          .maybeSingle();
        if (rErr) return jsonResponse({ success: false, message: "Role filter failed", error: rErr }, { status: 500 });
        if (!roleRow) {
          return jsonResponse({ success: true, users: [], total: 0 }, { status: 200 });
        }
        const { data: our, error: ourErr } = await supabaseAdmin
          .from("org_user_roles")
          .select("org_user_id")
          .eq("role_id", roleRow.id);
        if (ourErr) return jsonResponse({ success: false, message: "Role filter failed", error: ourErr }, { status: 500 });
        orgUserIdFilter = Array.from(new Set((our ?? []).map((x) => x.org_user_id)));
        if (orgUserIdFilter.length === 0) {
          return jsonResponse({ success: true, users: [], total: 0 }, { status: 200 });
        }
      }

      let q = supabaseAdmin
        .from("org_users")
        .select("id, org_id, user_id, status, created_at", { count: "exact" })
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (input.status) q = q.eq("status", input.status);
      if (userIdFilter) q = q.in("user_id", userIdFilter);
      if (orgUserIdFilter) q = q.in("id", orgUserIdFilter);

      const { data: orgUsers, error: ouError, count } = await q.range(offset, offset + limit - 1);
      if (ouError) return jsonResponse({ success: false, message: "Failed to load org users", error: ouError }, { status: 500 });

      const userIds = (orgUsers ?? []).map((u) => u.user_id);
      const orgUserIds = (orgUsers ?? []).map((u) => u.id);

      const sentinel = ["00000000-0000-0000-0000-000000000000"];
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds.length ? userIds : sentinel);

      const { data: roles } = await supabaseAdmin
        .from("org_user_roles")
        .select("org_user_id, org_roles(key)")
        .in("org_user_id", orgUserIds.length ? orgUserIds : sentinel);

      const { data: memberships } = await supabaseAdmin
        .from("user_company_memberships")
        .select("user_id, company_id")
        .in("user_id", userIds.length ? userIds : sentinel);

      const { data: licenseAssignments } = await supabaseAdmin
        .from("org_license_assignments")
        .select("user_id, active")
        .eq("org_id", orgId);

      const rolesByOrgUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: { org_user_id: string; org_roles: { key: string } | null }) => {
        if (!rolesByOrgUser[r.org_user_id]) rolesByOrgUser[r.org_user_id] = [];
        if (r.org_roles?.key) rolesByOrgUser[r.org_user_id].push(r.org_roles.key);
      });

      const companiesByUser: Record<string, string[]> = {};
      (memberships ?? []).forEach((m: { user_id: string; company_id: string }) => {
        if (!companiesByUser[m.user_id]) companiesByUser[m.user_id] = [];
        companiesByUser[m.user_id].push(m.company_id);
      });

      const licenseByUser: Record<string, boolean> = {};
      (licenseAssignments ?? []).forEach((l: { user_id: string; active: boolean | null }) => {
        licenseByUser[l.user_id] = l.active ?? true;
      });

      const enriched = (orgUsers ?? []).map((u) => {
        const p = (profiles ?? []).find((p) => p.id === u.user_id);
        return {
          ...u,
          email: p?.email ?? null,
          first_name: p?.first_name ?? null,
          last_name: p?.last_name ?? null,
          full_name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || null,
          roles: rolesByOrgUser[u.id] ?? [],
          companies: companiesByUser[u.user_id] ?? [],
          license_assigned: licenseByUser[u.user_id] ?? false,
        };
      });

      return jsonResponse({ success: true, users: enriched, total: count ?? 0 }, { status: 200 });
    }

    if (input.action === "add_user") {
      const { org_id, email, status } = input;
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (profileError) return jsonResponse({ success: false, message: "Profile lookup failed", error: profileError }, { status: 500 });
      if (!profile) return jsonResponse({ success: false, message: "User not found" }, { status: 404 });

      const { data: orgUser, error } = await supabaseAdmin
        .from("org_users")
        .insert({ org_id, user_id: profile.id, status: status ?? "active" })
        .select("id, user_id")
        .single();
      if (error) return jsonResponse({ success: false, message: "Failed to add org user", error }, { status: 500 });
      return jsonResponse({ success: true, org_user_id: orgUser.id, user_id: orgUser.user_id }, { status: 200 });
    }

    if (input.action === "update_profile") {
      const { org_user_id, first_name, last_name } = input;
      const { data: ou, error: ouErr } = await supabaseAdmin
        .from("org_users")
        .select("user_id")
        .eq("id", org_user_id)
        .maybeSingle();
      if (ouErr) return jsonResponse({ success: false, message: "Failed to load org user", error: ouErr }, { status: 500 });
      if (!ou) return jsonResponse({ success: false, message: "Org user not found" }, { status: 404 });

      const update: Record<string, any> = {};
      if (first_name !== undefined) update.first_name = first_name;
      if (last_name !== undefined) update.last_name = last_name;

      if (Object.keys(update).length > 0) {
        const { error } = await supabaseAdmin
          .from("user_profiles")
          .update(update)
          .eq("id", ou.user_id);
        if (error) return jsonResponse({ success: false, message: "Failed to update profile", error }, { status: 500 });
      }

      return jsonResponse({ success: true }, { status: 200 });
    }

    if (input.action === "set_status") {
      const { org_user_id, status } = input;
      const { error } = await supabaseAdmin.from("org_users").update({ status }).eq("id", org_user_id);
      if (error) return jsonResponse({ success: false, message: "Failed to update status", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (input.action === "set_role") {
      const { org_user_id, role_id, add } = input;
      if (add) {
        const { error } = await supabaseAdmin.from("org_user_roles").upsert({ org_user_id, role_id });
        if (error) return jsonResponse({ success: false, message: "Failed to add role", error }, { status: 500 });
      } else {
        const { error } = await supabaseAdmin
          .from("org_user_roles")
          .delete()
          .eq("org_user_id", org_user_id)
          .eq("role_id", role_id);
        if (error) return jsonResponse({ success: false, message: "Failed to remove role", error }, { status: 500 });
      }
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (input.action === "set_company") {
      const { user_id, company_id, add } = input;
      if (add) {
        const { error } = await supabaseAdmin.from("user_company_memberships").upsert({ user_id, company_id });
        if (error) return jsonResponse({ success: false, message: "Failed to add company membership", error }, { status: 500 });
      } else {
        const { error } = await supabaseAdmin
          .from("user_company_memberships")
          .delete()
          .eq("user_id", user_id)
          .eq("company_id", company_id);
        if (error) return jsonResponse({ success: false, message: "Failed to remove company membership", error }, { status: 500 });
      }
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (input.action === "set_license") {
      const { org_id, user_id, active, seat_type } = input;
      const { error } = await supabaseAdmin
        .from("org_license_assignments")
        .upsert({ org_id, user_id, active, seat_type: seat_type ?? "default" });
      if (error) return jsonResponse({ success: false, message: "Failed to update license assignment", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (input.action === "remove_user") {
      // Lookup org_id/user_id for cleanup, then delete org_users row
      const { data: ou, error: ouErr } = await supabaseAdmin
        .from("org_users")
        .select("org_id, user_id")
        .eq("id", input.org_user_id)
        .maybeSingle();
      if (ouErr) return jsonResponse({ success: false, message: "Failed to load org user", error: ouErr }, { status: 500 });
      if (!ou) return jsonResponse({ success: false, message: "Org user not found" }, { status: 404 });

      // Remove license assignment for this org+user (if present)
      await supabaseAdmin.from("org_license_assignments").delete().eq("org_id", ou.org_id).eq("user_id", ou.user_id);

      const { error } = await supabaseAdmin.from("org_users").delete().eq("id", input.org_user_id);
      if (error) return jsonResponse({ success: false, message: "Failed to remove org user", error }, { status: 500 });
      return jsonResponse({ success: true }, { status: 200 });
    }

    return jsonResponse({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("platform-admin-org-users error", err);
    return jsonResponse({ success: false, message: "Unexpected error" }, { status: 500 });
  }
});



