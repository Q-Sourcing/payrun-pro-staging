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

// Fetch my employee record
async function fetchMyEmployee() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("employees")
    .select("id, organization_id, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
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
