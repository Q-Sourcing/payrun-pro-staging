import { supabase } from '@/integrations/supabase/client';
import type { 
  PayGroup, 
  PayGroupFormData, 
  PayGroupSummary, 
  PayGroupType,
  RegularPayGroup,
  ExpatriatePayGroup,
  ContractorPayGroup,
  InternPayGroup,
  PayGroupCategory,
  HeadOfficeSubType,
  ProjectsSubType,
  ManpowerFrequency
} from '@/lib/types/paygroups';
import { generatePayGroupId } from '@/lib/types/paygroups';

export class PayGroupsService {
  /**
   * Get all pay groups with summary information
   */
  static async getPayGroups(): Promise<PayGroup[]> {
    try {
      // Fetch regular pay groups
      const { data: regularGroups, error: regularError } = await supabase
        .from('pay_groups')
        .select(`
          *,
          employees(count)
        `)
        .order('created_at', { ascending: false });

      if (regularError) throw regularError;

      // Fetch expatriate pay groups
      const { data: expatriateGroups, error: expatriateError } = await supabase
        .from('expatriate_pay_groups')
        .select(`
          *,
          expatriate_pay_run_items(count)
        `)
        .order('created_at', { ascending: false });

      if (expatriateError) throw expatriateError;

      // Transform and combine the results
      const regularPayGroups: RegularPayGroup[] = (regularGroups || []).map(group => ({
        id: group.id,
        paygroup_id: `REGP-${group.country.substring(0, 1)}${group.id.substring(0, 3)}`,
        name: group.name,
        type: 'regular' as const,
        category: group.category,
        sub_type: group.sub_type,
        pay_frequency: group.pay_frequency,
        country: group.country,
        currency: 'UGX', // Default for regular groups
        status: 'active' as const,
        employee_count: group.employees?.[0]?.count || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.description,
        default_tax_percentage: group.default_tax_percentage
      }));

      const expatriatePayGroups: ExpatriatePayGroup[] = (expatriateGroups || []).map(group => ({
        id: group.id,
        paygroup_id: `EXPG-${group.country.substring(0, 1)}${group.id.substring(0, 3)}`,
        name: group.name,
        type: 'expatriate' as const,
        category: group.category, // Will be set from pay_group_master or default
        sub_type: group.sub_type, // Will be set from pay_group_master or default
        country: group.country,
        currency: group.currency,
        status: 'active' as const,
        employee_count: group.expatriate_pay_run_items?.[0]?.count || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.notes,
        exchange_rate_to_local: group.exchange_rate_to_local,
        default_daily_rate: group.default_daily_rate,
        tax_country: group.tax_country
      }));

      return [...regularPayGroups, ...expatriatePayGroups];
    } catch (error) {
      console.error('Error fetching pay groups:', error);
      throw new Error(`Failed to fetch pay groups: ${error.message}`);
    }
  }

  /**
   * Get pay groups by category and sub_type
   */
  static async getPayGroupsByCategory(
    category: PayGroupCategory,
    subType?: HeadOfficeSubType | ProjectsSubType,
    payFrequency?: ManpowerFrequency
  ): Promise<PayGroup[]> {
    const allGroups = await this.getPayGroups();
    return allGroups.filter(group => {
      if (group.category !== category) return false;
      if (subType && group.sub_type !== subType) return false;
      if (payFrequency && group.pay_frequency !== payFrequency) return false;
      return true;
    });
  }

  /**
   * Get pay groups grouped by category and sub_type
   */
  static async getPayGroupsGrouped(): Promise<{
    head_office: {
      regular: PayGroup[];
      expatriate: PayGroup[];
      interns: PayGroup[];
    };
    projects: {
      manpower: {
        daily: PayGroup[];
        bi_weekly: PayGroup[];
        monthly: PayGroup[];
      };
      ippms: PayGroup[];
      expatriate: PayGroup[];
    };
  }> {
    const allGroups = await this.getPayGroups();
    
    return {
      head_office: {
        regular: allGroups.filter(g => g.category === 'head_office' && g.sub_type === 'regular'),
        expatriate: allGroups.filter(g => g.category === 'head_office' && g.sub_type === 'expatriate'),
        interns: allGroups.filter(g => g.category === 'head_office' && g.sub_type === 'interns')
      },
      projects: {
        manpower: {
          daily: allGroups.filter(g => g.category === 'projects' && g.sub_type === 'manpower' && g.pay_frequency === 'daily'),
          bi_weekly: allGroups.filter(g => g.category === 'projects' && g.sub_type === 'manpower' && g.pay_frequency === 'bi_weekly'),
          monthly: allGroups.filter(g => g.category === 'projects' && g.sub_type === 'manpower' && g.pay_frequency === 'monthly')
        },
        ippms: allGroups.filter(g => g.category === 'projects' && g.sub_type === 'ippms'),
        expatriate: allGroups.filter(g => g.category === 'projects' && g.sub_type === 'expatriate')
      }
    };
  }

  /**
   * Get pay groups by type
   */
  static async getPayGroupsByType(type: PayGroupType): Promise<PayGroup[]> {
    const allGroups = await this.getPayGroups();
    return allGroups.filter(group => group.type === type);
  }

  /**
   * Get pay group summary statistics
   */
  static async getPayGroupSummary(): Promise<PayGroupSummary> {
    try {
      const groups = await this.getPayGroups();
      
      const summary: PayGroupSummary = {
        totalGroups: groups.length,
        activeGroups: groups.filter(g => g.status === 'active').length,
        totalEmployees: groups.reduce((sum, g) => sum + g.employee_count, 0),
        currencies: [...new Set(groups.map(g => g.currency))],
        types: [...new Set(groups.map(g => g.type))]
      };

      return summary;
    } catch (error) {
      console.error('Error fetching pay group summary:', error);
      throw new Error(`Failed to fetch pay group summary: ${error.message}`);
    }
  }

  /**
   * Create a new pay group
   */
  static async createPayGroup(formData: PayGroupFormData): Promise<PayGroup> {
    try {
      const paygroup_id = generatePayGroupId(formData.type, formData.country);

      if (formData.type === 'regular') {
        const { data, error } = await supabase
          .from('pay_groups')
          .insert([{
            name: formData.name,
            country: formData.country,
            category: formData.category || 'head_office',
            sub_type: formData.sub_type || 'regular',
            pay_frequency: formData.pay_frequency,
            default_tax_percentage: formData.default_tax_percentage,
            description: formData.notes
          }])
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        return {
          id: data.id,
          paygroup_id,
          name: data.name,
          type: 'regular',
          category: data.category,
          sub_type: data.sub_type,
          pay_frequency: data.pay_frequency,
          country: data.country,
          currency: 'UGX',
          status: 'active',
          employee_count: 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          notes: data.description,
          default_tax_percentage: data.default_tax_percentage
        } as RegularPayGroup;
      } 
      
      if (formData.type === 'expatriate') {
        // Determine category based on formData or default to head_office
        const category = formData.category || 'head_office';
        const subType = formData.sub_type || 'expatriate';
        
        const { data, error } = await supabase
          .from('expatriate_pay_groups')
          .insert([{
            paygroup_id,
            name: formData.name,
            country: formData.country,
            currency: formData.currency,
            exchange_rate_to_local: formData.exchange_rate_to_local,
            tax_country: formData.tax_country,
            notes: formData.notes
          }])
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Update pay_group_master with category/sub_type if it exists
        if (data.id) {
          await supabase
            .from('pay_group_master')
            .update({
              category,
              sub_type: subType
            })
            .eq('source_table', 'expatriate_pay_groups')
            .eq('source_id', data.id);
        }

        return {
          id: data.id,
          paygroup_id: data.paygroup_id,
          name: data.name,
          type: 'expatriate',
          category,
          sub_type: subType,
          country: data.country,
          currency: data.currency,
          status: 'active',
          employee_count: 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          notes: data.notes,
          exchange_rate_to_local: data.exchange_rate_to_local,
          tax_country: data.tax_country
        } as ExpatriatePayGroup;
      }

      // For future pay group types (contractor, intern)
      throw new Error(`Pay group type '${formData.type}' is not yet implemented`);
    } catch (error) {
      console.error('Error creating pay group:', error);
      if (error.message.includes('Failed to create')) {
        throw error;
      }
      throw new Error(`Failed to create pay group: ${error.message}`);
    }
  }

  /**
   * Update an existing pay group
   */
  static async updatePayGroup(id: string, type: PayGroupType, formData: Partial<PayGroupFormData>): Promise<PayGroup> {
    try {
      if (type === 'regular') {
        const { data, error } = await supabase
          .from('pay_groups')
          .update({
            name: formData.name,
            country: formData.country,
            category: formData.category,
            sub_type: formData.sub_type,
            pay_frequency: formData.pay_frequency,
            default_tax_percentage: formData.default_tax_percentage,
            description: formData.notes
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        return {
          id: data.id,
          paygroup_id: `REGP-${data.country.substring(0, 1)}${data.id.substring(0, 3)}`,
          name: data.name,
          type: 'regular',
          category: data.category,
          sub_type: data.sub_type,
          pay_frequency: data.pay_frequency,
          country: data.country,
          currency: 'UGX',
          status: 'active',
          employee_count: 0, // Would need to fetch separately
          created_at: data.created_at,
          updated_at: data.updated_at,
          notes: data.description,
          default_tax_percentage: data.default_tax_percentage
        } as RegularPayGroup;
      }

      if (type === 'expatriate') {
        const category = formData.category;
        const subType = formData.sub_type;
        
        const { data, error } = await supabase
          .from('expatriate_pay_groups')
          .update({
            name: formData.name,
            country: formData.country,
            currency: formData.currency,
            exchange_rate_to_local: formData.exchange_rate_to_local,
            default_daily_rate: formData.default_daily_rate,
            tax_country: formData.tax_country,
            notes: formData.notes
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Update pay_group_master with category/sub_type if provided
        if (category && subType) {
          await supabase
            .from('pay_group_master')
            .update({
              category,
              sub_type: subType
            })
            .eq('source_table', 'expatriate_pay_groups')
            .eq('source_id', id);
        }

        return {
          id: data.id,
          paygroup_id: `EXPG-${data.country.substring(0, 1)}${data.id.substring(0, 3)}`,
          name: data.name,
          type: 'expatriate',
          category: category || 'head_office',
          sub_type: subType || 'expatriate',
          country: data.country,
          currency: data.currency,
          status: 'active',
          employee_count: 0, // Would need to fetch separately
          created_at: data.created_at,
          updated_at: data.updated_at,
          notes: data.notes,
          exchange_rate_to_local: data.exchange_rate_to_local,
          default_daily_rate: data.default_daily_rate,
          tax_country: data.tax_country
        } as ExpatriatePayGroup;
      }

      throw new Error(`Pay group type '${type}' update is not yet implemented`);
    } catch (error) {
      console.error('Error updating pay group:', error);
      if (error.message.includes('Failed to update')) {
        throw error;
      }
      throw new Error(`Failed to update pay group: ${error.message}`);
    }
  }

  /**
   * Delete a pay group
   */
  static async deletePayGroup(id: string, type: PayGroupType): Promise<void> {
    try {
      let tableName: string;
      
      switch (type) {
        case 'regular':
          tableName = 'pay_groups';
          break;
        case 'expatriate':
          tableName = 'expatriate_pay_groups';
          break;
        default:
          throw new Error(`Pay group type '${type}' deletion is not yet implemented`);
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(this.getValidationErrorMessage(error));
      }
    } catch (error) {
      console.error('Error deleting pay group:', error);
      if (error.message.includes('Failed to delete')) {
        throw error;
      }
      throw new Error(`Failed to delete pay group: ${error.message}`);
    }
  }

  /**
   * Get detailed validation error messages from Supabase
   */
  private static getValidationErrorMessage(error: any): string {
    if (error.code === '23505') { // Unique constraint violation
      return 'A pay group with this name already exists';
    }
    
    if (error.code === '23503') { // Foreign key constraint violation
      return 'Cannot delete pay group: it has associated employees';
    }
    
    if (error.code === '23514') { // Check constraint violation
      return 'Invalid data: please check all required fields';
    }
    
    if (error.message) {
      // Extract field-specific errors
      if (error.message.includes('name')) {
        return 'Pay group name is required';
      }
      if (error.message.includes('country')) {
        return 'Country selection is required';
      }
      if (error.message.includes('exchange_rate')) {
        return 'Exchange rate must be a positive number';
      }
      if (error.message.includes('daily_rate')) {
        return 'Daily rate must be a positive number';
      }
      if (error.message.includes('tax_percentage')) {
        return 'Tax percentage must be between 0 and 100';
      }
    }
    
    return error.message || 'An unexpected error occurred';
  }

  /**
   * Validate pay group form data
   */
  static validatePayGroupData(formData: PayGroupFormData): string[] {
    const errors: string[] = [];

    // Common validations
    if (!formData.name?.trim()) {
      errors.push('Pay group name is required');
    }
    
    if (!formData.country) {
      errors.push('Country selection is required');
    }
    
    if (!formData.currency) {
      errors.push('Currency selection is required');
    }

    // Type-specific validations
    if (formData.type === 'regular') {
      if (!formData.pay_frequency) {
        errors.push('Pay frequency is required for regular pay groups');
      }
      
      if (formData.default_tax_percentage === undefined || formData.default_tax_percentage < 0 || formData.default_tax_percentage > 100) {
        errors.push('Tax percentage must be between 0 and 100');
      }
    }

    if (formData.type === 'expatriate') {
      if (!formData.exchange_rate_to_local || formData.exchange_rate_to_local <= 0) {
        errors.push('Exchange rate must be a positive number');
      }
      
      if (!formData.tax_country) {
        errors.push('Tax country is required for expatriate pay groups');
      }
    }

    return errors;
  }
}
