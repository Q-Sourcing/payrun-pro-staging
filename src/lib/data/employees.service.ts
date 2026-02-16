import { supabase } from '@/integrations/supabase/client';
import { createEmployeeSchema, updateEmployeeSchema, type CreateEmployeeInput, type UpdateEmployeeInput } from '@/lib/validations/employees.schema';

export interface Employee {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  employee_type: string;
  sub_department?: string;
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
      let query = (supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('first_name')) as any;

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (employee_type) {
        query = query.eq('employee_type', employee_type);
      }

      const { data: employees, error, count } = await (query as any);

      if (error) throw error;

      let transformedData: EmployeeWithPayGroup[] = (employees || []).map((emp: any) => ({
        id: emp.id,
        first_name: emp.first_name,
        middle_name: emp.middle_name,
        last_name: emp.last_name,
        email: emp.email,
        employee_type: emp.employee_type,
        sub_department: emp.sub_department,
        created_at: emp.created_at,
        updated_at: emp.updated_at
      }));

      // If pay group info is needed, fetch it separately
      if (include_pay_group && employees && employees.length > 0) {
        const employeeIds = employees.map((e: any) => e.id);

        // 1. Fetch legacy/project pay groups
        const { data: legacyAssignments } = await supabase
          .from('employees')
          .select('id, pay_group_id, category')
          .in('id', employeeIds)
          .not('pay_group_id', 'is', null) as any;

        // 2. Fetch Head Office memberships
        const { data: hoMemberships } = await supabase
          .from('head_office_pay_group_members' as any)
          .select('employee_id, pay_group_id, pay_group_type')
          .in('employee_id', employeeIds)
          .eq('active', true) as any;

        // Collect all PayGroup IDs to fetch details
        const allPgIds = [
          ...new Set([
            ...(legacyAssignments || []).map((a: any) => a.pay_group_id),
            ...(hoMemberships || []).map((m: any) => m.pay_group_id)
          ])
        ].filter(Boolean) as string[];

        if (allPgIds.length > 0) {
          // We need to check multiple tables for Head Office
          const [
            { data: regularPg },
            { data: internPg },
            { data: expatriatePg },
            { data: legacyPg }
          ] = await Promise.all([
            supabase.from('head_office_pay_groups_regular' as any).select('id, name').in('id', allPgIds),
            supabase.from('head_office_pay_groups_interns' as any).select('id, name').in('id', allPgIds),
            supabase.from('head_office_pay_groups_expatriates' as any).select('id, name').in('id', allPgIds),
            supabase.from('pay_groups').select('id, name').in('id', allPgIds) // Still needed for projects
          ]) as any[];

          const namesMap = new Map<string, { name: string, type: string }>();
          (regularPg || []).forEach((p: any) => namesMap.set(p.id, { name: p.name, type: 'regular' }));
          (internPg || []).forEach((p: any) => namesMap.set(p.id, { name: p.name, type: 'intern' }));
          (expatriatePg || []).forEach((p: any) => namesMap.set(p.id, { name: p.name, type: 'expatriate' }));
          (legacyPg || []).forEach((p: any) => namesMap.set(p.id, { name: p.name, type: 'project' }));

          transformedData = transformedData.map(emp => {
            // Priority: HO Membership first
            const hoMember = hoMemberships?.find((m: any) => m.employee_id === emp.id);
            const legacyAss = legacyAssignments?.find((a: any) => a.id === emp.id);

            const pgId = hoMember?.pay_group_id || legacyAss?.pay_group_id;
            const details = pgId ? namesMap.get(pgId) : null;

            if (details) {
              return {
                ...emp,
                current_pay_group: {
                  id: pgId!,
                  name: details.name,
                  type: details.type
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
   * Get employees assigned to a given project
   */
  static async getEmployeesByProject(projectId: string, organizationId?: string): Promise<EmployeeWithPayGroup[]> {
    try {
      let query = (supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, email, employee_type, sub_department, pay_type, pay_group_id, status, project_id, category, pay_frequency, currency, country')
        .eq('project_id', projectId)) as any;
      if (organizationId) {
        query = (query as any).eq('organization_id', organizationId);
      }
      const { data, error } = await (query as any).order('first_name');
      if (error) throw error;
      return (data || []).map((emp: any) => ({
        id: emp.id,
        first_name: emp.first_name,
        middle_name: emp.middle_name,
        last_name: emp.last_name,
        email: emp.email,
        employee_type: emp.employee_type,
        sub_department: emp.sub_department,
        created_at: '',
        updated_at: '',
        // passthrough fields useful for UI
        pay_type: emp.pay_type,
        pay_group_id: emp.pay_group_id,
        status: emp.status,
        project_id: emp.project_id,
        category: emp.category,
        pay_frequency: emp.pay_frequency,
        currency: emp.currency,
        country: emp.country,
      }));
    } catch (error: any) {
      console.error('Error fetching employees by project:', error);
      throw new Error(`Failed to fetch employees for project: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Assign an employee to a project (sets project_id)
   */
  static async assignToProject(employeeId: string, projectId: string) {
    const { error } = await supabase
      .from('employees')
      .update({ project_id: projectId, category: 'projects' } as any)
      .eq('id', employeeId);
    if (error) throw error;
  }

  /**
   * Fetch eligible employees for a project pay group based on project, pay type and optional employee type.
   */
  static async getEligibleEmployeesForProjectPayGroup(params: {
    organizationId?: string;
    projectId: string;
    payType: string;
    employeeType?: string;
  }): Promise<Array<{
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name?: string | null;
    email: string;
    employee_number?: string | null;
    project_id: string;
    pay_type: string;
    employee_type: string | null;
    status: string | null;
  }>> {
    const { organizationId, projectId, payType, employeeType } = params;
    let query = (supabase
      .from('employees')
      .select('id, first_name, middle_name, last_name, email, employee_number, project_id, pay_type, employee_type, status, category')
      .eq('project_id', projectId)
      .eq('category', 'projects')
      .eq('pay_type', payType as any)
      .eq('status', 'active')) as any;

    if (employeeType) {
      query = query.eq('employee_type', employeeType);
    }
    if (organizationId) {
      query = (query as any).eq('organization_id', organizationId);
    }

    const { data, error } = await (query.order('first_name') as any);
    if (error) throw error;
    return (data || []) as any[];
  }

  /**
   * Remove employee from a project (sets project_id = null)
   */
  static async removeFromProject(employeeId: string) {
    const { error } = await supabase
      .from('employees')
      .update({ project_id: null } as any)
      .eq('id', employeeId);
    if (error) throw error;
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
          sub_department,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as any;
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

      const counts = (data || []).reduce((acc: any, emp: any) => {
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
        sub_department: validatedData.sub_department,
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
        status: validatedData.employment_status === 'Active' ? 'active' : 'inactive',
      };

      const { data: employee, error } = await supabase
        .from('employees')
        .insert(insertData)
        .select()
        .single() as any;

      if (error) throw error;

      // Sync Head Office membership if applicable
      if (validatedData.category === 'head_office' && validatedData.pay_group_id) {
        // Fetch the master entry to confirm the type
        const { data: masterEntry } = await (supabase
          .from('pay_group_master' as any)
          .select('id, employee_type')
          .eq('source_id', validatedData.pay_group_id)
          .single() as any);

        let pgType: any = 'regular';
        const empType = masterEntry?.employee_type || validatedData.employee_type;

        if (empType.toLowerCase().includes('intern')) pgType = 'intern';
        else if (empType.toLowerCase().includes('expatriate')) pgType = 'expatriate';
        else pgType = 'regular';

        await (supabase.from('head_office_pay_group_members' as any).insert({
          pay_group_id: validatedData.pay_group_id,
          employee_id: employee.id,
          pay_group_type: pgType,
          active: true
        }) as any);
      }

      return {
        id: employee.id,
        first_name: employee.first_name,
        middle_name: employee.middle_name,
        last_name: employee.last_name || '',
        email: employee.email,
        employee_type: employee.employee_type,
        sub_department: employee.sub_department,
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
      if (validatedData.sub_department !== undefined) updateData.sub_department = validatedData.sub_department;
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
      if (validatedData.employee_type !== undefined) updateData.employee_type = validatedData.employee_type;

      const { data: employee, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single() as any;

      if (error) throw error;

      // Sync Head Office membership if pay_group_id or category changed
      if (validatedData.category === 'head_office' && validatedData.pay_group_id) {
        // Fetch the master entry to confirm the type
        const { data: masterEntry } = await (supabase
          .from('pay_group_master' as any)
          .select('id, employee_type')
          .eq('source_id', validatedData.pay_group_id)
          .single() as any);

        let pgType: any = 'regular';
        const empType = masterEntry?.employee_type || validatedData.employee_type || employee.employee_type;

        if (empType.toLowerCase().includes('intern')) pgType = 'intern';
        else if (empType.toLowerCase().includes('expatriate')) pgType = 'expatriate';
        else pgType = 'regular';

        // Deactivate old memberships
        await (supabase
          .from('head_office_pay_group_members' as any)
          .update({ active: false })
          .eq('employee_id', id) as any);

        // Add new membership
        await (supabase.from('head_office_pay_group_members' as any).insert({
          pay_group_id: validatedData.pay_group_id,
          employee_id: id,
          pay_group_type: pgType,
          active: true
        }) as any);
      }

      return {
        id: employee.id,
        first_name: employee.first_name,
        middle_name: employee.middle_name,
        last_name: employee.last_name || '',
        email: employee.email,
        employee_type: employee.employee_type,
        sub_department: employee.sub_department,
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
          } as any)
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
      const { data, error } = await (supabase
        .from('employees' as any)
        .select('employee_number')
        .order('created_at', { ascending: false })
        .limit(1) as any);

      if (error && (error as any).code !== 'PGRST116') throw error;

      if (data && data.length > 0 && (data[0] as any).employee_number) {
        // Extract number from existing employee number (format: EMP-000001)
        const lastNumber = parseInt((data[0] as any).employee_number.replace('EMP-', ''), 10);
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
