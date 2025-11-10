import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeesService, type Employee, type EmployeeWithPayGroup, type EmployeesQueryOptions } from '@/lib/data/employees.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/validations/employees.schema';

/**
 * Hook to fetch employees with caching and pagination
 */
export function useEmployees(options: EmployeesQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.employees.list(options),
    queryFn: () => EmployeesService.getEmployees(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch employees by type
 */
export function useEmployeesByType(employeeType: string, options: Omit<EmployeesQueryOptions, 'employee_type'> = {}) {
  return useQuery({
    queryKey: queryKeys.employees.list({ ...options, employee_type: employeeType }),
    queryFn: () => EmployeesService.getEmployeesByType(employeeType, options),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single employee by ID
 */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => EmployeesService.getEmployeeById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual records
  });
}

/**
 * Hook to search employees with debounced query
 */
export function useEmployeeSearch(searchTerm: string, options: Omit<EmployeesQueryOptions, 'search'> = {}) {
  return useQuery({
    queryKey: queryKeys.employees.search(searchTerm),
    queryFn: () => EmployeesService.searchEmployees(searchTerm, options),
    enabled: searchTerm.length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
}

/**
 * Hook to fetch employee counts by type
 */
export function useEmployeeCounts() {
  return useQuery({
    queryKey: queryKeys.employees.counts(),
    queryFn: () => EmployeesService.getEmployeeCounts(),
    staleTime: 15 * 60 * 1000, // 15 minutes for counts
  });
}

/**
 * Hook to create a new employee with optimistic updates
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeInput) => {
      return EmployeesService.createEmployee(employeeData);
    },
    onMutate: async (newEmployee) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot the previous value
      const previousEmployees = queryClient.getQueriesData({ queryKey: queryKeys.employees.all });

      // Optimistically update the cache with a temporary employee
      const tempEmployee: EmployeeWithPayGroup = {
        id: `temp-${Date.now()}`,
        first_name: newEmployee.first_name,
        middle_name: newEmployee.middle_name,
        last_name: newEmployee.last_name,
        email: newEmployee.email,
        employee_type: newEmployee.employee_type,
        department: newEmployee.department,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueriesData<{ data: EmployeeWithPayGroup[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.employees.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [tempEmployee, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousEmployees };
    },
    onSuccess: (newEmployee) => {
      // Invalidate and refetch employee queries to get the real data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.counts() });
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });
    },
    onError: (error: Error, _newEmployee, context) => {
      // Rollback optimistic update on error
      if (context?.previousEmployees) {
        context.previousEmployees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create employee',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an employee with optimistic updates
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeeInput }) => {
      return EmployeesService.updateEmployee(id, data);
    },
    onMutate: async ({ id, data: updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot the previous values
      const previousEmployee = queryClient.getQueryData<Employee>(queryKeys.employees.detail(id));
      const previousEmployees = queryClient.getQueriesData({ queryKey: queryKeys.employees.all });

      // Optimistically update the employee in cache
      if (previousEmployee) {
        queryClient.setQueryData<Employee>(queryKeys.employees.detail(id), {
          ...previousEmployee,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update in lists
      queryClient.setQueriesData<{ data: EmployeeWithPayGroup[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.employees.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((emp) =>
              emp.id === id
                ? {
                    ...emp,
                    ...updateData,
                    updated_at: new Date().toISOString(),
                  }
                : emp
            ),
          };
        }
      );

      return { previousEmployee, previousEmployees };
    },
    onSuccess: (updatedEmployee, { id }) => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), context.previousEmployee);
      }
      if (context?.previousEmployees) {
        context.previousEmployees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete an employee with optimistic updates
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, hardDelete = false }: { id: string; hardDelete?: boolean }) => {
      return EmployeesService.deleteEmployee(id, hardDelete);
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot the previous values
      const previousEmployee = queryClient.getQueryData<Employee>(queryKeys.employees.detail(id));
      const previousEmployees = queryClient.getQueriesData({ queryKey: queryKeys.employees.all });

      // Optimistically remove the employee from cache
      queryClient.setQueriesData<{ data: EmployeeWithPayGroup[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.employees.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((emp) => emp.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.employees.detail(id) });

      return { previousEmployee, previousEmployees };
    },
    onSuccess: () => {
      // Invalidate all employee queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.counts() });
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), context.previousEmployee);
      }
      if (context?.previousEmployees) {
        context.previousEmployees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete employee',
        variant: 'destructive',
      });
    },
  });
}
