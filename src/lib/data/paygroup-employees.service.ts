import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schemas
const assignEmployeeSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  pay_group_id: z.string().uuid('Invalid pay group ID'),
  pay_group_master_id: z.string().uuid('Invalid pay group master ID').optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
  assigned_by: z.string().uuid('Invalid user ID').optional(),
});

const updateAssignmentSchema = assignEmployeeSchema.partial().extend({
  id: z.string().uuid('Invalid assignment ID'),
  active: z.boolean().optional(),
});

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
      const transformedData: PayGroupEmployee[] = (data || []).map((record: any) => {
        const payGroup = record.pay_groups || record.expatriate_pay_groups || {};
        
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
   * This ensures both sources of truth are in sync
   */
  static async syncPayGroupAssignments(): Promise<{ synced: number; errors: number }> {
    try {
      console.log('🔄 Starting auto-sync of pay group assignments...');
      
      // Get all active assignments from paygroup_employees table
      const { data: assignments, error } = await supabase
        .from('paygroup_employees')
        .select('employee_id, pay_group_id')
        .eq('active', true);

      if (error) {
        console.warn('Sync skipped - paygroup_employees table may not exist:', error);
        return { synced: 0, errors: 0 };
      }

      let synced = 0;
      let errors = 0;

      // Update each employee's pay_group_id to match their active assignment
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

  /**
   * Sync a specific employee's pay_group_id after assignment
   */
  static async syncEmployeeAssignment(employeeId: string, payGroupId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ pay_group_id: payGroupId })
        .eq('id', employeeId);

      if (error) {
        console.error(`Failed to sync employee ${employeeId}:`, error);
        return false;
      }

      console.log(`✅ Synced employee ${employeeId} to pay group ${payGroupId}`);
      return true;
    } catch (error) {
      console.error('Error syncing employee assignment:', error);
      return false;
    }
  }

  /**
   * One-time sync for all existing assignments
   * This should be run once to fix existing data inconsistencies
   */
  static async syncAllExistingAssignments(): Promise<{ synced: number; errors: number; details: string[] }> {
    try {
      console.log('🔄 Starting one-time sync of all existing assignments...');
      
      // Get all active assignments from paygroup_employees table
      const { data: assignments, error } = await supabase
        .from('paygroup_employees')
        .select(`
          employee_id, 
          pay_group_id,
          employees!inner(
            id,
            first_name,
            last_name,
            email,
            pay_group_id
          )
        `)
        .eq('active', true);

      if (error) {
        console.warn('Sync skipped - paygroup_employees table may not exist:', error);
        return { synced: 0, errors: 0, details: ['Table not found'] };
      }

      let synced = 0;
      let errors = 0;
      const details: string[] = [];

      // Update each employee's pay_group_id to match their active assignment
      for (const assignment of assignments || []) {
        const employee = assignment.employees;
        const currentPayGroupId = employee.pay_group_id;
        const assignedPayGroupId = assignment.pay_group_id;

        // Only update if they don't match
        if (currentPayGroupId !== assignedPayGroupId) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({ pay_group_id: assignedPayGroupId })
            .eq('id', assignment.employee_id);

          if (updateError) {
            console.error(`Failed to sync employee ${assignment.employee_id}:`, updateError);
            errors++;
            details.push(`❌ ${employee.first_name} ${employee.last_name}: ${updateError.message}`);
          } else {
            synced++;
            details.push(`✅ ${employee.first_name} ${employee.last_name}: ${currentPayGroupId || 'NULL'} → ${assignedPayGroupId}`);
          }
        } else {
          details.push(`⏭️ ${employee.first_name} ${employee.last_name}: Already synced (${assignedPayGroupId})`);
        }
      }

      console.log(`✅ One-time sync complete: ${synced} synced, ${errors} errors`);
      return { synced, errors, details };
    } catch (error) {
      console.error('Error during one-time sync:', error);
      return { synced: 0, errors: 0, details: [`Error: ${error.message}`] };
    }
  }

  /**
   * Assign an employee to a pay group
   */
  static async assignEmployee(data: {
    employee_id: string;
    pay_group_id: string;
    pay_group_master_id?: string;
    notes?: string;
    assigned_by?: string;
  }): Promise<PayGroupEmployee> {
    try {
      // Validate input
      const validatedData = assignEmployeeSchema.parse(data);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Check if employee is already assigned to this pay group
      const existing = await supabase
        .from('paygroup_employees')
        .select('id, active')
        .eq('employee_id', validatedData.employee_id)
        .eq('pay_group_id', validatedData.pay_group_id)
        .single();

      if (existing.data) {
        // If exists but inactive, reactivate it
        if (!existing.data.active) {
          const { data: reactivated, error: reactivateError } = await supabase
            .from('paygroup_employees')
            .update({
              active: true,
              assigned_at: new Date().toISOString(),
              removed_at: null,
              assigned_by: validatedData.assigned_by || user?.id,
              notes: validatedData.notes,
            })
            .eq('id', existing.data.id)
            .select()
            .single();

          if (reactivateError) throw reactivateError;

          // Sync employee pay_group_id
          await this.syncEmployeeAssignment(validatedData.employee_id, validatedData.pay_group_id);

          // Return the reactivated assignment
          const result = await this.getPayGroupEmployees({ pay_group_id: validatedData.pay_group_id, employee_id: validatedData.employee_id, limit: 1 });
          return result.data[0];
        } else {
          throw new Error('Employee is already assigned to this pay group');
        }
      }

      // Deactivate any other active assignments for this employee
      await supabase
        .from('paygroup_employees')
        .update({
          active: false,
          removed_at: new Date().toISOString(),
        })
        .eq('employee_id', validatedData.employee_id)
        .eq('active', true);

      // Create new assignment
      const { data: assignment, error } = await supabase
        .from('paygroup_employees')
        .insert({
          employee_id: validatedData.employee_id,
          pay_group_id: validatedData.pay_group_id,
          pay_group_master_id: validatedData.pay_group_master_id,
          active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: validatedData.assigned_by || user?.id,
          notes: validatedData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Sync employee pay_group_id
      await this.syncEmployeeAssignment(validatedData.employee_id, validatedData.pay_group_id);

      // Return the full assignment with relations
      const result = await this.getPayGroupEmployees({ pay_group_id: validatedData.pay_group_id, employee_id: validatedData.employee_id, limit: 1 });
      return result.data[0];
    } catch (error: any) {
      console.error('Error assigning employee:', error);
      if (error.issues) {
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to assign employee: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Unassign an employee from a pay group
   */
  static async unassignEmployee(assignmentId: string): Promise<void> {
    try {
      // Get the assignment
      const { data: assignment, error: fetchError } = await supabase
        .from('paygroup_employees')
        .select('employee_id, pay_group_id')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!assignment) throw new Error('Assignment not found');

      // Soft delete by setting active to false
      const { error } = await supabase
        .from('paygroup_employees')
        .update({
          active: false,
          removed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;

      // Clear employee's pay_group_id
      await supabase
        .from('employees')
        .update({ pay_group_id: null })
        .eq('id', assignment.employee_id);
    } catch (error: any) {
      console.error('Error unassigning employee:', error);
      throw new Error(`Failed to unassign employee: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(id: string, data: {
    pay_group_id?: string;
    pay_group_master_id?: string;
    notes?: string;
    active?: boolean;
  }): Promise<PayGroupEmployee> {
    try {
      // Validate input
      const validatedData = updateAssignmentSchema.parse({ ...data, id });

      // Check if assignment exists
      const existing = await supabase
        .from('paygroup_employees')
        .select('employee_id, pay_group_id')
        .eq('id', id)
        .single();

      if (existing.error || !existing.data) {
        throw new Error('Assignment not found');
      }

      // Prepare update data
      const updateData: any = {};

      if (validatedData.pay_group_id !== undefined) updateData.pay_group_id = validatedData.pay_group_id;
      if (validatedData.pay_group_master_id !== undefined) updateData.pay_group_master_id = validatedData.pay_group_master_id;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
      if (validatedData.active !== undefined) {
        updateData.active = validatedData.active;
        if (validatedData.active) {
          updateData.removed_at = null;
        } else {
          updateData.removed_at = new Date().toISOString();
        }
      }

      const { data: updated, error } = await supabase
        .from('paygroup_employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Sync employee pay_group_id if pay_group_id changed
      if (validatedData.pay_group_id !== undefined && validatedData.active !== false) {
        await this.syncEmployeeAssignment(existing.data.employee_id, validatedData.pay_group_id);
      }

      // Return the full assignment with relations
      const result = await this.getPayGroupEmployees({ 
        pay_group_id: updated.pay_group_id, 
        employee_id: updated.employee_id, 
        limit: 1 
      });
      return result.data[0];
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      if (error.issues) {
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update assignment: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Bulk assign employees to a pay group
   */
  static async bulkAssignEmployees(
    employeeIds: string[],
    payGroupId: string,
    options?: { notes?: string; assigned_by?: string }
  ): Promise<{ success: number; errors: number; details: string[] }> {
    let success = 0;
    let errors = 0;
    const details: string[] = [];

    for (const employeeId of employeeIds) {
      try {
        await this.assignEmployee({
          employee_id: employeeId,
          pay_group_id: payGroupId,
          notes: options?.notes,
          assigned_by: options?.assigned_by,
        });
        success++;
        details.push(`✅ Employee ${employeeId} assigned successfully`);
      } catch (error: any) {
        errors++;
        details.push(`❌ Employee ${employeeId}: ${error.message}`);
      }
    }

    return { success, errors, details };
  }

  /**
   * Bulk unassign employees from a pay group
   */
  static async bulkUnassignEmployees(assignmentIds: string[]): Promise<{ success: number; errors: number; details: string[] }> {
    let success = 0;
    let errors = 0;
    const details: string[] = [];

    for (const assignmentId of assignmentIds) {
      try {
        await this.unassignEmployee(assignmentId);
        success++;
        details.push(`✅ Assignment ${assignmentId} removed successfully`);
      } catch (error: any) {
        errors++;
        details.push(`❌ Assignment ${assignmentId}: ${error.message}`);
      }
    }

    return { success, errors, details };
  }
}
