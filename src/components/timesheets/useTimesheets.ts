import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export interface TimesheetEntry {
  id?: string;
  timesheet_id?: string;
  employee_id: string;
  work_date: string;
  hours_worked: number;
  department: string;
  task_description: string;
  linked_pay_run_id?: string | null;
  is_aggregated?: boolean;
}

export interface Timesheet {
  id: string;
  organization_id: string;
  employee_id: string;
  project_id?: string | null;
  period_start: string;
  period_end: string;
  status: TimesheetStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  reviewer_notes?: string | null;
  total_hours: number;
  created_at: string;
  updated_at: string;
  timesheet_entries?: TimesheetEntry[];
}

export interface TimesheetIdentity {
  userId: string;
  userEmail: string | null;
  organizationId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  matchedVia: "user_id" | "email_fallback" | "none";
}

const DEFAULT_DEPARTMENTS = [
  "Administration",
  "Construction",
  "Electrical",
  "Engineering",
  "Finance",
  "HR",
  "IT",
  "Logistics",
  "Maintenance",
  "Operations",
  "Procurement",
  "Safety & Security",
  "Site Management",
  "Welding & Fabrication",
];

async function resolveTimesheetIdentity(): Promise<TimesheetIdentity | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const identityBase: TimesheetIdentity = {
    userId: user.id,
    userEmail: user.email ?? null,
    organizationId: null,
    employeeId: null,
    employeeName: null,
    matchedVia: "none",
  };

  const { data: direct } = await supabase
    .from("employees")
    .select("id, organization_id, first_name, last_name, email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (direct) {
    return {
      ...identityBase,
      organizationId: direct.organization_id,
      employeeId: direct.id,
      employeeName: [direct.first_name, direct.last_name].filter(Boolean).join(" ").trim() || null,
      matchedVia: "user_id",
    };
  }

  // Fallback: some users exist as employees but user_id is not linked yet.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id || !profile?.email) {
    return identityBase;
  }

  const { data: byEmail } = await supabase
    .from("employees")
    .select("id, organization_id, first_name, last_name, email")
    .eq("organization_id", profile.organization_id)
    .ilike("email", profile.email)
    .maybeSingle();

  if (byEmail) {
    return {
      ...identityBase,
      organizationId: byEmail.organization_id,
      employeeId: byEmail.id,
      employeeName: [byEmail.first_name, byEmail.last_name].filter(Boolean).join(" ").trim() || null,
      matchedVia: "email_fallback",
    };
  }

  // Last read fallback: match by email across orgs when profile org is stale.
  const { data: globalByEmail } = await supabase
    .from("employees")
    .select("id, organization_id, first_name, last_name, email")
    .ilike("email", profile.email)
    .maybeSingle();

  if (globalByEmail) {
    return {
      ...identityBase,
      organizationId: globalByEmail.organization_id,
      employeeId: globalByEmail.id,
      employeeName: [globalByEmail.first_name, globalByEmail.last_name].filter(Boolean).join(" ").trim() || null,
      matchedVia: "email_fallback",
    };
  }

  return {
    ...identityBase,
    organizationId: profile.organization_id ?? null,
    matchedVia: "none",
  };
}

// Fetch my employee record
async function fetchMyEmployee() {
  const identity = await resolveTimesheetIdentity();
  if (identity?.employeeId && identity.organizationId) {
    return {
      id: identity.employeeId,
      organization_id: identity.organizationId,
      first_name: identity.employeeName ?? "",
      last_name: "",
    };
  }

  // Final fallback uses a SECURITY DEFINER function that handles RLS-safe
  // employee linking/provisioning for the current authenticated user.
  const { data: ensured, error: ensureError } = await (supabase as any).rpc(
    "ensure_timesheet_employee_for_current_user"
  );
  if (ensureError) {
    // Backward compatibility: if migration isn't applied yet, attempt direct insert path.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated.");

    // If RPC is not deployed yet, do not fail here; continue with legacy fallback path.
    const rpcMissing =
      ensureError.message?.includes("Could not find the function") ||
      ensureError.code === "PGRST202";

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id, email, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      // Try one more best-effort lookup by user_id/email across existing employees.
      const { data: byUser } = await supabase
        .from("employees")
        .select("id, organization_id, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (byUser) return byUser;

      if (user.email) {
        const { data: byEmailAny } = await supabase
          .from("employees")
          .select("id, organization_id, first_name, last_name")
          .ilike("email", user.email)
          .maybeSingle();
        if (byEmailAny) return byEmailAny;
      }

      throw new Error(
        rpcMissing
          ? "Timesheet setup is pending. Please refresh and try again in a moment."
          : (ensureError.message || "Failed to provision timesheet identity.")
      );
    }

    const emailFromProfile = profile.email || user.email || `${user.id}@timesheet.local`;
    const employeeNumberBase = `TS-${Date.now().toString().slice(-8)}`;
    const tryInsert = async (emailValue: string, employeeNumber: string) =>
      supabase
        .from("employees")
        .insert({
          organization_id: profile.organization_id,
          user_id: user.id,
          first_name: profile.first_name || (user.email ? user.email.split("@")[0] : "Timesheet"),
          last_name: profile.last_name || "User",
          email: emailValue,
          employee_number: employeeNumber,
          country: "UG",
          currency: "UGX",
          category: "head_office",
          employee_type: "regular",
          pay_rate: 1,
          pay_type: "hourly",
          status: "active",
          employment_status: "Active",
        })
        .select("id, organization_id, first_name, last_name")
        .single();

    let created = await tryInsert(emailFromProfile, employeeNumberBase);
    if (created.error) {
      created = await tryInsert(`${user.id}@timesheet.local`, `${employeeNumberBase}-A`);
    }
    if (created.data) return created.data;

    // Prefer concrete insert error over missing-RPC error.
    throw new Error(
      created.error?.message ||
      (rpcMissing
        ? "Unable to create your timesheet profile automatically yet."
        : ensureError.message) ||
      "Failed to provision timesheet identity."
    );
  }

  const row = Array.isArray(ensured) ? ensured[0] : ensured;
  if (!row?.employee_id) return null;

  const { data: employee } = await supabase
    .from("employees")
    .select("id, organization_id, first_name, last_name")
    .eq("id", row.employee_id)
    .maybeSingle();

  return employee ?? null;
}

export async function getCurrentTimesheetEmployee() {
  return fetchMyEmployee();
}

export function useTimesheetIdentity() {
  return useQuery({
    queryKey: ["timesheet-identity"],
    queryFn: async () => resolveTimesheetIdentity(),
  });
}

// Fetch departments for org (falls back to defaults)
export function useDepartments(organizationId?: string) {
  return useQuery({
    queryKey: ["timesheet-departments", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("timesheet_departments")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("name");
      if (data && data.length > 0) return data.map((d: any) => d.name);
      return DEFAULT_DEPARTMENTS;
    },
  });
}

// Fetch my timesheets
export function useMyTimesheets() {
  return useQuery({
    queryKey: ["my-timesheets"],
    queryFn: async () => {
      const emp = await fetchMyEmployee();
      if (!emp) return [];
      const { data, error } = await supabase
        .from("timesheets")
        .select("*, timesheet_entries(*)")
        .eq("employee_id", emp.id)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data || []) as Timesheet[];
    },
  });
}

// Fetch all submitted/approved timesheets (manager view)
export function useAllTimesheets() {
  return useQuery({
    queryKey: ["all-timesheets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return [];
      const { data, error } = await supabase
        .from("timesheets")
        .select(`
          *,
          timesheet_entries(*),
          employees(first_name, last_name, employee_number)
        `)
        .eq("organization_id", profile.organization_id)
        .in("status", ["submitted", "approved", "rejected"])
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// Create or fetch draft timesheet for a period
export function useUpsertTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      period_start: string;
      period_end: string;
      project_id?: string | null;
    }) => {
      const emp = await fetchMyEmployee();
      if (!emp) throw new Error("No employee record found for your user.");

      // Check for existing draft in the same period
      const { data: existing } = await supabase
        .from("timesheets")
        .select("*")
        .eq("employee_id", emp.id)
        .eq("period_start", payload.period_start)
        .eq("period_end", payload.period_end)
        .eq("status", "draft")
        .maybeSingle();

      if (existing) return existing as Timesheet;

      const { data, error } = await supabase
        .from("timesheets")
        .insert({
          organization_id: emp.organization_id,
          employee_id: emp.id,
          period_start: payload.period_start,
          period_end: payload.period_end,
          project_id: payload.project_id ?? null,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Timesheet;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-timesheets"] }),
    onError: (e: any) => {
      toast.error(e?.message || "Unable to create timesheet at the moment.");
    },
  });
}

// Save / upsert a single entry row
export function useSaveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: TimesheetEntry & { id?: string }) => {
      if (entry.id) {
        // Update
        const { data, error } = await supabase
          .from("timesheet_entries")
          .update({
            work_date: entry.work_date,
            hours_worked: entry.hours_worked,
            department: entry.department,
            task_description: entry.task_description,
          })
          .eq("id", entry.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("timesheet_entries")
          .insert({
            timesheet_id: entry.timesheet_id!,
            employee_id: entry.employee_id,
            work_date: entry.work_date,
            hours_worked: entry.hours_worked,
            department: entry.department,
            task_description: entry.task_description,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-timesheets"] });
      toast.success("Entry saved as draft");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save entry"),
  });
}

// Delete an entry row
export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("timesheet_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-timesheets"] }),
    onError: (e: any) => toast.error(e.message),
  });
}

// Batch submit a timesheet
export function useSubmitTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (timesheetId: string) => {
      const { data, error } = await supabase
        .from("timesheets")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", timesheetId)
        .eq("status", "draft")
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-timesheets"] });
      toast.success("Timesheet submitted for approval!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Manager: approve / reject
export function useReviewTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      timesheetId,
      action,
      notes,
    }: {
      timesheetId: string;
      action: "approved" | "rejected";
      notes?: string;
    }) => {
      const update: any = {
        status: action,
        reviewer_notes: notes ?? null,
      };
      if (action === "approved") {
        update.approved_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        update.approved_by = user?.id ?? null;
      }
      const { error } = await supabase
        .from("timesheets")
        .update(update)
        .eq("id", timesheetId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["all-timesheets"] });
      toast.success(`Timesheet ${vars.action}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}
