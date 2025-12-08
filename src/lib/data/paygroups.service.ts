import { supabase } from '@/integrations/supabase/client';
import type { PayGroup, PayGroupType } from '@/lib/types/paygroups';
import { createPayGroupSchema, updatePayGroupSchema, type CreatePayGroupInput, type UpdatePayGroupInput } from '@/lib/validations/paygroups.schema';
import { generatePayGroupId } from '@/lib/types/paygroups';

export interface PayGroupWithEmployeeCount extends PayGroup {
  employee_count: number;
}

export interface PayGroupsQueryOptions {
  page?: number;
  limit?: number;
  type?: PayGroupType | 'all';
  search?: string;
  include_employee_count?: boolean;
}

export interface PayGroupSummary {
  totalGroups: number;
  activeGroups: number;
  totalEmployees: number;
  currencies: string[];
  types: string[];
}

export class PayGroupsDataService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get all pay groups using optimized view-based queries
   */
  static async getPayGroups(options: PayGroupsQueryOptions = {}): Promise<{
    data: PayGroupWithEmployeeCount[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      type = 'all',
      search = '',
      include_employee_count = true
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      // Use a single query with UNION to get both regular and expatriate pay groups
      const { data, error, count } = await supabase
        .from('paygroup_summary_view')
        .select(
          `
          id,
          paygroup_id,
          name,
          type,
          country,
          currency,
          status,
          employee_count,
          created_at,
          updated_at,
          pay_frequency,
          default_tax_percentage,
          exchange_rate_to_local,
          default_daily_rate,
          tax_country,
          notes
        `,
          { count: 'exact' }
        )
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredData = data || [];

      // Apply filters
      if (type !== 'all') {
        filteredData = filteredData.filter(group => group.type === type);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(group =>
          group.name.toLowerCase().includes(searchLower) ||
          group.country.toLowerCase().includes(searchLower)
        );
      }

      return {
        data: filteredData,
        total: count || 0,
        page,
        limit: safeLimit
      };
    } catch (error) {
      console.error('Error fetching pay groups:', error);
      throw new Error(`Failed to fetch pay groups: ${error.message}`);
    }
  }

  /**
   * Get pay groups by type with optimized query
   */
  static async getPayGroupsByType(
    type: PayGroupType,
    options: Omit<PayGroupsQueryOptions, 'type'> = {}
  ): Promise<PayGroupWithEmployeeCount[]> {
    const result = await this.getPayGroups({
      ...options,
      type
    });
    return result.data;
  }

  /**
   * Get pay group summary statistics (cached)
   */
  static async getPayGroupSummary(): Promise<PayGroupSummary> {
    try {
      // Use a single aggregated query instead of fetching all groups
      const { data, error } = await supabase
        .from('paygroup_summary_view')
        .select(`
          type,
          status,
          employee_count,
          currency
        `);

      if (error) throw error;

      const summary: PayGroupSummary = {
        totalGroups: 0,
        activeGroups: 0,
        totalEmployees: 0,
        currencies: [],
        types: []
      };

      const typeSet = new Set<string>();
      const currencySet = new Set<string>();

      (data || []).forEach(group => {
        summary.totalGroups++;
        if (group.status === 'active') {
          summary.activeGroups++;
        }
        summary.totalEmployees += group.employee_count || 0;
        typeSet.add(group.type);
        currencySet.add(group.currency);
      });

      summary.types = Array.from(typeSet);
      summary.currencies = Array.from(currencySet);

      return summary;
    } catch (error) {
      console.error('Error fetching pay group summary:', error);
      throw new Error(`Failed to fetch pay group summary: ${error.message}`);
    }
  }

  /**
   * Get single pay group with employee count
   */
  static async getPayGroupById(id: string, type: PayGroupType): Promise<PayGroupWithEmployeeCount | null> {
    try {
      const tableName = type === 'regular' ? 'pay_groups' : 'expatriate_pay_groups';
      
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          id,
          name,
          country,
          currency,
          created_at,
          updated_at,
          ${type === 'regular' ? `
            pay_frequency,
            default_tax_percentage,
            description as notes
          ` : `
            exchange_rate_to_local,
            default_daily_rate,
            tax_country,
            notes
          `}
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      // Get employee count separately for efficiency
      const { count } = await supabase
        .from('paygroup_employees')
        .select('id', { count: 'exact', head: true })
        .eq('pay_group_id', id)
        .eq('active', true);

      const payGroup: PayGroupWithEmployeeCount = {
        id: data.id,
        paygroup_id: type === 'regular' 
          ? `REGP-${data.country.substring(0, 1)}${data.id.substring(0, 3)}`
          : `EXPG-${data.country.substring(0, 1)}${data.id.substring(0, 3)}`,
        name: data.name,
        type,
        country: data.country,
        currency: data.currency || 'UGX',
        status: 'active',
        employee_count: count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        notes: data.notes || data.description,
        ...(type === 'regular' ? {
          pay_frequency: data.pay_frequency,
          default_tax_percentage: data.default_tax_percentage
        } : {
          exchange_rate_to_local: data.exchange_rate_to_local,
          default_daily_rate: data.default_daily_rate,
          tax_country: data.tax_country
        })
      } as PayGroupWithEmployeeCount;

      return payGroup;
    } catch (error) {
      console.error('Error fetching pay group:', error);
      throw new Error(`Failed to fetch pay group: ${error.message}`);
    }
  }

  /**
   * Get employee count for a specific pay group (optimized)
   */
  static async getPayGroupEmployeeCount(payGroupId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('paygroup_employees')
        .select('id', { count: 'exact', head: true })
        .eq('pay_group_id', payGroupId)
        .eq('active', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching employee count:', error);
      return 0;
    }
  }

  /**
   * Search pay groups with optimized query
   */
  static async searchPayGroups(
    searchTerm: string,
    options: Omit<PayGroupsQueryOptions, 'search'> = {}
  ): Promise<PayGroupWithEmployeeCount[]> {
    if (!searchTerm.trim()) {
      return this.getPayGroups(options).then(result => result.data);
    }

    const result = await this.getPayGroups({
      ...options,
      search: searchTerm.trim()
    });
    return result.data;
  }

  /**
   * Create a new pay group (regular or expatriate)
   */
  static async createPayGroup(data: CreatePayGroupInput): Promise<PayGroupWithEmployeeCount> {
    try {
      // Validate input
      const validatedData = createPayGroupSchema.parse(data);

      // Generate paygroup_id
      const paygroupId = generatePayGroupId(validatedData.type, validatedData.country);

      if (validatedData.type === 'regular') {
        const insertData: any = {
          name: validatedData.name,
          country: validatedData.country,
          pay_frequency: validatedData.pay_frequency,
          default_tax_percentage: validatedData.default_tax_percentage,
          description: validatedData.notes,
          category: validatedData.category,
          employee_type: validatedData.employee_type,
          type: 'regular',
        };

        const { data: payGroup, error } = await supabase
          .from('pay_groups')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        return {
          id: payGroup.id,
          paygroup_id: paygroupId,
          name: payGroup.name,
          type: 'regular',
          category: payGroup.category,
          employee_type: payGroup.employee_type,
          pay_frequency: payGroup.pay_frequency,
          country: payGroup.country,
          currency: 'UGX',
          status: 'active',
          employee_count: 0,
          created_at: payGroup.created_at,
          updated_at: payGroup.updated_at,
          notes: payGroup.description,
          default_tax_percentage: payGroup.default_tax_percentage,
        } as PayGroupWithEmployeeCount;
      } else if (validatedData.type === 'expatriate') {
        const insertData: any = {
          name: validatedData.name,
          country: validatedData.country,
          currency: validatedData.currency,
          exchange_rate_to_local: validatedData.exchange_rate_to_local,
          default_daily_rate: validatedData.default_daily_rate,
          tax_country: validatedData.tax_country,
          notes: validatedData.notes,
          paygroup_id: paygroupId,
          category: validatedData.category,
          employee_type: validatedData.employee_type,
        };

        const { data: payGroup, error } = await supabase
          .from('expatriate_pay_groups')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        return {
          id: payGroup.id,
          paygroup_id: paygroupId,
          name: payGroup.name,
          type: 'expatriate',
          category: payGroup.category,
          employee_type: payGroup.employee_type,
          country: payGroup.country,
          currency: payGroup.currency || 'USD',
          status: 'active',
          employee_count: 0,
          created_at: payGroup.created_at || new Date().toISOString(),
          updated_at: payGroup.updated_at || new Date().toISOString(),
          notes: payGroup.notes,
          exchange_rate_to_local: payGroup.exchange_rate_to_local,
          default_daily_rate: payGroup.default_daily_rate || 0,
          tax_country: payGroup.tax_country,
        } as PayGroupWithEmployeeCount;
      } else {
        throw new Error(`Pay group type ${validatedData.type} is not yet supported in CRUD operations`);
      }
    } catch (error: any) {
      console.error('Error creating pay group:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to create pay group: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing pay group
   */
  static async updatePayGroup(id: string, type: PayGroupType, data: UpdatePayGroupInput): Promise<PayGroupWithEmployeeCount> {
    try {
      // Validate input
      const validatedData = updatePayGroupSchema.parse({ ...data, id, type });

      // Check if pay group exists
      const existing = await this.getPayGroupById(id, type);
      if (!existing) {
        throw new Error('Pay group not found');
      }

      if (type === 'regular') {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.country !== undefined) updateData.country = validatedData.country;
        if (validatedData.pay_frequency !== undefined) updateData.pay_frequency = validatedData.pay_frequency;
        if (validatedData.default_tax_percentage !== undefined) updateData.default_tax_percentage = validatedData.default_tax_percentage;
        if (validatedData.notes !== undefined) updateData.description = validatedData.notes;
        if (validatedData.category !== undefined) updateData.category = validatedData.category;
        if (validatedData.employee_type !== undefined) updateData.employee_type = validatedData.employee_type;
        if (validatedData.status !== undefined) {
          // Handle status if needed (might need a status column)
        }

        const { data: payGroup, error } = await supabase
          .from('pay_groups')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Get updated pay group with employee count
        return await this.getPayGroupById(id, type) || existing;
      } else if (type === 'expatriate') {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.country !== undefined) updateData.country = validatedData.country;
        if (validatedData.currency !== undefined) updateData.currency = validatedData.currency;
        if (validatedData.exchange_rate_to_local !== undefined) updateData.exchange_rate_to_local = validatedData.exchange_rate_to_local;
        if (validatedData.default_daily_rate !== undefined) updateData.default_daily_rate = validatedData.default_daily_rate;
        if (validatedData.tax_country !== undefined) updateData.tax_country = validatedData.tax_country;
        if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
        if (validatedData.category !== undefined) updateData.category = validatedData.category;
        if (validatedData.employee_type !== undefined) updateData.employee_type = validatedData.employee_type;

        const { data: payGroup, error } = await supabase
          .from('expatriate_pay_groups')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Get updated pay group with employee count
        return await this.getPayGroupById(id, type) || existing;
      } else {
        throw new Error(`Pay group type ${type} is not yet supported in CRUD operations`);
      }
    } catch (error: any) {
      console.error('Error updating pay group:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update pay group: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a pay group (soft delete by setting status to inactive)
   */
  static async deletePayGroup(id: string, type: PayGroupType, hardDelete: boolean = false): Promise<void> {
    try {
      if (hardDelete) {
        // Hard delete - remove from database
        if (type === 'regular') {
          const { error } = await supabase
            .from('pay_groups')
            .delete()
            .eq('id', id);
          if (error) throw error;
        } else if (type === 'expatriate') {
          const { error } = await supabase
            .from('expatriate_pay_groups')
            .delete()
            .eq('id', id);
          if (error) throw error;
        } else {
          throw new Error(`Pay group type ${type} is not yet supported in CRUD operations`);
        }
      } else {
        // Soft delete - would need a status column or similar
        // For now, we'll use hard delete as soft delete isn't implemented in schema
        // TODO: Add status column to pay_groups and expatriate_pay_groups tables
        await this.deletePayGroup(id, type, true);
      }
    } catch (error: any) {
      console.error('Error deleting pay group:', error);
      throw new Error(`Failed to delete pay group: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get employee counts for multiple pay groups (batch query)
   */
  static async getEmployeeCountsForPayGroups(payGroupIds: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('paygroup_employees')
        .select('pay_group_id')
        .in('pay_group_id', payGroupIds)
        .eq('active', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      payGroupIds.forEach(id => {
        counts[id] = 0;
      });

      (data || []).forEach((item: any) => {
        if (item.pay_group_id) {
          counts[item.pay_group_id] = (counts[item.pay_group_id] || 0) + 1;
        }
      });

      return counts;
    } catch (error) {
      console.error('Error fetching employee counts:', error);
      return {};
    }
  }
}
