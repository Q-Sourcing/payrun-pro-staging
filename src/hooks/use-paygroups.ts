import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayGroupsDataService, type PayGroupWithEmployeeCount, type PayGroupsQueryOptions, type PayGroupSummary } from '@/lib/data/paygroups.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { PayGroupType } from '@/lib/types/paygroups';

/**
 * Hook to fetch pay groups with caching and pagination
 */
export function usePayGroups(options: PayGroupsQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.payGroups.list(options),
    queryFn: () => PayGroupsDataService.getPayGroups(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch pay groups by type
 */
export function usePayGroupsByType(type: PayGroupType, options: Omit<PayGroupsQueryOptions, 'type'> = {}) {
  return useQuery({
    queryKey: queryKeys.payGroups.list({ ...options, type }),
    queryFn: () => PayGroupsDataService.getPayGroupsByType(type, options),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single pay group by ID
 */
export function usePayGroup(id: string, type: PayGroupType) {
  return useQuery({
    queryKey: queryKeys.payGroups.detail(id, type),
    queryFn: () => PayGroupsDataService.getPayGroupById(id, type),
    enabled: !!id && !!type,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual records
  });
}

/**
 * Hook to fetch pay group summary statistics
 */
export function usePayGroupSummary() {
  return useQuery({
    queryKey: queryKeys.payGroups.summary(),
    queryFn: () => PayGroupsDataService.getPayGroupSummary(),
    staleTime: 15 * 60 * 1000, // 15 minutes for summary data
  });
}

/**
 * Hook to fetch employee counts for multiple pay groups (batch query)
 */
export function usePayGroupEmployeeCounts(payGroupIds: string[]) {
  return useQuery({
    queryKey: queryKeys.payGroups.employeeCounts(payGroupIds),
    queryFn: () => PayGroupsDataService.getEmployeeCountsForPayGroups(payGroupIds),
    enabled: payGroupIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes for counts
  });
}

/**
 * Hook to search pay groups
 */
export function usePayGroupSearch(searchTerm: string, options: Omit<PayGroupsQueryOptions, 'search'> = {}) {
  return useQuery({
    queryKey: queryKeys.payGroups.search(searchTerm),
    queryFn: () => PayGroupsDataService.searchPayGroups(searchTerm, options),
    enabled: searchTerm.length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
}

/**
 * Hook to create a new pay group
 */
export function useCreatePayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payGroupData: any) => {
      // This would call your create pay group service
      // For now, we'll assume you have a service method
      throw new Error('Create pay group service not implemented yet');
    },
    onSuccess: () => {
      // Invalidate and refetch pay group queries
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
      toast({
        title: 'Success',
        description: 'Pay group created successfully',
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
 * Hook to update a pay group
 */
export function useUpdatePayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type, data }: { id: string; type: PayGroupType; data: any }) => {
      // This would call your update pay group service
      throw new Error('Update pay group service not implemented yet');
    },
    onSuccess: (_, { id, type }) => {
      // Invalidate specific pay group and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(id, type) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.summary() });
      toast({
        title: 'Success',
        description: 'Pay group updated successfully',
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
 * Hook to delete a pay group
 */
export function useDeletePayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: PayGroupType }) => {
      // This would call your delete pay group service
      throw new Error('Delete pay group service not implemented yet');
    },
    onSuccess: () => {
      // Invalidate all pay group queries
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
      toast({
        title: 'Success',
        description: 'Pay group deleted successfully',
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
