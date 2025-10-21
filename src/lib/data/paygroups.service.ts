import { supabase } from '@/integrations/supabase/client';
import type { PayGroup, PayGroupType } from '@/lib/types/paygroups';

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
}
