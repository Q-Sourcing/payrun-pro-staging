import { supabase } from '@/integrations/supabase/client';

export interface AnomalyLog {
  id: string;
  organization_id: string | null;
  project_id: string | null;
  anomaly_type: string;
  severity: 'critical' | 'warning' | 'info';
  section: 'timesheet' | 'employee' | 'approval' | 'payrun';
  affected_record_type: string;
  affected_record_id: string | null;
  affected_employee_id: string | null;
  description: string;
  metadata: Record<string, any>;
  status: 'active' | 'dismissed' | 'resolved';
  detected_at: string;
  detected_by: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_action: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetAnomalyCheck {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  current_units?: number;
  max_units?: number;
  entry_rate?: number;
  employee_rate?: number;
}

export class AnomalyService {
  static async getAnomalies(params: {
    organizationId: string;
    severity?: string;
    section?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AnomalyLog[]; count: number }> {
    let query = (supabase as any)
      .from('anomaly_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .order('detected_at', { ascending: false });

    if (params.severity) query = query.eq('severity', params.severity);
    if (params.section) query = query.eq('section', params.section);
    if (params.status) query = query.eq('status', params.status);
    else query = query.eq('status', 'active');

    if (params.limit) query = query.limit(params.limit);
    if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  static async getAnomalyCounts(organizationId: string): Promise<{
    critical: number;
    warning: number;
    info: number;
    total: number;
  }> {
    const { data, error } = await (supabase as any).rpc('get_anomaly_counts', {
      p_org_id: organizationId,
    });
    if (error) throw error;
    return data || { critical: 0, warning: 0, info: 0, total: 0 };
  }

  static async checkTimesheetAnomalies(params: {
    employeeId: string;
    projectId: string;
    workDate: string;
    taskDescription: string;
    units: number;
    rate: number;
    entryId?: string;
  }): Promise<TimesheetAnomalyCheck[]> {
    const { data, error } = await (supabase as any).rpc('check_timesheet_anomalies', {
      p_employee_id: params.employeeId,
      p_project_id: params.projectId,
      p_work_date: params.workDate,
      p_task_description: params.taskDescription,
      p_units: params.units,
      p_rate: params.rate,
      p_entry_id: params.entryId || null,
    });
    if (error) throw error;
    return data || [];
  }

  static async checkPayrunAnomalies(payrunId: string): Promise<TimesheetAnomalyCheck[]> {
    const { data, error } = await (supabase as any).rpc('check_payrun_anomalies', {
      p_payrun_id: payrunId,
    });
    if (error) throw error;
    return data || [];
  }

  static async dismissAnomaly(id: string, note: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('anomaly_logs')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
        resolved_by: (await supabase.auth.getUser()).data.user?.id,
        resolution_action: 'dismissed',
        resolution_note: note,
      })
      .eq('id', id);
    if (error) throw error;
  }

  static async resolveAnomaly(id: string, action: string, note: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('anomaly_logs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: (await supabase.auth.getUser()).data.user?.id,
        resolution_action: action,
        resolution_note: note,
      })
      .eq('id', id);
    if (error) throw error;
  }

  static async logAnomaly(params: {
    organizationId: string;
    projectId?: string;
    anomalyType: string;
    severity: 'critical' | 'warning' | 'info';
    section: 'timesheet' | 'employee' | 'approval' | 'payrun';
    affectedRecordType: string;
    affectedRecordId?: string;
    affectedEmployeeId?: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { error } = await (supabase as any)
      .from('anomaly_logs')
      .insert({
        organization_id: params.organizationId,
        project_id: params.projectId || null,
        anomaly_type: params.anomalyType,
        severity: params.severity,
        section: params.section,
        affected_record_type: params.affectedRecordType,
        affected_record_id: params.affectedRecordId || null,
        affected_employee_id: params.affectedEmployeeId || null,
        description: params.description,
        metadata: params.metadata || {},
      });
    if (error) throw error;
  }
}
