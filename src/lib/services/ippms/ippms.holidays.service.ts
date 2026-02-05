import { supabase } from '@/integrations/supabase/client';
import type { IppmsHoliday, IppmsHolidayApplyInput } from '@/lib/types/ippmsWorkforce';

export class IppmsHolidaysService {
  static async getHolidays(projectId: string) {
    const { data, error } = await supabase.schema('ippms').from('ippms_holidays').select('*').or(`project_id.eq.${projectId},project_id.is.null`).order('holiday_date');
    if (error) {
      console.error('ippms_holidays fetch error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsHoliday[];
  }

  static async applyHoliday(input: IppmsHolidayApplyInput) {
    const { data, error } = await supabase.rpc('ippms_apply_holiday', {
      p_project_id: input.project_id,
      p_holiday_date: input.holiday_date,
      p_name: input.name,
      p_country: input.country || null
    });
    if (error) {
      console.error('ippms_apply_holiday error', error);
      throw new Error(error.message);
    }
    return data as string;
  }
}









