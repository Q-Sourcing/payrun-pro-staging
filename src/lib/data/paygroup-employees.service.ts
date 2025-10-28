import { supabase } from '@/integrations/supabase/client';

export interface PayGroupEmployee {
  id: string;
  employee_id: string;
  pay_group_id: string;
  active: boolean;
  assigned_at: string;
  removed_at?: string;
  assigned_by?: string;
  notes?: string;
  employee: {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    employee_type: string;
    department?: string;
  };
  pay_group: {
    id: string;
    name: string;
    type: string;
    country: string;
    currency: string;
  };
}

export interface PayGroupEmployeesQueryOptions {
  pay_group_id?: string;
  employee_id?: string;
  active_only?: boolean;
  page?: number;
  limit?: number;
}

export class PayGroupEmployeesService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get pay group employees with optimized joins
   */
  static async getPayGroupEmployees(options: PayGroupEmployeesQueryOptions = {}): Promise<{
    data: PayGroupEmployee[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      pay_group_id,
      employee_id,
      active_only = true,
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      let query = supabase
        .from('paygroup_employees')
        .select(`
          id,
          employee_id,
          pay_group_id,
          active,
          assigned_at,
          removed_at,
          assigned_by,
          notes,
          employees!inner(
            id,
            first_name,
            middle_name,
            last_name,
            email,
            employee_type,
            department
          ),
          pay_groups(
            id,
            name,
            type,
            country,
            currency
          ),
          expatriate_pay_groups(
            id,
            name,
            type,
            country,
            currency
          )
        `, { count: 'exact' })
        .range(from, to)
        .order('assigned_at', { ascending: false });

      // Apply filters
      if (pay_group_id) {
        query = query.eq('pay_group_id', pay_group_id);
      }

      if (employee_id) {
        query = query.eq('employee_id', employee_id);
      }

      if (active_only) {
        query = query.eq('active', true);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to normalize pay group info
      const transformedData: PayGroupEmployee[] = (data || []).map(record => {
        const payGroup = record.pay_groups || record.expatriate_pay_groups;
        
        return {
          id: record.id,
          employee_id: record.employee_id,
          pay_group_id: record.pay_group_id,
          active: record.active,
          assigned_at: record.assigned_at,
          removed_at: record.removed_at,
          assigned_by: record.assigned_by,
          notes: record.notes,
          employee: record.employees,
          pay_group: {
            id: payGroup.id,
            name: payGroup.name,
            type: payGroup.type,
            country: payGroup.country,
            currency: payGroup.currency
          }
        };
      });

      return {
        data: transformedData,
        total: count || 0,
        page,
        limit: safeLimit
      };
    } catch (error) {
      console.error('Error fetching pay group employees:', error);
      throw new Error(`Failed to fetch pay group employees: ${error.message}`);
    }
  }

  /**
   * Get employees assigned to a specific pay group
   */
  static async getEmployeesByPayGroup(
    payGroupId: string,
    options: Omit<PayGroupEmployeesQueryOptions, 'pay_group_id'> = {}
  ): Promise<PayGroupEmployee[]> {
    const result = await this.getPayGroupEmployees({
      ...options,
      pay_group_id: payGroupId
    });
    return result.data;
  }

  /**
   * Get pay groups for a specific employee
   */
  static async getPayGroupsByEmployee(
    employeeId: string,
    options: Omit<PayGroupEmployeesQueryOptions, 'employee_id'> = {}
  ): Promise<PayGroupEmployee[]> {
    const result = await this.getPayGroupEmployees({
      ...options,
      employee_id: employeeId
    });
    return result.data;
  }

  /**
   * Get current active pay group for an employee
   */
  static async getCurrentPayGroupForEmployee(employeeId: string): Promise<PayGroupEmployee | null> {
    try {
      const result = await this.getPayGroupEmployees({
        employee_id: employeeId,
        active_only: true,
        limit: 1
      });

      return result.data[0] || null;
    } catch (error) {
      console.error('Error fetching current pay group for employee:', error);
      return null;
    }
  }

  /**
   * Get employee count for multiple pay groups (batch query)
   */
  static async getEmployeeCountsForPayGroups(payGroupIds: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('paygroup_employees')
        .select('pay_group_id')
        .in('pay_group_id', payGroupIds)
        .eq('active', true);

      if (error) throw error;

      const counts = (data || []).reduce((acc, record) => {
        acc[record.pay_group_id] = (acc[record.pay_group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Ensure all requested pay group IDs are in the result
      payGroupIds.forEach(id => {
        if (!(id in counts)) {
          counts[id] = 0;
        }
      });

      return counts;
    } catch (error) {
      console.error('Error fetching employee counts for pay groups:', error);
      return payGroupIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
    }
  }

  /**
   * Check if employee is already assigned to any pay group
   */
  static async isEmployeeAssigned(employeeId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('paygroup_employees')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('active', true)
        .limit(1);

      if (error) throw error;
      return (data || []).length > 0;
    } catch (error) {
      console.error('Error checking employee assignment:', error);
      return false;
    }
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStats(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    unassignedEmployees: number;
  }> {
    try {
      const [assignmentsResult, employeesResult] = await Promise.all([
        supabase
          .from('paygroup_employees')
          .select('active', { count: 'exact' }),
        supabase
          .from('employees')
          .select('id', { count: 'exact' })
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (employeesResult.error) throw employeesResult.error;

      const totalAssignments = assignmentsResult.count || 0;
      const activeAssignments = (assignmentsResult.data || []).filter(a => a.active).length;
      const totalEmployees = employeesResult.count || 0;
      const unassignedEmployees = totalEmployees - activeAssignments;

      return {
        totalAssignments,
        activeAssignments,
        unassignedEmployees
      };
    } catch (error) {
      console.error('Error fetching assignment stats:', error);
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        unassignedEmployees: 0
      };
    }
  }

  /**
   * Auto-sync: Update employees.pay_group_id to match active assignments
   * Note: Simplified version that doesn't rely on TypeScript knowing about paygroup_employees table
   */
  static async syncPayGroupAssignments(): Promise<{ synced: number; errors: number }> {
    try {
      console.log('🔄 Starting auto-sync of pay group assignments...');
      
      // Using raw query to avoid TypeScript errors
      const { data: assignments, error } = await supabase.rpc('exec_raw_sql', {
        query: `
          SELECT employee_id, pay_group_id 
          FROM paygroup_employees 
          WHERE active = true
        `
      }) as { data: any[], error: any };

      if (error) {
        console.warn('Sync skipped - table may not exist:', error);
        return { synced: 0, errors: 0 };
      }

      let synced = 0;
      let errors = 0;

      // Update each employee's pay_group_id
      for (const assignment of assignments || []) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ pay_group_id: assignment.pay_group_id })
          .eq('id', assignment.employee_id);

        if (updateError) {
          console.error(`Failed to sync employee ${assignment.employee_id}:`, updateError);
          errors++;
        } else {
          synced++;
        }
      }

      console.log(`✅ Sync complete: ${synced} synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      console.error('Error during auto-sync:', error);
      return { synced: 0, errors: 0 };
    }
  }
}
