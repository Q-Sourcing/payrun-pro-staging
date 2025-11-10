import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayGroupsDataService, type PayGroupWithEmployeeCount, type PayGroupsQueryOptions, type PayGroupSummary } from '@/lib/data/paygroups.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { PayGroupType } from '@/lib/types/paygroups';
import type { CreatePayGroupInput, UpdatePayGroupInput } from '@/lib/validations/paygroups.schema';

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
 * Hook to create a new pay group with optimistic updates
 */
export function useCreatePayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payGroupData: CreatePayGroupInput) => {
      return PayGroupsDataService.createPayGroup(payGroupData);
    },
    onMutate: async (newPayGroup) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroups.all });

      // Snapshot the previous value
      const previousPayGroups = queryClient.getQueriesData({ queryKey: queryKeys.payGroups.all });

      // Optimistically update the cache with a temporary pay group
      const tempPayGroup: PayGroupWithEmployeeCount = {
        id: `temp-${Date.now()}`,
        paygroup_id: `TEMP-${newPayGroup.country.substring(0, 1)}${Date.now().toString().slice(-3)}`,
        name: newPayGroup.name,
        type: newPayGroup.type,
        category: newPayGroup.category,
        sub_type: newPayGroup.sub_type,
        pay_frequency: newPayGroup.pay_frequency,
        country: newPayGroup.country,
        currency: newPayGroup.currency || 'UGX',
        status: newPayGroup.status || 'active',
        employee_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: newPayGroup.notes,
        ...(newPayGroup.type === 'regular' ? {
          default_tax_percentage: newPayGroup.default_tax_percentage || 0,
        } : newPayGroup.type === 'expatriate' ? {
          exchange_rate_to_local: newPayGroup.exchange_rate_to_local,
          default_daily_rate: newPayGroup.default_daily_rate || 0,
          tax_country: newPayGroup.tax_country,
        } : {}),
      } as PayGroupWithEmployeeCount;

      queryClient.setQueriesData<{ data: PayGroupWithEmployeeCount[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payGroups.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [tempPayGroup, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousPayGroups };
    },
    onSuccess: (newPayGroup) => {
      // Invalidate and refetch pay group queries to get the real data
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.summary() });
      toast({
        title: 'Success',
        description: 'Pay group created successfully',
      });
    },
    onError: (error: Error, _newPayGroup, context) => {
      // Rollback optimistic update on error
      if (context?.previousPayGroups) {
        context.previousPayGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create pay group',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a pay group with optimistic updates
 */
export function useUpdatePayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type, data }: { id: string; type: PayGroupType; data: UpdatePayGroupInput }) => {
      return PayGroupsDataService.updatePayGroup(id, type, data);
    },
    onMutate: async ({ id, type, data: updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroups.detail(id, type) });
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroups.all });

      // Snapshot the previous values
      const previousPayGroup = queryClient.getQueryData<PayGroupWithEmployeeCount>(queryKeys.payGroups.detail(id, type));
      const previousPayGroups = queryClient.getQueriesData({ queryKey: queryKeys.payGroups.all });

      // Optimistically update the pay group in cache
      if (previousPayGroup) {
        queryClient.setQueryData<PayGroupWithEmployeeCount>(queryKeys.payGroups.detail(id, type), {
          ...previousPayGroup,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update in lists
      queryClient.setQueriesData<{ data: PayGroupWithEmployeeCount[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payGroups.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((pg) =>
              pg.id === id
                ? {
                    ...pg,
                    ...updateData,
                    updated_at: new Date().toISOString(),
                  }
                : pg
            ),
          };
        }
      );

      return { previousPayGroup, previousPayGroups };
    },
    onSuccess: (updatedPayGroup, { id, type }) => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.detail(id, type) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.summary() });
      toast({
        title: 'Success',
        description: 'Pay group updated successfully',
      });
    },
    onError: (error: Error, { id, type }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPayGroup) {
        queryClient.setQueryData(queryKeys.payGroups.detail(id, type), context.previousPayGroup);
      }
      if (context?.previousPayGroups) {
        context.previousPayGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pay group',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a pay group with optimistic updates
 */
export function useDeletePayGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type, hardDelete = false }: { id: string; type: PayGroupType; hardDelete?: boolean }) => {
      return PayGroupsDataService.deletePayGroup(id, type, hardDelete);
    },
    onMutate: async ({ id, type }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payGroups.all });

      // Snapshot the previous values
      const previousPayGroup = queryClient.getQueryData<PayGroupWithEmployeeCount>(queryKeys.payGroups.detail(id, type));
      const previousPayGroups = queryClient.getQueriesData({ queryKey: queryKeys.payGroups.all });

      // Optimistically remove the pay group from cache
      queryClient.setQueriesData<{ data: PayGroupWithEmployeeCount[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payGroups.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((pg) => pg.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.payGroups.detail(id, type) });

      return { previousPayGroup, previousPayGroups };
    },
    onSuccess: () => {
      // Invalidate all pay group queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payGroups.summary() });
      toast({
        title: 'Success',
        description: 'Pay group deleted successfully',
      });
    },
    onError: (error: Error, { id, type }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPayGroup) {
        queryClient.setQueryData(queryKeys.payGroups.detail(id, type), context.previousPayGroup);
      }
      if (context?.previousPayGroups) {
        context.previousPayGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete pay group',
        variant: 'destructive',
      });
    },
  });
}
