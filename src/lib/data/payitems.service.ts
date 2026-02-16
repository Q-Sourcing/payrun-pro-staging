import { supabase } from '@/integrations/supabase/client';
import { createPayItemSchema, updatePayItemSchema, type CreatePayItemInput, type UpdatePayItemInput, type PayItemStatus } from '@/lib/validations/payitems.schema';
export type { PayItemsQueryOptions } from '@/lib/validations/payitems.schema';

export interface PayItem {
  id: string;
  pay_run_id: string;
  employee_id: string;
  hours_worked: number | null;
  pieces_completed: number | null;
  gross_pay: number;
  tax_deduction: number;
  benefit_deductions: number;
  employer_contributions: number;
  total_deductions: number;
  net_pay: number;
  status: PayItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayItemWithDetails extends PayItem {
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_number: string;
  };
  pay_run?: {
    id: string;
    pay_run_id: string;
    pay_period_start: string;
    pay_period_end: string;
    status: string;
  };
}

export class PayItemsService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get pay items with pagination and filters
   */
  static async getPayItems(options: PayItemsQueryOptions = {}): Promise<{
    data: PayItemWithDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      pay_run_id,
      employee_id,
      status,
      search,
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      let query = supabase
        .from('pay_items')
        .select(`
          *,
          employee:employee_id (
            id,
            first_name,
            last_name,
            email,
            employee_number
          ),
          pay_run:pay_run_id (
            id,
            pay_run_id,
            pay_period_start,
            pay_period_end,
            status
          )
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply filters
      if (pay_run_id) {
        query = query.eq('pay_run_id', pay_run_id);
      }

      if (employee_id) {
        query = query.eq('employee_id', employee_id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        // Search by employee name or email
        query = query.or(`employee.first_name.ilike.%${search}%,employee.last_name.ilike.%${search}%,employee.email.ilike.%${search}%`);
      }

      const { data: payItems, error, count } = await query;

      if (error) throw error;

      const transformedData: PayItemWithDetails[] = (payItems || []).map((item: any) => ({
        id: item.id,
        pay_run_id: item.pay_run_id,
        employee_id: item.employee_id,
        hours_worked: item.hours_worked,
        pieces_completed: item.pieces_completed,
        gross_pay: item.gross_pay || 0,
        tax_deduction: item.tax_deduction || 0,
        benefit_deductions: item.benefit_deductions || 0,
        employer_contributions: item.employer_contributions || 0,
        total_deductions: item.total_deductions || 0,
        net_pay: item.net_pay || 0,
        status: item.status as PayItemStatus,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        employee: item.employee ? {
          id: item.employee.id,
          first_name: item.employee.first_name,
          last_name: item.employee.last_name || '',
          email: item.employee.email,
          employee_number: item.employee.employee_number,
        } : undefined,
        pay_run: item.pay_run ? {
          id: item.pay_run.id,
          pay_run_id: item.pay_run.pay_run_id || '',
          pay_period_start: item.pay_run.pay_period_start,
          pay_period_end: item.pay_run.pay_period_end,
          status: item.pay_run.status,
        } : undefined,
      }));

      return {
        data: transformedData,
        total: count || 0,
        page,
        limit: safeLimit,
      };
    } catch (error: any) {
      console.error('Error fetching pay items:', error);
      throw new Error(`Failed to fetch pay items: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get pay items by pay run ID
   */
  static async getPayItemsByPayRun(payRunId: string): Promise<PayItemWithDetails[]> {
    const result = await this.getPayItems({ pay_run_id: payRunId, limit: 1000 });
    return result.data;
  }

  /**
   * Get pay items by employee ID
   */
  static async getPayItemsByEmployee(employeeId: string): Promise<PayItemWithDetails[]> {
    const result = await this.getPayItems({ employee_id: employeeId, limit: 1000 });
    return result.data;
  }

  /**
   * Get a single pay item by ID
   */
  static async getPayItemById(id: string): Promise<PayItemWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('pay_items')
        .select(`
          *,
          employee:employee_id (
            id,
            first_name,
            last_name,
            email,
            employee_number
          ),
          pay_run:pay_run_id (
            id,
            pay_run_id,
            pay_period_start,
            pay_period_end,
            status
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return {
        id: data.id,
        pay_run_id: data.pay_run_id,
        employee_id: data.employee_id,
        hours_worked: data.hours_worked,
        pieces_completed: data.pieces_completed,
        gross_pay: data.gross_pay || 0,
        tax_deduction: data.tax_deduction || 0,
        benefit_deductions: data.benefit_deductions || 0,
        employer_contributions: data.employer_contributions || 0,
        total_deductions: data.total_deductions || 0,
        net_pay: data.net_pay || 0,
        status: data.status as PayItemStatus,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
        employee: data.employee ? {
          id: data.employee.id,
          first_name: data.employee.first_name,
          last_name: data.employee.last_name || '',
          email: data.employee.email,
          employee_number: data.employee.employee_number,
        } : undefined,
        pay_run: data.pay_run ? {
          id: data.pay_run.id,
          pay_run_id: data.pay_run.pay_run_id || '',
          pay_period_start: data.pay_run.pay_period_start,
          pay_period_end: data.pay_run.pay_period_end,
          status: data.pay_run.status,
        } : undefined,
      };
    } catch (error: any) {
      console.error('Error fetching pay item:', error);
      throw new Error(`Failed to fetch pay item: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a new pay item with automatic calculation - Uses Edge Function
   */
  static async createPayItem(data: CreatePayItemInput): Promise<PayItem> {
    try {
      // Validate input
      const validatedData = createPayItemSchema.parse(data);

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-payitems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
        pay_run_id: validatedData.pay_run_id,
        employee_id: validatedData.employee_id,
        hours_worked: validatedData.hours_worked,
        pieces_completed: validatedData.pieces_completed,
        gross_pay: validatedData.gross_pay,
        tax_deduction: validatedData.tax_deduction,
        benefit_deductions: validatedData.benefit_deductions,
        employer_contributions: validatedData.employer_contributions,
        status: validatedData.status || 'draft',
        notes: validatedData.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create pay item');
      }

      return result.pay_item;
    } catch (error: any) {
      console.error('Error creating pay item:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to create pay item: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update a pay item with automatic recalculation - Uses Edge Function
   */
  static async updatePayItem(id: string, data: UpdatePayItemInput): Promise<PayItem> {
    try {
      // Validate input
      const validatedData = updatePayItemSchema.parse({ ...data, id });

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-payitems`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          hours_worked: validatedData.hours_worked,
          pieces_completed: validatedData.pieces_completed,
          gross_pay: validatedData.gross_pay,
          tax_deduction: validatedData.tax_deduction,
          benefit_deductions: validatedData.benefit_deductions,
          employer_contributions: validatedData.employer_contributions,
          status: validatedData.status,
          notes: validatedData.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update pay item');
      }

      return result.pay_item;
    } catch (error: any) {
      console.error('Error updating pay item:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update pay item: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a pay item - Uses Edge Function
   */
  static async deletePayItem(id: string): Promise<void> {
    try {
      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-payitems`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete pay item');
      }
    } catch (error: any) {
      console.error('Error deleting pay item:', error);
      throw new Error(`Failed to delete pay item: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Recalculate and update pay run totals based on pay items
   */
  private static async updatePayRunTotals(payRunId: string): Promise<void> {
    try {
      const { data: payItems, error } = await supabase
        .from('pay_items')
        .select('gross_pay, total_deductions, net_pay')
        .eq('pay_run_id', payRunId);

      if (error) throw error;

      const totals = (payItems || []).reduce(
        (acc, item) => {
          acc.total_gross_pay += item.gross_pay || 0;
          acc.total_deductions += item.total_deductions || 0;
          acc.total_net_pay += item.net_pay || 0;
          return acc;
        },
        { total_gross_pay: 0, total_deductions: 0, total_net_pay: 0 }
      );

      await supabase
        .from('pay_runs')
        .update({
          total_gross_pay: totals.total_gross_pay,
          total_deductions: totals.total_deductions,
          total_net_pay: totals.total_net_pay,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payRunId);
    } catch (error) {
      console.error('Error updating pay run totals:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Recalculate pay item based on hours/pieces and rates
   */
  static async recalculatePayItem(id: string, payRate: number, payType: 'hourly' | 'salary' | 'piece_rate' | 'daily_rate'): Promise<PayItem> {
    const existing = await this.getPayItemById(id);
    if (!existing) {
      throw new Error('Pay item not found');
    }

    let grossPay = 0;

    if (payType === 'hourly' && existing.hours_worked) {
      grossPay = existing.hours_worked * payRate;
    } else if (payType === 'piece_rate' && existing.pieces_completed) {
      grossPay = existing.pieces_completed * payRate;
    } else if (payType === 'salary' || payType === 'daily_rate') {
      grossPay = payRate; // For salary/daily rate, use the rate directly
    }

    // Calculate tax (assuming a simple percentage - should be configurable)
    const taxPercentage = 0.1; // 10% - should come from pay group settings
    const taxDeduction = grossPay * taxPercentage;

    // Benefit deductions would come from employee benefits
    const benefitDeductions = existing.benefit_deductions || 0;

    return this.updatePayItem(id, {
      gross_pay: grossPay,
      tax_deduction: taxDeduction,
      benefit_deductions: benefitDeductions,
    });
  }
}

