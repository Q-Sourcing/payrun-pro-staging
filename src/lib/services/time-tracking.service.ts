// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface TimeTrackingEntry {
  id?: string;
  organization_id: string;
  employee_id: string;
  project_id?: string | null;
  task_title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  is_running: boolean;
  is_billable: boolean;
  tags?: string[];
}

export class TimeTrackingService {
  static async getEntries(employeeId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
    projectId?: string;
    isRunning?: boolean;
  }) {
    let query = supabase
      .from('time_tracking_entries')
      .select('*, projects(id, name)')
      .eq('employee_id', employeeId)
      .order('start_time', { ascending: false });

    if (filters?.dateFrom) query = query.gte('start_time', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('start_time', filters.dateTo);
    if (filters?.projectId) query = query.eq('project_id', filters.projectId);
    if (filters?.isRunning !== undefined) query = query.eq('is_running', filters.isRunning);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getRunningEntry(employeeId: string) {
    const { data, error } = await supabase
      .from('time_tracking_entries')
      .select('*, projects(id, name)')
      .eq('employee_id', employeeId)
      .eq('is_running', true)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async startTimer(entry: Omit<TimeTrackingEntry, 'id' | 'end_time' | 'duration_minutes'>) {
    // Stop any running timer first
    await supabase
      .from('time_tracking_entries')
      .update({
        is_running: false,
        end_time: new Date().toISOString(),
        duration_minutes: 0, // will be recalculated
      })
      .eq('employee_id', entry.employee_id)
      .eq('is_running', true);

    const { data, error } = await supabase
      .from('time_tracking_entries')
      .insert({ ...entry, is_running: true })
      .select('*, projects(id, name)')
      .single();
    if (error) throw error;
    return data;
  }

  static async stopTimer(entryId: string) {
    const endTime = new Date().toISOString();

    // Get start time to calculate duration
    const { data: entry } = await supabase
      .from('time_tracking_entries')
      .select('start_time')
      .eq('id', entryId)
      .single();

    const durationMinutes = entry
      ? Math.round((new Date(endTime).getTime() - new Date(entry.start_time).getTime()) / 60000)
      : 0;

    const { data, error } = await supabase
      .from('time_tracking_entries')
      .update({
        is_running: false,
        end_time: endTime,
        duration_minutes: durationMinutes,
      })
      .eq('id', entryId)
      .select('*, projects(id, name)')
      .single();
    if (error) throw error;
    return data;
  }

  static async createManualEntry(entry: Omit<TimeTrackingEntry, 'id' | 'is_running'>) {
    const durationMinutes = entry.end_time && entry.start_time
      ? Math.round((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 60000)
      : entry.duration_minutes || 0;

    const { data, error } = await supabase
      .from('time_tracking_entries')
      .insert({
        ...entry,
        is_running: false,
        duration_minutes: durationMinutes,
      })
      .select('*, projects(id, name)')
      .single();
    if (error) throw error;
    return data;
  }

  static async updateEntry(id: string, updates: Partial<TimeTrackingEntry>) {
    if (updates.start_time && updates.end_time) {
      updates.duration_minutes = Math.round(
        (new Date(updates.end_time).getTime() - new Date(updates.start_time).getTime()) / 60000
      );
    }

    const { data, error } = await supabase
      .from('time_tracking_entries')
      .update(updates)
      .eq('id', id)
      .select('*, projects(id, name)')
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteEntry(id: string) {
    const { error } = await supabase
      .from('time_tracking_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  static async getDailySummary(employeeId: string, date: string) {
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from('time_tracking_entries')
      .select('duration_minutes, is_billable, project_id, projects(id, name)')
      .eq('employee_id', employeeId)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .eq('is_running', false);

    if (error) throw error;

    const totalMinutes = (data || []).reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const billableMinutes = (data || []).filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    return { totalMinutes, billableMinutes, entries: data?.length || 0 };
  }

  // Admin: get all org entries
  static async getOrgEntries(orgId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    projectId?: string;
  }) {
    let query = supabase
      .from('time_tracking_entries')
      .select('*, projects(id, name), employees(id, first_name, last_name, employee_number)')
      .eq('organization_id', orgId)
      .order('start_time', { ascending: false });

    if (filters?.dateFrom) query = query.gte('start_time', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('start_time', filters.dateTo);
    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters?.projectId) query = query.eq('project_id', filters.projectId);

    const { data, error } = await query.limit(200);
    if (error) throw error;
    return data;
  }
}
