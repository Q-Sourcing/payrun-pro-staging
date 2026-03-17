import { supabase } from '@/integrations/supabase/client';

export interface IppmsDailyTimesheetEntry {
  id: string;
  employee_id: string;
  project_id: string;
  organization_id: string;
  work_date: string;
  task_description: string;
  units: number;
  rate_snapshot: number;
  amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface IppmsProjectTask {
  id: string;
  project_id: string;
  task_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export class IppmsTimesheetService {
  static async getEntries(params: { projectId: string; start: string; end: string }): Promise<IppmsDailyTimesheetEntry[]> {
    const { data, error } = await (supabase as any)
      .from('ippms_daily_timesheet_entries')
      .select('*')
      .eq('project_id', params.projectId)
      .gte('work_date', params.start)
      .lte('work_date', params.end)
      .order('work_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  static async upsertEntry(entry: Partial<IppmsDailyTimesheetEntry>): Promise<IppmsDailyTimesheetEntry> {
    if (entry.id) {
      const { data, error } = await (supabase as any)
        .from('ippms_daily_timesheet_entries')
        .update({
          task_description: entry.task_description,
          units: entry.units,
          rate_snapshot: entry.rate_snapshot,
          status: entry.status,
        })
        .eq('id', entry.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await (supabase as any)
        .from('ippms_daily_timesheet_entries')
        .insert({
          employee_id: entry.employee_id,
          project_id: entry.project_id,
          organization_id: entry.organization_id,
          work_date: entry.work_date,
          task_description: entry.task_description || '',
          units: entry.units ?? 1,
          rate_snapshot: entry.rate_snapshot ?? 0,
          status: entry.status || 'draft',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  }

  static async deleteEntry(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('ippms_daily_timesheet_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  static async submitEntries(ids: string[]): Promise<void> {
    const { error } = await (supabase as any)
      .from('ippms_daily_timesheet_entries')
      .update({ status: 'submitted' })
      .in('id', ids);
    if (error) throw error;
  }

  static async approveEntries(ids: string[], approvedBy: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('ippms_daily_timesheet_entries')
      .update({ status: 'approved', approved_by: approvedBy })
      .in('id', ids);
    if (error) throw error;
  }

  static async rejectEntries(ids: string[], reason: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('ippms_daily_timesheet_entries')
      .update({ status: 'rejected', rejection_reason: reason })
      .in('id', ids);
    if (error) throw error;
  }

  // Project tasks
  static async getProjectTasks(projectId: string): Promise<IppmsProjectTask[]> {
    const { data, error } = await (supabase as any)
      .from('ippms_project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('task_name');
    if (error) throw error;
    return data || [];
  }

  static async createProjectTask(projectId: string, taskName: string, description?: string): Promise<IppmsProjectTask> {
    const { data, error } = await (supabase as any)
      .from('ippms_project_tasks')
      .insert({ project_id: projectId, task_name: taskName, description: description || null })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteProjectTask(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('ippms_project_tasks')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  }
}
