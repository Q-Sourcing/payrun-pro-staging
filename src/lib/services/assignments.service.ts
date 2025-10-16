import { supabase } from '@/integrations/supabase/client';

export interface AssignmentPayload {
  employee_id: string;
  pay_group_id: string;
  assigned_by?: string;
  notes?: string;
}

export interface AssignmentResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class AssignmentsService {
  /**
   * Assign an employee to a pay group using the Edge Function
   */
  static async assignEmployeeToPayGroup(payload: AssignmentPayload): Promise<AssignmentResult> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-employee-to-paygroup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result?.error || 'Assignment failed'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error assigning employee to pay group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all assignments for a specific pay group
   */
  static async getAssignmentsByPayGroup(payGroupId: string) {
    try {
      const { data, error } = await supabase
        .from('paygroup_employees')
        .select(`
          *,
          employees (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            department
          )
        `)
        .eq('pay_group_id', payGroupId)
        .eq('active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
  }

  /**
   * Get all assignments for a specific employee
   */
  static async getAssignmentsByEmployee(employeeId: string) {
    try {
      const { data, error } = await supabase
        .from('paygroup_employees')
        .select(`
          *,
          pay_groups (
            id,
            name,
            type,
            country,
            currency
          )
        `)
        .eq('employee_id', employeeId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching employee assignments:', error);
      throw error;
    }
  }

  /**
   * Deactivate an assignment (soft delete)
   */
  static async deactivateAssignment(assignmentId: string) {
    try {
      const { error } = await supabase
        .from('paygroup_employees')
        .update({ active: false })
        .eq('id', assignmentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deactivating assignment:', error);
      throw error;
    }
  }

  /**
   * Get payroll configuration for an organization
   */
  static async getPayrollConfiguration(organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('payroll_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return data;
    } catch (error) {
      console.error('Error fetching payroll configuration:', error);
      throw error;
    }
  }

  /**
   * Update payroll configuration
   */
  static async updatePayrollConfiguration(organizationId: string, useStrictMode: boolean) {
    try {
      const { data, error } = await supabase
        .from('payroll_configurations')
        .upsert({
          organization_id: organizationId,
          use_strict_mode: useStrictMode,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating payroll configuration:', error);
      throw error;
    }
  }
}
