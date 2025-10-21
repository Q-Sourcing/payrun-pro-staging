import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeesService, type Employee, type EmployeeWithPayGroup, type EmployeesQueryOptions } from '@/lib/data/employees.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';

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
 * Hook to create a new employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (employeeData: Partial<Employee>) => {
      // This would call your create employee service
      // For now, we'll assume you have a service method
      throw new Error('Create employee service not implemented yet');
    },
    onSuccess: () => {
      // Invalidate and refetch employee queries
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({
        title: 'Success',
        description: 'Employee created successfully',
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

/**
 * Hook to update an employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      // This would call your update employee service
      throw new Error('Update employee service not implemented yet');
    },
    onSuccess: (_, { id }) => {
      // Invalidate specific employee and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
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

/**
 * Hook to delete an employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // This would call your delete employee service
      throw new Error('Delete employee service not implemented yet');
    },
    onSuccess: () => {
      // Invalidate all employee queries
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
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
