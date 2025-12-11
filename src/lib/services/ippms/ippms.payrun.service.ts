import { supabase } from '@/integrations/supabase/client';
import type { IppmsDailyPayrunRow, IppmsPiecePayrunRow } from '@/lib/types/ippmsWorkforce';

export class IppmsPayrunService {
  static async getDailyRows(params: { projectId: string; start: string; end: string }) {
    const { projectId, start, end } = params;
    const { data, error } = await supabase.rpc('ippms_daily_payrun_rows', {
      p_project_id: projectId,
      p_start: start,
      p_end: end
    });
    if (error) {
      console.error('ippms_daily_payrun_rows error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsDailyPayrunRow[];
  }

  static async lockDaily(payrunId: string, workDayIds: string[]) {
    const { error } = await supabase.rpc('ippms_lock_daily_payrun', {
      p_payrun_id: payrunId,
      p_work_day_ids: workDayIds
    });
    if (error) {
      console.error('ippms_lock_daily_payrun error', error);
      throw new Error(error.message);
    }
  }

  static async getPieceRows(params: { projectId: string; start: string; end: string }) {
    const { projectId, start, end } = params;
    const { data, error } = await supabase.rpc('ippms_piece_payrun_rows', {
      p_project_id: projectId,
      p_start: start,
      p_end: end
    });
    if (error) {
      console.error('ippms_piece_payrun_rows error', error);
      throw new Error(error.message);
    }
    return (data || []) as IppmsPiecePayrunRow[];
  }

  static async lockPiece(payrunId: string, pieceEntryIds: string[]) {
    const { error } = await supabase.rpc('ippms_lock_piece_payrun', {
      p_payrun_id: payrunId,
      p_piece_entry_ids: pieceEntryIds
    });
    if (error) {
      console.error('ippms_lock_piece_payrun error', error);
      throw new Error(error.message);
    }
  }
}


