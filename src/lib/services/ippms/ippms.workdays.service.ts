import { supabase } from '@/integrations/supabase/client';
import type { IppmsWorkDayRow, IppmsWorkType } from '@/lib/types/ippmsWorkforce';

export class IppmsWorkdaysService {
  static async getWorkDays(params: { projectId: string; start: string; end: string; employeeId?: string }) {
    const { projectId, start, end, employeeId } = params;
    const { data, error } = await supabase.rpc('ippms_get_work_days', {
      p_project_id: projectId,
      p_start: start,
      p_end: end,
      p_employee_id: employeeId || null
    });

    if (error) {
      console.error('ippms_get_work_days error', error);
      throw new Error(error.message);
    }

    return (data || []) as IppmsWorkDayRow[];
  }

  static async updateWorkType(params: { employeeId: string; projectId: string; workDate: string; workType: IppmsWorkType }) {
    const { employeeId, projectId, workDate, workType } = params;
    const { data, error } = await supabase.rpc('ippms_update_work_type', {
      p_employee_id: employeeId,
      p_project_id: projectId,
      p_work_date: workDate,
      p_work_type: workType
    });

    if (error) {
      console.error('ippms_update_work_type error', error);
      throw new Error(error.message);
    }

    return data as string;
  }
}




