import { supabase } from '@/integrations/supabase/client';
import { AssignmentsService, AssignmentPayload } from './assignments.service';

export interface BulkAssignmentPayload {
    organizationId?: string;
    payGroupId: string;
    employeeIds: string[];
    assignedBy?: string;
    notes?: string;
}

export interface BulkAssignmentResult {
    success: boolean;
    successCount: number;
    failureCount: number;
    errors?: Array<{ employeeId: string; error: string }>;
}

/**
 * Service for managing employee-paygroup assignments
 */
export class EmployeePayGroupsService {
    /**
     * Assign multiple employees to a pay group
     */
    static async assignEmployeesToPayGroup(
        payload: BulkAssignmentPayload
    ): Promise<BulkAssignmentResult> {
        const { payGroupId, employeeIds, assignedBy, notes } = payload;

        const results: BulkAssignmentResult = {
            success: true,
            successCount: 0,
            failureCount: 0,
            errors: [],
        };

        // Process each employee assignment
        for (const employeeId of employeeIds) {
            try {
                const assignmentPayload: AssignmentPayload = {
                    employee_id: employeeId,
                    pay_group_id: payGroupId,
                    assigned_by: assignedBy,
                    notes,
                };

                const result = await AssignmentsService.assignEmployeeToPayGroup(assignmentPayload);

                if (result.success) {
                    results.successCount++;
                } else {
                    results.failureCount++;
                    results.errors?.push({
                        employeeId,
                        error: result.error || 'Unknown error',
                    });
                }
            } catch (error) {
                results.failureCount++;
                results.errors?.push({
                    employeeId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Mark as failed if any assignments failed
        if (results.failureCount > 0) {
            results.success = false;
        }

        return results;
    }

    /**
     * Remove employees from a pay group
     */
    static async removeEmployeesFromPayGroup(
        payGroupId: string,
        employeeIds: string[]
    ): Promise<BulkAssignmentResult> {
        const results: BulkAssignmentResult = {
            success: true,
            successCount: 0,
            failureCount: 0,
            errors: [],
        };

        for (const employeeId of employeeIds) {
            try {
                // Find the assignment record
                const { data: assignments, error: fetchError } = await supabase
                    .from('paygroup_employees')
                    .select('id')
                    .eq('pay_group_id', payGroupId)
                    .eq('employee_id', employeeId)
                    .eq('active', true);

                if (fetchError) throw fetchError;

                if (assignments && assignments.length > 0) {
                    // Deactivate each assignment
                    for (const assignment of assignments) {
                        await AssignmentsService.deactivateAssignment(assignment.id);
                    }
                    results.successCount++;
                } else {
                    results.failureCount++;
                    results.errors?.push({
                        employeeId,
                        error: 'No active assignment found',
                    });
                }
            } catch (error) {
                results.failureCount++;
                results.errors?.push({
                    employeeId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        if (results.failureCount > 0) {
            results.success = false;
        }

        return results;
    }

    /**
     * Get all employees assigned to a pay group
     */
    static async getEmployeesByPayGroup(payGroupId: string) {
        return AssignmentsService.getAssignmentsByPayGroup(payGroupId);
    }

    /**
     * Get all pay groups assigned to an employee
     */
    static async getPayGroupsByEmployee(employeeId: string) {
        return AssignmentsService.getAssignmentsByEmployee(employeeId);
    }
}
