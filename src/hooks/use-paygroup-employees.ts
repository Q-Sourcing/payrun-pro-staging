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
 * Hook to fetch employees assigned to a specific pay group
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
 * Hook to fetch pay groups for a specific employee
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
 * Hook to fetch current active pay group for an employee
 */
export function useCurrentPayGroupForEmployee(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.currentPayGroup(employeeId),
    queryFn: () => PayGroupEmployeesService.getCurrentPayGroupForEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes for current assignments
  });
}

/**
 * Hook to fetch employee counts for multiple pay groups (batch query)
 */
export function useEmployeeCountsForPayGroups(payGroupIds: string[]) {
  return useQuery({
    queryKey: queryKeys.payGroupEmployees.list({ pay_group_id: payGroupIds.join(',') }),
    queryFn: () => PayGroupEmployeesService.getEmployeeCountsForPayGroups(payGroupIds),
    enabled: payGroupIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes for counts
  });
}

/**
 * Hook to check if an employee is already assigned to any pay group
 */
export function useIsEmployeeAssigned(employeeId: string) {
  return useQuery({
    queryKey: [...queryKeys.payGroupEmployees.all, 'isAssigned', employeeId],
    queryFn: () => PayGroupEmployeesService.isEmployeeAssigned(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
 * Hook to assign an employee to a pay group
 */
export function useAssignEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, payGroupId, notes }: { employeeId: string; payGroupId: string; notes?: string }) => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-employee-to-paygroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('@/integrations/supabase/client')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          employee_id: employeeId,
          pay_group_id: payGroupId,
          notes: notes || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Assignment failed');
      }

      return result;
    },
    onSuccess: async (_, { employeeId, payGroupId }) => {
      // Sync the employee's pay_group_id to match the assignment
      try {
        const { PayGroupEmployeesService } = await import('@/lib/data/paygroup-employees.service');
        await PayGroupEmployeesService.syncEmployeeAssignment(employeeId, payGroupId);
      } catch (syncError) {
        console.warn('Failed to sync employee assignment:', syncError);
        // Don't fail the whole operation if sync fails
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byPayGroup(payGroupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byEmployee(employeeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.currentPayGroup(employeeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all }); // For employee counts
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // For employee directory
      
      toast({
        title: 'Success',
        description: 'Employee assigned to pay group successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to remove an employee from a pay group
 */
export function useRemoveEmployeeFromPayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, payGroupId }: { employeeId: string; payGroupId: string }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('paygroup_employees')
        .update({ 
          active: false,
          removed_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('pay_group_id', payGroupId);

      if (error) throw error;
    },
    onSuccess: (_, { employeeId, payGroupId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byPayGroup(payGroupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.byEmployee(employeeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.currentPayGroup(employeeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroupEmployees.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all }); // For employee counts
      
      toast({
        title: 'Success',
        description: 'Employee removed from pay group successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
