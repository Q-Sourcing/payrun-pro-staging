import { supabase } from '@/integrations/supabase/client';
import { createEmployeeSchema, updateEmployeeSchema, type CreateEmployeeInput, type UpdateEmployeeInput } from '@/lib/validations/employees.schema';

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
      // Simple query first
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('first_name');

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (employee_type) {
        query = query.eq('employee_type', employee_type);
      }

      const { data: employees, error, count } = await query;

      if (error) throw error;

      let transformedData: EmployeeWithPayGroup[] = (employees || []).map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        middle_name: emp.middle_name,
        last_name: emp.last_name,
        email: emp.email,
        employee_type: emp.employee_type,
        department: emp.department,
        created_at: emp.created_at,
        updated_at: emp.updated_at
      }));

      // If pay group info is needed, fetch it separately
      if (include_pay_group && employees && employees.length > 0) {
        const employeeIds = employees.map(e => e.id);

        // Fetch pay groups for employees with direct assignment
        const { data: empWithGroups } = await supabase
          .from('employees')
          .select('id, pay_group_id')
          .in('id', employeeIds)
          .not('pay_group_id', 'is', null);

        // Get unique pay group IDs
        const payGroupIds = [...new Set((empWithGroups || []).map(e => e.pay_group_id).filter(Boolean))];

        if (payGroupIds.length > 0) {
          // Fetch pay group details
          const { data: payGroups } = await supabase
            .from('pay_groups')
            .select('id, name, country')
            .in('id', payGroupIds as string[]);

          // Merge pay group info
          const payGroupMap = new Map((payGroups || []).map(pg => [pg.id, pg]));
          
          transformedData = transformedData.map(emp => {
            const empGroup = empWithGroups?.find(e => e.id === emp.id);
            const payGroup = empGroup?.pay_group_id ? payGroupMap.get(empGroup.pay_group_id) : null;
            
            if (payGroup) {
              return {
                ...emp,
                current_pay_group: {
                  id: payGroup.id,
                  name: payGroup.name,
                  type: 'local'
                }
              };
            }
            return emp;
          });
        }
      }

      return {
        data: transformedData,
        total: count || 0,
        page,
        limit: safeLimit
      };
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      throw new Error(`Failed to fetch employees: ${error?.message || 'Unknown error'}`);
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

  /**
   * Create a new employee
   */
  static async createEmployee(data: CreateEmployeeInput): Promise<Employee> {
    try {
      // Validate input
      const validatedData = createEmployeeSchema.parse(data);

      // Generate employee number if not provided
      const employeeNumber = await this.generateEmployeeNumber();

      // Prepare insert data
      const insertData: any = {
        first_name: validatedData.first_name,
        middle_name: validatedData.middle_name,
        last_name: validatedData.last_name,
        email: validatedData.email,
        phone: validatedData.phone,
        employee_type: validatedData.employee_type,
        employee_category: validatedData.employee_category,
        employment_status: validatedData.employment_status || 'Active',
        department: validatedData.department,
        project: validatedData.project,
        country: validatedData.country,
        pay_type: validatedData.pay_type,
        pay_rate: validatedData.pay_rate,
        pay_frequency: validatedData.pay_frequency,
        pay_group_id: validatedData.pay_group_id,
        gender: validatedData.gender,
        date_of_birth: validatedData.date_of_birth,
        national_id: validatedData.national_id,
        tin: validatedData.tin,
        nssf_number: validatedData.nssf_number,
        social_security_number: validatedData.social_security_number,
        passport_number: validatedData.passport_number,
        bank_name: validatedData.bank_name,
        bank_branch: validatedData.bank_branch,
        account_number: validatedData.account_number,
        account_type: validatedData.account_type,
        currency: validatedData.currency,
        category: validatedData.category,
        sub_type: validatedData.sub_type,
        employee_number: employeeNumber,
        status: validatedData.employment_status === 'Active' ? 'active' : 'inactive',
      };

      const { data: employee, error } = await supabase
        .from('employees')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return {
        id: employee.id,
        first_name: employee.first_name,
        middle_name: employee.middle_name,
        last_name: employee.last_name || '',
        email: employee.email,
        employee_type: employee.employee_type,
        department: employee.department,
        created_at: employee.created_at,
        updated_at: employee.updated_at,
      };
    } catch (error: any) {
      console.error('Error creating employee:', error);
      if (error.code === '23505') {
        throw new Error('An employee with this email already exists');
      }
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to create employee: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing employee
   */
  static async updateEmployee(id: string, data: UpdateEmployeeInput): Promise<Employee> {
    try {
      // Validate input
      const validatedData = updateEmployeeSchema.parse({ ...data, id });

      // Check if employee exists
      const existing = await this.getEmployeeById(id);
      if (!existing) {
        throw new Error('Employee not found');
      }

      // Prepare update data (only include provided fields)
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (validatedData.first_name !== undefined) updateData.first_name = validatedData.first_name;
      if (validatedData.middle_name !== undefined) updateData.middle_name = validatedData.middle_name;
      if (validatedData.last_name !== undefined) updateData.last_name = validatedData.last_name;
      if (validatedData.email !== undefined) updateData.email = validatedData.email;
      if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
      if (validatedData.employee_type !== undefined) updateData.employee_type = validatedData.employee_type;
      if (validatedData.employee_category !== undefined) updateData.employee_category = validatedData.employee_category;
      if (validatedData.employment_status !== undefined) {
        updateData.employment_status = validatedData.employment_status;
        updateData.status = validatedData.employment_status === 'Active' ? 'active' : 'inactive';
      }
      if (validatedData.department !== undefined) updateData.department = validatedData.department;
      if (validatedData.project !== undefined) updateData.project = validatedData.project;
      if (validatedData.country !== undefined) updateData.country = validatedData.country;
      if (validatedData.pay_type !== undefined) updateData.pay_type = validatedData.pay_type;
      if (validatedData.pay_rate !== undefined) updateData.pay_rate = validatedData.pay_rate;
      if (validatedData.pay_frequency !== undefined) updateData.pay_frequency = validatedData.pay_frequency;
      if (validatedData.pay_group_id !== undefined) updateData.pay_group_id = validatedData.pay_group_id;
      if (validatedData.gender !== undefined) updateData.gender = validatedData.gender;
      if (validatedData.date_of_birth !== undefined) updateData.date_of_birth = validatedData.date_of_birth;
      if (validatedData.national_id !== undefined) updateData.national_id = validatedData.national_id;
      if (validatedData.tin !== undefined) updateData.tin = validatedData.tin;
      if (validatedData.nssf_number !== undefined) updateData.nssf_number = validatedData.nssf_number;
      if (validatedData.social_security_number !== undefined) updateData.social_security_number = validatedData.social_security_number;
      if (validatedData.passport_number !== undefined) updateData.passport_number = validatedData.passport_number;
      if (validatedData.bank_name !== undefined) updateData.bank_name = validatedData.bank_name;
      if (validatedData.bank_branch !== undefined) updateData.bank_branch = validatedData.bank_branch;
      if (validatedData.account_number !== undefined) updateData.account_number = validatedData.account_number;
      if (validatedData.account_type !== undefined) updateData.account_type = validatedData.account_type;
      if (validatedData.currency !== undefined) updateData.currency = validatedData.currency;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.sub_type !== undefined) updateData.sub_type = validatedData.sub_type;

      const { data: employee, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: employee.id,
        first_name: employee.first_name,
        middle_name: employee.middle_name,
        last_name: employee.last_name || '',
        email: employee.email,
        employee_type: employee.employee_type,
        department: employee.department,
        created_at: employee.created_at,
        updated_at: employee.updated_at,
      };
    } catch (error: any) {
      console.error('Error updating employee:', error);
      if (error.code === '23505') {
        throw new Error('An employee with this email already exists');
      }
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update employee: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete an employee (soft delete by setting status to inactive)
   */
  static async deleteEmployee(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      if (hardDelete) {
        // Hard delete - remove from database
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Soft delete - set status to inactive
        const { error } = await supabase
          .from('employees')
          .update({
            status: 'inactive',
            employment_status: 'Terminated',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      throw new Error(`Failed to delete employee: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique employee number
   */
  private static async generateEmployeeNumber(): Promise<string> {
    try {
      // Get the latest employee number
      const { data, error } = await supabase
        .from('employees')
        .select('employee_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.length > 0 && data[0].employee_number) {
        // Extract number from existing employee number (format: EMP-000001)
        const lastNumber = parseInt(data[0].employee_number.replace('EMP-', ''), 10);
        const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
        return `EMP-${nextNumber}`;
      }

      // First employee
      return 'EMP-000001';
    } catch (error) {
      console.error('Error generating employee number:', error);
      // Fallback: use timestamp-based number
      return `EMP-${Date.now().toString().slice(-6)}`;
    }
  }
}
