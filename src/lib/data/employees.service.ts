import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  employee_type: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithPayGroup extends Employee {
  current_pay_group?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface EmployeesQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  employee_type?: string;
  include_pay_group?: boolean;
}

export class EmployeesService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get employees with optimized queries and pagination
   */
  static async getEmployees(options: EmployeesQueryOptions = {}): Promise<{
    data: EmployeeWithPayGroup[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      search = '',
      employee_type,
      include_pay_group = false
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      let query = supabase
        .from('employees')
        .select(
          include_pay_group
            ? `
              id,
              first_name,
              middle_name,
              last_name,
              email,
              employee_type,
              department,
              created_at,
              updated_at,
              paygroup_employees!inner(
                active,
                pay_groups(
                  id,
                  name,
                  type
                ),
                expatriate_pay_groups(
                  id,
                  name,
                  type
                )
              )
            `
            : `
              id,
              first_name,
              middle_name,
              last_name,
              email,
              employee_type,
              department,
              created_at,
              updated_at
            `,
          { count: 'exact' }
        )
        .eq('paygroup_employees.active', include_pay_group ? true : undefined)
        .range(from, to)
        .order('first_name');

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (employee_type) {
        query = query.eq('employee_type', employee_type);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to include current pay group info
      const transformedData: EmployeeWithPayGroup[] = (data || []).map(emp => {
        const employee: EmployeeWithPayGroup = {
          id: emp.id,
          first_name: emp.first_name,
          middle_name: emp.middle_name,
          last_name: emp.last_name,
          email: emp.email,
          employee_type: emp.employee_type,
          department: emp.department,
          created_at: emp.created_at,
          updated_at: emp.updated_at
        };

        if (include_pay_group && emp.paygroup_employees?.[0]) {
          const assignment = emp.paygroup_employees[0];
          const payGroup = assignment.pay_groups || assignment.expatriate_pay_groups;
          if (payGroup) {
            employee.current_pay_group = {
              id: assignment.pay_groups ? assignment.pay_groups.id : assignment.expatriate_pay_groups.id,
              name: payGroup.name,
              type: payGroup.type
            };
          }
        }

        return employee;
      });

      return {
        data: transformedData,
        total: count || 0,
        page,
        limit: safeLimit
      };
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }
  }

  /**
   * Get employees by type with current pay group info
   */
  static async getEmployeesByType(
    employeeType: string,
    options: Omit<EmployeesQueryOptions, 'employee_type'> = {}
  ): Promise<EmployeeWithPayGroup[]> {
    const result = await this.getEmployees({
      ...options,
      employee_type: employeeType,
      include_pay_group: true
    });
    return result.data;
  }

  /**
   * Get employee by ID with minimal data
   */
  static async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          middle_name,
          last_name,
          email,
          employee_type,
          department,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw new Error(`Failed to fetch employee: ${error.message}`);
    }
  }

  /**
   * Search employees with debounced query
   */
  static async searchEmployees(
    searchTerm: string,
    options: Omit<EmployeesQueryOptions, 'search'> = {}
  ): Promise<EmployeeWithPayGroup[]> {
    if (!searchTerm.trim()) {
      return this.getEmployees(options).then(result => result.data);
    }

    const result = await this.getEmployees({
      ...options,
      search: searchTerm.trim(),
      include_pay_group: true
    });
    return result.data;
  }

  /**
   * Get employee count by type (for dashboard stats)
   */
  static async getEmployeeCounts(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_type')
        .order('employee_type');

      if (error) throw error;

      const counts = (data || []).reduce((acc, emp) => {
        acc[emp.employee_type] = (acc[emp.employee_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return counts;
    } catch (error) {
      console.error('Error fetching employee counts:', error);
      throw new Error(`Failed to fetch employee counts: ${error.message}`);
    }
  }
}
