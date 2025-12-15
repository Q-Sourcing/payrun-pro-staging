import { supabase } from '@/integrations/supabase/client';
import type { IppmsEmployeeShift, IppmsShift } from '@/lib/types/ippmsWorkforce';

export class IppmsShiftsService {
  static async getShifts(projectId: string) {
    const { data, error } = await supabase.rpc('ippms_get_shifts', {
      p_project_id: projectId
    });
    if (error) {
      console.error('ippms_get_shifts error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsShift[];
  }

  static async assignShift(params: { employeeId: string; projectId: string; shiftId: string; start: string; end?: string | null }) {
    const { employeeId, projectId, shiftId, start, end } = params;
    const { data, error } = await supabase.rpc('ippms_assign_shift', {
      p_employee_id: employeeId,
      p_project_id: projectId,
      p_shift_id: shiftId,
      p_start: start,
      p_end: end || null
    });
    if (error) {
      console.error('ippms_assign_shift error', error);
      throw new Error(error.message);
    }
    return data as string;
  }

  static async getEmployeeShifts(projectId: string, employeeId: string) {
    const { data, error } = await supabase
      .schema('ippms')
      .from('ippms_employee_shifts')
      .select('*')
      .eq('project_id', projectId)
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('ippms_employee_shifts fetch error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsEmployeeShift[];
  }
}



