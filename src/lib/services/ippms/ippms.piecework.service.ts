// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { IppmsPieceEntryInput, IppmsPieceWorkCatalogue, IppmsPieceWorkEntry, IppmsPieceWorkRate } from '@/lib/types/ippmsWorkforce';

export class IppmsPieceworkService {
  static async getPieceEntries(params: { projectId: string; start: string; end: string; employeeId?: string }) {
    const { projectId, start, end, employeeId } = params;
    const { data, error } = await supabase.rpc('ippms_get_piece_entries', {
      p_project_id: projectId,
      p_start: start,
      p_end: end,
      p_employee_id: employeeId || null
    });
    if (error) {
      console.error('ippms_get_piece_entries error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsPieceWorkEntry[];
  }

  static async savePieceEntries(projectId: string, records: IppmsPieceEntryInput[]) {
    const { error } = await supabase.rpc('ippms_save_piece_entries', {
      p_project_id: projectId,
      p_records: records
    });
    if (error) {
      console.error('ippms_save_piece_entries error', error);
      throw new Error(error.message);
    }
  }

  static async generateTemplate(projectId: string) {
    const { data, error } = await supabase.rpc('ippms_generate_piecework_template', {
      p_project_id: projectId
    });
    if (error) {
      console.error('ippms_generate_piecework_template error', error);
      throw new Error(error.message);
    }
    return data || [];
  }

  static async importTemplate(projectId: string, payload: any[]) {
    const { error } = await supabase.rpc('ippms_import_piecework_template', {
      p_project_id: projectId,
      p_payload: payload
    });
    if (error) {
      console.error('ippms_import_piecework_template error', error);
      throw new Error(error.message);
    }
  }

  static async getCatalogue() {
    const { data, error } = await supabase.schema('ippms').from('ippms_piece_work_catalogue').select('*').order('name');
    if (error) {
      console.error('ippms_piece_work_catalogue fetch error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsPieceWorkCatalogue[];
  }

  static async getRates(projectId: string, employeeId?: string) {
    let query = supabase.schema('ippms').from('ippms_piece_work_rates').select('*').eq('project_id', projectId);
    if (employeeId) {
      query = (query as any).eq('employee_id', employeeId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('ippms_piece_work_rates fetch error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsPieceWorkRate[];
  }
}









