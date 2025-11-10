import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayGroupEmployeesService, type PayGroupEmployee, type PayGroupEmployeesQueryOptions } from '@/lib/data/paygroup-employees.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to fetch pay group employees with caching and pagination
 */
export function usePayGroupEmployees(options: PayGroupEmployeesQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.list(options),
    queryFn: () => PayGroupEmployeesService.getPayGroupEmployees(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch employees by pay group
 */
export function useEmployeesByPayGroup(payGroupId: string, options: Omit<PayGroupEmployeesQueryOptions, 'pay_group_id'> = {}) {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.byPayGroup(payGroupId),
    queryFn: () => PayGroupEmployeesService.getEmployeesByPayGroup(payGroupId, options),
    enabled: !!payGroupId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch pay groups by employee
 */
export function usePayGroupsByEmployee(employeeId: string, options: Omit<PayGroupEmployeesQueryOptions, 'employee_id'> = {}) {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.byEmployee(employeeId),
    queryFn: () => PayGroupEmployeesService.getPayGroupsByEmployee(employeeId, options),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch current pay group for an employee
 */
export function useCurrentPayGroupForEmployee(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.currentPayGroup(employeeId),
    queryFn: () => PayGroupEmployeesService.getCurrentPayGroupForEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch assignment statistics
 */
export function useAssignmentStats() {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.stats(),
    queryFn: () => PayGroupEmployeesService.getAssignmentStats(),
    staleTime: 15 * 60 * 1000, // 15 minutes for stats
  });
}

/**
 * Hook to assign an employee to a pay group with optimistic updates
 */
export function useAssignEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      employee_id: string;
      pay_group_id: string;
      pay_group_master_id?: string;
      notes?: string;
      assigned_by?: string;
    }) => {
      return PayGroupEmployeesService.assignEmployee(data);
    },
    onMutate: async (newAssignment) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroupEmployees.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroups.all });

      const previousAssignments = queryClient.getQueriesData({ queryKey: queryKeys.payGroupEmployees.all });
      const previousEmployees = queryClient.getQueriesData({ queryKey: queryKeys.employees.all });
      const previousPayGroups = queryClient.getQueriesData({ queryKey: queryKeys.payGroups.all });

      // Optimistically update cache
      queryClient.setQueriesData<{ data: PayGroupEmployee[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payGroupEmployees.lists() },
        (old) => {
          if (!old) return old;
          const tempAssignment: PayGroupEmployee = {
            id: `temp-${Date.now()}`,
            employee_id: newAssignment.employee_id,
            pay_group_id: newAssignment.pay_group_id,
            active: true,
            assigned_at: new Date().toISOString(),
            notes: newAssignment.notes,
            employee: {} as any,
            pay_group: {} as any,
          };
          return {
            ...old,
            data: [tempAssignment, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousAssignments, previousEmployees, previousPayGroups };
    },
    onSuccess: (newAssignment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byPayGroup(newAssignment.pay_group_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byEmployee(newAssignment.employee_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.currentPayGroup(newAssignment.employee_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(newAssignment.employee_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(newAssignment.pay_group_id, 'regular') });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.stats() });
      toast({
        title: 'Success',
        description: 'Employee assigned to pay group successfully',
      });
    },
    onError: (error: Error, _newAssignment, context) => {
      if (context?.previousAssignments) {
        context.previousAssignments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousEmployees) {
        context.previousEmployees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousPayGroups) {
        context.previousPayGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign employee',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to unassign an employee from a pay group with optimistic updates
 */
export function useUnassignEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      return PayGroupEmployeesService.unassignEmployee(assignmentId);
    },
    onMutate: async (assignmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroupEmployees.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      const previousAssignments = queryClient.getQueriesData({ queryKey: queryKeys.payGroupEmployees.all });
      const previousEmployees = queryClient.getQueriesData({ queryKey: queryKeys.employees.all });

      // Get assignment details before removing
      const assignments = queryClient.getQueriesData({ queryKey: queryKeys.payGroupEmployees.lists() });
      let employeeId: string | undefined;
      let payGroupId: string | undefined;

      assignments.forEach(([queryKey, data]: [any, any]) => {
        if (data?.data) {
          const assignment = data.data.find((a: PayGroupEmployee) => a.id === assignmentId);
          if (assignment) {
            employeeId = assignment.employee_id;
            payGroupId = assignment.pay_group_id;
          }
        }
      });

      // Optimistically remove from cache
      queryClient.setQueriesData<{ data: PayGroupEmployee[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payGroupEmployees.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((assignment) => assignment.id !== assignmentId),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      return { previousAssignments, previousEmployees, employeeId, payGroupId };
    },
    onSuccess: (_, assignmentId, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.all });
      if (context?.employeeId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byEmployee(context.employeeId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.currentPayGroup(context.employeeId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(context.employeeId) });
      }
      if (context?.payGroupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byPayGroup(context.payGroupId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(context.payGroupId, 'regular') });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.stats() });
      toast({
        title: 'Success',
        description: 'Employee unassigned from pay group successfully',
      });
    },
    onError: (error: Error, _assignmentId, context) => {
      if (context?.previousAssignments) {
        context.previousAssignments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousEmployees) {
        context.previousEmployees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to unassign employee',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an assignment with optimistic updates
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { pay_group_id?: string; pay_group_master_id?: string; notes?: string; active?: boolean } }) => {
      return PayGroupEmployeesService.updateAssignment(id, data);
    },
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroupEmployees.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      const previousAssignments = queryClient.getQueriesData({ queryKey: queryKeys.payGroupEmployees.all });
      const previousEmployees = queryClient.getQueriesData({ queryKey: queryKeys.employees.all });

      // Optimistically update in cache
      queryClient.setQueriesData<{ data: PayGroupEmployee[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payGroupEmployees.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((assignment) =>
              assignment.id === id
                ? {
                    ...assignment,
                    ...updateData,
                  }
                : assignment
            ),
          };
        }
      );

      return { previousAssignments, previousEmployees };
    },
    onSuccess: (updatedAssignment, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byPayGroup(updatedAssignment.pay_group_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byEmployee(updatedAssignment.employee_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(updatedAssignment.employee_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(updatedAssignment.pay_group_id, 'regular') });
      toast({
        title: 'Success',
        description: 'Assignment updated successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousAssignments) {
        context.previousAssignments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousEmployees) {
        context.previousEmployees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to bulk assign employees
 */
export function useBulkAssignEmployees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeIds, payGroupId, options }: { employeeIds: string[]; payGroupId: string; options?: { notes?: string; assigned_by?: string } }) => {
      return PayGroupEmployeesService.bulkAssignEmployees(employeeIds, payGroupId, options);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.stats() });
      toast({
        title: 'Bulk Assignment Complete',
        description: `${result.success} employees assigned successfully, ${result.errors} errors`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk assign employees',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to bulk unassign employees
 */
export function useBulkUnassignEmployees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      return PayGroupEmployeesService.bulkUnassignEmployees(assignmentIds);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.stats() });
      toast({
        title: 'Bulk Unassignment Complete',
        description: `${result.success} employees unassigned successfully, ${result.errors} errors`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk unassign employees',
        variant: 'destructive',
      });
    },
  });
}
