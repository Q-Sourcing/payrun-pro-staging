import { supabase } from '@/integrations/supabase/client';
import { createPayRunSchema, updatePayRunSchema, type CreatePayRunInput, type UpdatePayRunInput, type PayRunsQueryOptions, type PayRunStatus } from '@/lib/validations/payruns.schema';

export interface PayRun {
  id: string;
  pay_run_id?: string;
  pay_run_date: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_group_id?: string;
  pay_group_master_id?: string;
  status: PayRunStatus;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  category?: string;
  sub_type?: string;
  pay_frequency?: string;
  payroll_type?: string;
  exchange_rate?: number;
  days_worked?: number;
  created_at: string;
  updated_at: string;
}

export interface PayRunWithDetails extends PayRun {
  pay_group?: {
    id: string;
    name: string;
    country: string;
  };
  pay_items_count?: number;
}

export interface PayRunSummary {
  totalPayRuns: number;
  draftPayRuns: number;
  pendingApprovalPayRuns: number;
  approvedPayRuns: number;
  processedPayRuns: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
}

export class PayRunsService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get pay runs with pagination and filters
   */
  static async getPayRuns(options: PayRunsQueryOptions = {}): Promise<{
    data: PayRunWithDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      status,
      pay_group_id,
      pay_group_master_id,
      category,
      sub_type,
      date_from,
      date_to,
      search,
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      let query = supabase
        .from('pay_runs')
        .select(`
          *,
          pay_group_master:pay_group_master_id (
            id,
            name,
            country,
            currency,
            code,
            type
          )
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (pay_group_id) {
        query = query.eq('pay_group_id', pay_group_id);
      }

      if (pay_group_master_id) {
        query = query.eq('pay_group_master_id', pay_group_master_id);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (sub_type) {
        query = query.eq('sub_type', sub_type);
      }

      if (date_from) {
        query = query.gte('pay_period_start', date_from);
      }

      if (date_to) {
        query = query.lte('pay_period_end', date_to);
      }

      if (search) {
        query = query.or(`pay_run_id.ilike.%${search}%,payroll_type.ilike.%${search}%`);
      }

      const { data: payRuns, error, count } = await query;

      if (error) throw error;

      // Get pay items count for each pay run
      const payRunIds = (payRuns || []).map(pr => pr.id);
      let payItemsCounts: Record<string, number> = {};

      if (payRunIds.length > 0) {
        const { data: payItemsData } = await supabase
          .from('pay_items')
          .select('pay_run_id')
          .in('pay_run_id', payRunIds);

        payItemsCounts = (payItemsData || []).reduce((acc, item) => {
          acc[item.pay_run_id] = (acc[item.pay_run_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      const transformedData: PayRunWithDetails[] = (payRuns || []).map(pr => ({
        id: pr.id,
        pay_run_id: pr.pay_run_id,
        pay_run_date: pr.pay_run_date,
        pay_period_start: pr.pay_period_start,
        pay_period_end: pr.pay_period_end,
        pay_group_id: pr.pay_group_id,
        pay_group_master_id: pr.pay_group_master_id,
        status: pr.status as PayRunStatus,
        total_gross_pay: pr.total_gross_pay || 0,
        total_deductions: pr.total_deductions || 0,
        total_net_pay: pr.total_net_pay || 0,
        approved_by: pr.approved_by,
        approved_at: pr.approved_at,
        created_by: pr.created_by,
        category: pr.category,
        sub_type: pr.sub_type,
        pay_frequency: pr.pay_frequency,
        payroll_type: pr.payroll_type,
        exchange_rate: pr.exchange_rate,
        days_worked: pr.days_worked,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        pay_group: pr.pay_group_master ? {
          id: pr.pay_group_master.id,
          name: pr.pay_group_master.name,
          country: pr.pay_group_master.country,
        } : undefined,
        pay_items_count: payItemsCounts[pr.id] || 0,
      }));

      return {
        data: transformedData,
        total: count || 0,
        page,
        limit: safeLimit,
      };
    } catch (error: any) {
      console.error('Error fetching pay runs:', error);
      throw new Error(`Failed to fetch pay runs: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get a single pay run by ID
   */
  static async getPayRunById(id: string): Promise<PayRunWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('pay_runs')
        .select(`
          *,
          pay_group_master:pay_group_master_id (
            id,
            name,
            country,
            currency,
            code,
            type
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      // Get pay items count
      const { count } = await supabase
        .from('pay_items')
        .select('id', { count: 'exact', head: true })
        .eq('pay_run_id', id);

      return {
        id: data.id,
        pay_run_id: data.pay_run_id,
        pay_run_date: data.pay_run_date,
        pay_period_start: data.pay_period_start,
        pay_period_end: data.pay_period_end,
        pay_group_id: data.pay_group_id,
        pay_group_master_id: data.pay_group_master_id,
        status: data.status as PayRunStatus,
        total_gross_pay: data.total_gross_pay || 0,
        total_deductions: data.total_deductions || 0,
        total_net_pay: data.total_net_pay || 0,
        approved_by: data.approved_by,
        approved_at: data.approved_at,
        created_by: data.created_by,
        category: data.category,
        sub_type: data.sub_type,
        pay_frequency: data.pay_frequency,
        payroll_type: data.payroll_type,
        exchange_rate: data.exchange_rate,
        days_worked: data.days_worked,
        created_at: data.created_at,
        updated_at: data.updated_at,
        pay_group: data.pay_group_master ? {
          id: data.pay_group_master.id,
          name: data.pay_group_master.name,
          country: data.pay_group_master.country,
        } : undefined,
        pay_items_count: count || 0,
      };
    } catch (error: any) {
      console.error('Error fetching pay run:', error);
      throw new Error(`Failed to fetch pay run: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a new pay run - Uses Edge Function
   */
  static async createPayRun(data: CreatePayRunInput): Promise<PayRun> {
    try {
      // Validate input
      const validatedData = createPayRunSchema.parse(data);

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-payruns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pay_run_date: validatedData.pay_run_date || new Date().toISOString().split('T')[0],
          pay_period_start: validatedData.pay_period_start,
          pay_period_end: validatedData.pay_period_end,
          pay_group_id: validatedData.pay_group_id,
          pay_group_master_id: validatedData.pay_group_master_id,
          status: validatedData.status || 'draft',
          category: validatedData.category,
          sub_type: validatedData.sub_type,
          pay_frequency: validatedData.pay_frequency,
          payroll_type: validatedData.payroll_type,
          exchange_rate: validatedData.exchange_rate,
          days_worked: validatedData.days_worked,
          created_by: validatedData.created_by || user?.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create pay run');
      }

      return result.pay_run;
    } catch (error: any) {
      console.error('Error creating pay run:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to create pay run: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update a pay run with status transition validation - Uses Edge Function
   */
  static async updatePayRun(id: string, data: UpdatePayRunInput): Promise<PayRun> {
    try {
      // Validate input
      const validatedData = updatePayRunSchema.parse({ ...data, id });

      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-payruns`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          pay_run_date: validatedData.pay_run_date,
          pay_period_start: validatedData.pay_period_start,
          pay_period_end: validatedData.pay_period_end,
          pay_group_id: validatedData.pay_group_id,
          pay_group_master_id: validatedData.pay_group_master_id,
          status: validatedData.status,
          category: validatedData.category,
          sub_type: validatedData.sub_type,
          pay_frequency: validatedData.pay_frequency,
          payroll_type: validatedData.payroll_type,
          exchange_rate: validatedData.exchange_rate,
          days_worked: validatedData.days_worked,
          total_gross_pay: validatedData.total_gross_pay,
          total_deductions: validatedData.total_deductions,
          total_net_pay: validatedData.total_net_pay,
          approved_by: validatedData.approved_by || (validatedData.status === 'approved' ? user?.id : undefined),
          approved_at: validatedData.approved_at || (validatedData.status === 'approved' ? new Date().toISOString() : undefined),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update pay run');
      }

      return result.pay_run;
    } catch (error: any) {
      console.error('Error updating pay run:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update pay run: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a pay run - Uses Edge Function
   */
  static async deletePayRun(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/manage-payruns`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          hard_delete: hardDelete,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete pay run');
      }
    } catch (error: any) {
      console.error('Error deleting pay run:', error);
      throw new Error(`Failed to delete pay run: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update pay run status with transition validation
   */
  static async updatePayRunStatus(id: string, newStatus: PayRunStatus, approvedBy?: string): Promise<PayRun> {
    const existing = await this.getPayRunById(id);
    if (!existing) {
      throw new Error('Pay run not found');
    }

    this.validateStatusTransition(existing.status, newStatus);

    return this.updatePayRun(id, {
      status: newStatus,
      approved_by: newStatus === 'approved' ? approvedBy : undefined,
      approved_at: newStatus === 'approved' ? new Date().toISOString() : undefined,
    });
  }

  /**
   * Validate status transitions
   */
  private static validateStatusTransition(currentStatus: PayRunStatus, newStatus: PayRunStatus): void {
    const validTransitions: Record<PayRunStatus, PayRunStatus[]> = {
      draft: ['pending_approval', 'draft'],
      pending_approval: ['approved', 'draft'],
      approved: ['processed', 'pending_approval'],
      processed: [], // Cannot transition from processed
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Generate a unique pay run ID
   */
  private static generatePayRunId(data: CreatePayRunInput): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const prefix = data.category === 'projects' ? 'PRJ' : 'HOF';
    return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Get pay run summary statistics
   */
  static async getPayRunSummary(options: Omit<PayRunsQueryOptions, 'page' | 'limit'> = {}): Promise<PayRunSummary> {
    try {
      const { data, error } = await supabase
        .from('pay_runs')
        .select('status, total_gross_pay, total_deductions, total_net_pay');

      if (error) throw error;

      const summary: PayRunSummary = {
        totalPayRuns: data.length,
        draftPayRuns: 0,
        pendingApprovalPayRuns: 0,
        approvedPayRuns: 0,
        processedPayRuns: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
      };

      (data || []).forEach((pr: any) => {
        if (pr.status === 'draft') summary.draftPayRuns++;
        if (pr.status === 'pending_approval') summary.pendingApprovalPayRuns++;
        if (pr.status === 'approved') summary.approvedPayRuns++;
        if (pr.status === 'processed') summary.processedPayRuns++;

        summary.totalGrossPay += pr.total_gross_pay || 0;
        summary.totalDeductions += pr.total_deductions || 0;
        summary.totalNetPay += pr.total_net_pay || 0;
      });

      return summary;
    } catch (error: any) {
      console.error('Error fetching pay run summary:', error);
      throw new Error(`Failed to fetch pay run summary: ${error?.message || 'Unknown error'}`);
    }
  }
}

