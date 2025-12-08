import { supabase } from '@/integrations/supabase/client';

export type PayRunType = 'local' | 'expatriate' | 'piece_rate' | 'intern';

export interface PayRunItemBase {
  id: string;
  pay_run_id: string;
  employee_id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalPayRunItem extends PayRunItemBase {
  basic_salary: number;
  hours_worked?: number;
  overtime_hours: number;
  overtime_rate: number;
  pieces_completed?: number;
  piece_rate: number;
  gross_pay: number;
  tax_deduction: number;
  benefit_deductions: number;
  custom_deductions: number;
  total_deductions: number;
  net_pay: number;
  nssf_employee: number;
  nssf_employer: number;
  paye_tax: number;
  local_currency: string;
}

export interface ExpatriatePayRunItem extends PayRunItemBase {
  expatriate_pay_group_id: string;
  daily_rate: number;
  days_worked: number;
  allowances_foreign: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  education_allowance: number;
  gross_foreign: number;
  net_foreign: number;
  gross_local: number;
  net_local: number;
  exchange_rate: number;
  foreign_currency: string;
  local_currency: string;
  tax_country: string;
  tax_rate: number;
}

export interface PieceRatePayRunItem extends PayRunItemBase {
  pieces_completed: number;
  piece_rate: number;
  piece_type: string;
  gross_pay: number;
  tax_deduction: number;
  benefit_deductions: number;
  custom_deductions: number;
  total_deductions: number;
  net_pay: number;
  nssf_employee: number;
  nssf_employer: number;
  paye_tax: number;
  local_currency: string;
  tax_country: string;
}

export interface InternPayRunItem extends PayRunItemBase {
  stipend_amount: number;
  hours_worked?: number;
  learning_hours: number;
  project_hours: number;
  gross_pay: number;
  tax_deduction: number;
  net_pay: number;
  internship_duration_months?: number;
  mentor_id?: string;
  department?: string;
  learning_objectives?: string[];
}

export type PayRunItem = LocalPayRunItem | ExpatriatePayRunItem | PieceRatePayRunItem | InternPayRunItem;

/**
 * Unified service for managing pay run items across all types
 * Provides a consistent interface while leveraging type-specific tables
 */
export class PayRunTypeService {
  /**
   * Get the appropriate table name for a pay run type
   */
  private static getTableName(payRunType: PayRunType): string {
    const tableMap = {
      local: 'local_pay_run_items',
      expatriate: 'expatriate_pay_run_items',
      piece_rate: 'local_pay_run_items', // Piece rate uses local table since they're local employees
      intern: 'intern_pay_run_items'
    };
    return tableMap[payRunType];
  }

  /**
   * Get pay run items for a specific pay run and type
   */
  static async getPayRunItems<T extends PayRunItem>(
    payRunId: string, 
    payRunType: PayRunType
  ): Promise<T[]> {
    const tableName = this.getTableName(payRunType);
    
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        employees (
          id,
          first_name,
          middle_name,
          last_name,
          email,
          employee_type
        )
      `)
      .eq('pay_run_id', payRunId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new pay run item for a specific type
   */
  static async createPayRunItem<T extends PayRunItem>(
    payRunType: PayRunType,
    itemData: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<T> {
    const tableName = this.getTableName(payRunType);
    
    const { data, error } = await supabase
      .from(tableName)
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a pay run item for a specific type
   */
  static async updatePayRunItem<T extends PayRunItem>(
    payRunType: PayRunType,
    itemId: string,
    updates: Partial<Omit<T, 'id' | 'pay_run_id' | 'employee_id' | 'created_at' | 'updated_at'>>
  ): Promise<T> {
    const tableName = this.getTableName(payRunType);
    
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a pay run item for a specific type
   */
  static async deletePayRunItem(
    payRunType: PayRunType,
    itemId: string
  ): Promise<void> {
    const tableName = this.getTableName(payRunType);
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }

  /**
   * Get pay run items with employee details for a specific type
   */
  static async getPayRunItemsWithEmployees<T extends PayRunItem>(
    payRunId: string,
    payRunType: PayRunType
  ): Promise<(T & { employee: any })[]> {
    const tableName = this.getTableName(payRunType);
    
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        employees!inner (
          id,
          first_name,
          middle_name,
          last_name,
          email,
          employee_type,
          pay_type,
          pay_rate,
          country,
          currency
        )
      `)
      .eq('pay_run_id', payRunId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get summary statistics for a pay run by type
   */
  static async getPayRunSummary(
    payRunId: string,
    payRunType: PayRunType
  ): Promise<{
    totalItems: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    statusCounts: Record<string, number>;
  }> {
    const tableName = this.getTableName(payRunType);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('gross_pay, net_pay, total_deductions, status')
      .eq('pay_run_id', payRunId);

    if (error) throw error;

    const items = data || [];
    const totalItems = items.length;
    const totalGrossPay = items.reduce((sum, item) => sum + (item.gross_pay || 0), 0);
    const totalNetPay = items.reduce((sum, item) => sum + (item.net_pay || 0), 0);
    const totalDeductions = items.reduce((sum, item) => sum + (item.total_deductions || 0), 0);
    
    const statusCounts = items.reduce((counts, item) => {
      const status = item.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalItems,
      totalGrossPay,
      totalNetPay,
      totalDeductions,
      statusCounts
    };
  }

  /**
   * Bulk update pay run items for a specific type
   */
  static async bulkUpdatePayRunItems<T extends PayRunItem>(
    payRunType: PayRunType,
    updates: Array<{
      id: string;
      updates: Partial<Omit<T, 'id' | 'pay_run_id' | 'employee_id' | 'created_at' | 'updated_at'>>;
    }>
  ): Promise<T[]> {
    const tableName = this.getTableName(payRunType);
    const results: T[] = [];

    for (const { id, updates: itemUpdates } of updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(itemUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${payRunType} pay run item ${id}:`, error);
        continue;
      }

      results.push(data);
    }

    return results;
  }

  /**
   * Get all pay run types that have items for a given pay run
   */
  static async getActivePayRunTypes(payRunId: string): Promise<PayRunType[]> {
    const types: PayRunType[] = [];
    
    for (const payRunType of ['local', 'expatriate', 'piece_rate', 'intern'] as PayRunType[]) {
      const tableName = this.getTableName(payRunType);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq('pay_run_id', payRunId)
        .limit(1);

      if (!error && data && data.length > 0) {
        types.push(payRunType);
      }
    }

    return types;
  }
}
