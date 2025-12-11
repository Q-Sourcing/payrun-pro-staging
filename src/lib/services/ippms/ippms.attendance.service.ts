import { supabase } from '@/integrations/supabase/client';
import type { IppmsAttendanceRecord, IppmsAttendanceUpsertInput } from '@/lib/types/ippmsWorkforce';

export class IppmsAttendanceService {
  static async getAttendance(params: { projectId: string; start: string; end: string; employeeId?: string }) {
    const { projectId, start, end, employeeId } = params;
    const { data, error } = await supabase.rpc('ippms_get_attendance', {
      p_project_id: projectId,
      p_start: start,
      p_end: end,
      p_employee_id: employeeId || null
    });

    if (error) {
      console.error('ippms_get_attendance error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsAttendanceRecord[];
  }

  static async saveAttendanceBulk(projectId: string, records: IppmsAttendanceUpsertInput[]) {
    const { error } = await supabase.rpc('ippms_save_attendance_bulk', {
      p_project_id: projectId,
      p_records: records
    });

    if (error) {
      console.error('ippms_save_attendance_bulk error', error);
      throw new Error(error.message);
    }
  }

  static async generateTemplate(projectId: string) {
    const { data, error } = await supabase.rpc('ippms_generate_attendance_template', {
      p_project_id: projectId
    });
    if (error) {
      console.error('ippms_generate_attendance_template error', error);
      throw new Error(error.message);
    }
    return data || [];
  }

  static async importTemplate(projectId: string, payload: any[]) {
    const { error } = await supabase.rpc('ippms_import_attendance_template', {
      p_project_id: projectId,
      p_payload: payload
    });
    if (error) {
      console.error('ippms_import_attendance_template error', error);
      throw new Error(error.message);
    }
  }
}


