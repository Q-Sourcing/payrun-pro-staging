import { supabase } from '@/integrations/supabase/client';
import type { 
  ExpatriatePayGroup, 
  ExpatriatePayGroupFormData, 
  ExpatriateCalculationInput,
  ExpatriateCalculationResult 
} from '@/lib/types/expatriate-payroll';

export class ExpatriatePayrollService {
  /**
   * Get all expatriate pay groups
   */
  static async getExpatriatePayGroups(): Promise<ExpatriatePayGroup[]> {
    const { data, error } = await supabase
      .from('expatriate_pay_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get expatriate pay group by ID
   */
  static async getExpatriatePayGroup(id: string): Promise<ExpatriatePayGroup | null> {
    const { data, error } = await supabase
      .from('expatriate_pay_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create new expatriate pay group
   */
  static async createExpatriatePayGroup(payGroupData: ExpatriatePayGroupFormData): Promise<ExpatriatePayGroup> {
    const { data, error } = await supabase
      .from('expatriate_pay_groups')
      .insert([payGroupData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update expatriate pay group
   */
  static async updateExpatriatePayGroup(id: string, payGroupData: Partial<ExpatriatePayGroupFormData>): Promise<ExpatriatePayGroup> {
    const { data, error } = await supabase
      .from('expatriate_pay_groups')
      .update(payGroupData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete expatriate pay group
   */
  static async deleteExpatriatePayGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('expatriate_pay_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Calculate expatriate payroll using Edge Function
   */
  static async calculateExpatriatePay(input: ExpatriateCalculationInput): Promise<ExpatriateCalculationResult> {
    const { data, error } = await supabase.functions.invoke('calculate-expatriate-pay', {
      body: input
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get expatriate pay run items for a pay run
   * Now uses the dedicated expatriate_pay_run_items table
   */
  static async getExpatriatePayRunItems(payRunId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('expatriate_pay_run_items')
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
   * Create or update expatriate pay run item
   * Now uses the dedicated expatriate_pay_run_items table
   */
  static async upsertExpatriatePayRunItem(itemData: any): Promise<any> {
    const { data, error } = await supabase
      .from('expatriate_pay_run_items')
      .upsert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete expatriate pay run item
   * Now uses the dedicated expatriate_pay_run_items table
   */
  static async deleteExpatriatePayRunItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('expatriate_pay_run_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get employees assigned to a specific expatriate pay group
   * Hybrid approach: checks both employees.pay_group_id and paygroup_employees table
   */
  static async getEmployeesForPayGroup(payGroupId: string): Promise<any[]> {
    try {
      // Fetch employees directly linked via employees.pay_group_id
      const { data: directEmployees, error: directError } = await supabase
        .from('employees')
        .select('*')
        .eq('pay_group_id', payGroupId)
        .eq('employee_type', 'expat');

      if (directError) throw directError;

      // Fetch employees linked via paygroup_employees join table
      const { data: joinedEmployees, error: joinError } = await supabase
        .from('paygroup_employees')
        .select(`
          employee_id,
          employees (
            id,
            employee_number,
            first_name,
            middle_name,
            last_name,
            email,
            phone,
            pay_type,
            pay_rate,
            country,
            currency,
            status,
            employee_type,
            pay_group_id
          )
        `)
        .eq('pay_group_id', payGroupId)
        .eq('active', true);

      if (joinError) throw joinError;

      // Flatten join table results
      const joinedEmployeesList = (joinedEmployees || [])
        .map(j => j.employees)
        .filter(e => e && e.employee_type === 'expat');

      // Merge unique employees (avoid duplicates by checking id)
      const directList = directEmployees || [];
      const uniqueJoinedEmployees = joinedEmployeesList.filter(
        je => !directList.some(de => de.id === je.id)
      );

      return [...directList, ...uniqueJoinedEmployees];
    } catch (error) {
      console.error('Failed to load expatriates for group:', error);
      return [];
    }
  }

  /**
   * Get currency symbol for a currency code
   */
  static getCurrencySymbol(currencyCode: string): string {
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'UGX': 'USh',
      'KES': 'KSh',
      'TZS': 'TSh',
      'RWF': 'RF',
      'SSP': 'SS£'
    };
    return currencyMap[currencyCode] || currencyCode;
  }

  /**
   * Format currency amount with symbol
   */
  static formatCurrency(amount: number | undefined | null, currencyCode: string): string {
    const symbol = this.getCurrencySymbol(currencyCode);
    const safeAmount = amount ?? 0;
    return `${symbol}${safeAmount.toLocaleString()}`;
  }

  /**
   * Format dual currency display (Foreign → Local)
   */
  static formatDualCurrency(foreignAmount: number, foreignCurrency: string, localAmount: number, localCurrency: string, exchangeRate: number): string {
    const foreignSymbol = this.getCurrencySymbol(foreignCurrency);
    const localSymbol = this.getCurrencySymbol(localCurrency);
    
    return `${foreignSymbol}${foreignAmount.toLocaleString()} → ${localSymbol}${localAmount.toLocaleString()} (Rate: ${exchangeRate})`;
  }
}
