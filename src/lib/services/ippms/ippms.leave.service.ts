import { supabase } from '@/integrations/supabase/client';
import type { IppmsLeaveApplyInput, IppmsLeaveRequest, IppmsLeaveType } from '@/lib/types/ippmsWorkforce';

export class IppmsLeaveService {
  static async getLeaveTypes() {
    const { data, error } = await supabase.schema('ippms').from('ippms_leave_types').select('*').order('name');
    if (error) {
      console.error('ippms_leave_types fetch error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsLeaveType[];
  }

  static async getLeaveRequests(projectId: string, employeeId?: string) {
    let query = supabase.schema('ippms').from('ippms_leave_requests').select('*').eq('project_id', projectId);
    if (employeeId) {
      query = (query as any).eq('employee_id', employeeId);
    }
    const { data, error } = await query.order('start_date', { ascending: false });
    if (error) {
      console.error('ippms_leave_requests fetch error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsLeaveRequest[];
  }

  static async applyLeave(input: IppmsLeaveApplyInput) {
    const { data, error } = await supabase.rpc('ippms_apply_leave', {
      p_employee_id: input.employee_id,
      p_project_id: input.project_id,
      p_leave_type_id: input.leave_type_id,
      p_start: input.start_date,
      p_end: input.end_date,
      p_reason: input.reason || null
    });
    if (error) {
      console.error('ippms_apply_leave error', error);
      throw new Error(error.message);
    }
    return data as string;
  }
}


