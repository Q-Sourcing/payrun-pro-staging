// @ts-nocheck - Types out of sync with DB schema; regenerate with `npx supabase gen types`
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
   * Now includes allowances from expatriate_pay_run_item_allowances table
   */
  static async getExpatriatePayRunItems(payRunId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('expatriate_pay_run_items')
      .select(`
        id,
        pay_run_id,
        employee_id,
        expatriate_pay_group_id,
        organization_id,
        daily_rate,
        days_worked,
        allowances_foreign,
        net_foreign,
        net_local,
        gross_local,
        gross_foreign,
        tax_country,
        exchange_rate_to_local,
        currency,
        notes,
        created_at,
        updated_at,
        employees (
          id,
          first_name,
          middle_name,
          last_name,
          email
        )
      `)
      .eq('pay_run_id', payRunId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Fetch allowances for each pay run item
    const itemsWithAllowances = await Promise.all(
      (data || []).map(async (item) => {
        const { data: allowances } = await supabase
          .from('expatriate_pay_run_item_allowances')
          .select('*')
          .eq('expatriate_pay_run_item_id', item.id)
          .order('name', { ascending: true });
        
        return {
          ...item,
          allowances: allowances || []
        };
      })
    );
    
    return itemsWithAllowances;
  }

  /**
   * Create or update expatriate pay run item
   * Now uses the dedicated expatriate_pay_run_items table
   */
  static async upsertExpatriatePayRunItem(itemData: any): Promise<any> {
    // Remove fields that are not columns in the table (relations, computed fields, etc.)
    const {
      allowances,      // This is from a separate table
      employee,        // This is a relation
      employees,       // This is a relation
      totalPayFX,      // Computed field
      totalPayLocal,   // Computed field
      grossFX,         // Computed field
      ...cleanData
    } = itemData;

    // If organization_id is missing, fetch it from the pay_run
    if (!cleanData.organization_id && cleanData.pay_run_id) {
      const { data: payRun } = await supabase
        .from('pay_runs')
        .select('organization_id')
        .eq('id', cleanData.pay_run_id)
        .single();
      
      if (payRun?.organization_id) {
        cleanData.organization_id = payRun.organization_id;
      }
    }

    const { data, error } = await supabase
      .from('expatriate_pay_run_items')
      .upsert([cleanData])
      .select()
      .single();

    if (error) throw error;
    
    // If the original item had allowances, fetch them and attach to the result
    if (allowances && Array.isArray(allowances)) {
      const { data: fetchedAllowances } = await supabase
        .from('expatriate_pay_run_item_allowances')
        .select('*')
        .eq('expatriate_pay_run_item_id', data.id)
        .order('name', { ascending: true });
      
      return {
        ...data,
        allowances: fetchedAllowances || []
      };
    }
    
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
   * Return employees explicitly assigned to the given pay group.
   * Supports both legacy `paygroup_employees` and new `employee_pay_groups` tables,
   * and also the direct `employees.pay_group_id` field.
   */
  static async getEmployeesForPayGroup(payGroupId: string): Promise<any[]> {
    try {
      // A) New join table: employee_pay_groups
      let viaEmployeePayGroups: any[] = []
      const epg = await supabase
        .from('employee_pay_groups')
        .select(`employee:employees(*)`)
        .eq('pay_group_id', payGroupId)
        .is('unassigned_on', null)
      if (!epg.error) viaEmployeePayGroups = (epg.data || []).map((r:any)=> r.employee).filter(Boolean)

      // B) Legacy join table: paygroup_employees
      let viaLegacyJoin: any[] = []
      const leg = await supabase
        .from('paygroup_employees')
        .select(`employee:employees(*)`)
        .eq('pay_group_id', payGroupId)
      if (!leg.error) viaLegacyJoin = (leg.data || []).map((r:any)=> r.employee).filter(Boolean)

      // C) Direct field on employees (older schema)
      let viaDirect: any[] = []
      const dir = await supabase
        .from('employees')
        .select('*')
        .eq('pay_group_id', payGroupId)
      if (!dir.error) viaDirect = dir.data || []

      const all = [...viaEmployeePayGroups, ...viaLegacyJoin, ...viaDirect]
      const unique = all.filter((e, idx) => e && all.findIndex(x => x?.id === e?.id) === idx)
      return unique
    } catch (e) {
      console.error('Failed to load employees for pay group:', e)
      return []
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

  /**
   * Get allowances for a specific pay run item
   */
  static async getAllowancesForPayRunItem(payRunItemId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('expatriate_pay_run_item_allowances')
      .select('*')
      .eq('expatriate_pay_run_item_id', payRunItemId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new allowance for a pay run item
   */
  static async createAllowance(payRunItemId: string, name: string, amount: number): Promise<any> {
    const { data, error } = await supabase
      .from('expatriate_pay_run_item_allowances')
      .insert([{
        expatriate_pay_run_item_id: payRunItemId,
        name: name.trim(),
        amount: amount
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an allowance amount
   */
  static async updateAllowance(allowanceId: string, amount: number): Promise<any> {
    const { data, error } = await supabase
      .from('expatriate_pay_run_item_allowances')
      .update({ amount, updated_at: new Date().toISOString() })
      .eq('id', allowanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete an allowance
   */
  static async deleteAllowance(allowanceId: string): Promise<void> {
    const { error } = await supabase
      .from('expatriate_pay_run_item_allowances')
      .delete()
      .eq('id', allowanceId);

    if (error) throw error;
  }

  /**
   * Bulk create allowances for multiple pay run items
   * @param payRunItemIds Array of pay run item IDs
   * @param name Allowance name
   * @param amounts Either a single number (same for all) or a Record mapping employee_id to amount
   */
  static async bulkCreateAllowances(
    payRunItemIds: string[], 
    name: string, 
    amounts: number | Record<string, number>
  ): Promise<any[]> {
    const isSameAmount = typeof amounts === 'number';
    const allowanceName = name.trim();

    if (isSameAmount) {
      // Same amount for all
      const allowancesToCreate = payRunItemIds.map(itemId => ({
        expatriate_pay_run_item_id: itemId,
        name: allowanceName,
        amount: amounts as number
      }));

      const { data, error } = await supabase
        .from('expatriate_pay_run_item_allowances')
        .insert(allowancesToCreate)
        .select();

      if (error) throw error;
      return data || [];
    } else {
      // Different amounts per employee - need to map payRunItemId to employee_id
      // First, get the pay run items to map IDs to employee_ids
      const { data: payRunItems } = await supabase
        .from('expatriate_pay_run_items')
        .select('id, employee_id')
        .in('id', payRunItemIds);

      if (!payRunItems) return [];

      const allowancesToCreate = payRunItems
        .filter(item => amounts[item.employee_id] !== undefined)
        .map(item => ({
          expatriate_pay_run_item_id: item.id,
          name: allowanceName,
          amount: amounts[item.employee_id]
        }));

      if (allowancesToCreate.length === 0) return [];

      const { data, error } = await supabase
        .from('expatriate_pay_run_item_allowances')
        .insert(allowancesToCreate)
        .select();

      if (error) throw error;
      return data || [];
    }
  }
}
