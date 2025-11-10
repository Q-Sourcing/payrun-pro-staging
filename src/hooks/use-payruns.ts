import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayRunsService, type PayRun, type PayRunWithDetails, type PayRunSummary, type PayRunsQueryOptions } from '@/lib/data/payruns.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { CreatePayRunInput, UpdatePayRunInput, PayRunStatus } from '@/lib/validations/payruns.schema';

/**
 * Hook to fetch pay runs with caching and pagination
 */
export function usePayRuns(options: PayRunsQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.payRuns.list(options),
    queryFn: () => PayRunsService.getPayRuns(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch a single pay run by ID
 */
export function usePayRun(id: string) {
  return useQuery({
    queryKey: queryKeys.payRuns.detail(id),
    queryFn: () => PayRunsService.getPayRunById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual records
  });
}

/**
 * Hook to fetch pay run summary statistics
 */
export function usePayRunSummary() {
  return useQuery({
    queryKey: queryKeys.payRuns.summary(),
    queryFn: () => PayRunsService.getPayRunSummary(),
    staleTime: 15 * 60 * 1000, // 15 minutes for summary data
  });
}

/**
 * Hook to create a new pay run with optimistic updates
 */
export function useCreatePayRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payRunData: CreatePayRunInput) => {
      return PayRunsService.createPayRun(payRunData);
    },
    onMutate: async (newPayRun) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.all });

      // Snapshot the previous value
      const previousPayRuns = queryClient.getQueriesData({ queryKey: queryKeys.payRuns.all });

      // Optimistically update the cache with a temporary pay run
      const tempPayRun: PayRunWithDetails = {
        id: `temp-${Date.now()}`,
        pay_run_id: `TEMP-${Date.now()}`,
        pay_run_date: newPayRun.pay_run_date || new Date().toISOString().split('T')[0],
        pay_period_start: newPayRun.pay_period_start,
        pay_period_end: newPayRun.pay_period_end,
        pay_group_id: newPayRun.pay_group_id,
        pay_group_master_id: newPayRun.pay_group_master_id,
        status: newPayRun.status || 'draft',
        total_gross_pay: 0,
        total_deductions: 0,
        total_net_pay: 0,
        category: newPayRun.category,
        sub_type: newPayRun.sub_type,
        pay_frequency: newPayRun.pay_frequency,
        payroll_type: newPayRun.payroll_type,
        exchange_rate: newPayRun.exchange_rate,
        days_worked: newPayRun.days_worked,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pay_items_count: 0,
      };

      queryClient.setQueriesData<{ data: PayRunWithDetails[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payRuns.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [tempPayRun, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousPayRuns };
    },
    onSuccess: (newPayRun) => {
      // Invalidate and refetch pay run queries to get the real data
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.summary() });
      toast({
        title: 'Success',
        description: 'Pay run created successfully',
      });
    },
    onError: (error: Error, _newPayRun, context) => {
      // Rollback optimistic update on error
      if (context?.previousPayRuns) {
        context.previousPayRuns.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create pay run',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a pay run with optimistic updates
 */
export function useUpdatePayRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayRunInput }) => {
      return PayRunsService.updatePayRun(id, data);
    },
    onMutate: async ({ id, data: updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.all });

      // Snapshot the previous values
      const previousPayRun = queryClient.getQueryData<PayRunWithDetails>(queryKeys.payRuns.detail(id));
      const previousPayRuns = queryClient.getQueriesData({ queryKey: queryKeys.payRuns.all });

      // Optimistically update the pay run in cache
      if (previousPayRun) {
        queryClient.setQueryData<PayRunWithDetails>(queryKeys.payRuns.detail(id), {
          ...previousPayRun,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update in lists
      queryClient.setQueriesData<{ data: PayRunWithDetails[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payRuns.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((pr) =>
              pr.id === id
                ? {
                    ...pr,
                    ...updateData,
                    updated_at: new Date().toISOString(),
                  }
                : pr
            ),
          };
        }
      );

      return { previousPayRun, previousPayRuns };
    },
    onSuccess: (updatedPayRun, { id }) => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.summary() });
      toast({
        title: 'Success',
        description: 'Pay run updated successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPayRun) {
        queryClient.setQueryData(queryKeys.payRuns.detail(id), context.previousPayRun);
      }
      if (context?.previousPayRuns) {
        context.previousPayRuns.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pay run',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update pay run status with transition validation
 */
export function useUpdatePayRunStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, approvedBy }: { id: string; status: PayRunStatus; approvedBy?: string }) => {
      return PayRunsService.updatePayRunStatus(id, status, approvedBy);
    },
    onSuccess: (updatedPayRun, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.summary() });
      toast({
        title: 'Success',
        description: `Pay run status updated to ${updatedPayRun.status}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pay run status',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a pay run with optimistic updates
 */
export function useDeletePayRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, hardDelete = false }: { id: string; hardDelete?: boolean }) => {
      return PayRunsService.deletePayRun(id, hardDelete);
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.all });

      // Snapshot the previous values
      const previousPayRun = queryClient.getQueryData<PayRunWithDetails>(queryKeys.payRuns.detail(id));
      const previousPayRuns = queryClient.getQueriesData({ queryKey: queryKeys.payRuns.all });

      // Optimistically remove the pay run from cache
      queryClient.setQueriesData<{ data: PayRunWithDetails[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payRuns.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((pr) => pr.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.payRuns.detail(id) });

      return { previousPayRun, previousPayRuns };
    },
    onSuccess: () => {
      // Invalidate all pay run queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.summary() });
      toast({
        title: 'Success',
        description: 'Pay run deleted successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPayRun) {
        queryClient.setQueryData(queryKeys.payRuns.detail(id), context.previousPayRun);
      }
      if (context?.previousPayRuns) {
        context.previousPayRuns.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete pay run',
        variant: 'destructive',
      });
    },
  });
}

