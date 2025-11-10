import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayItemsService, type PayItem, type PayItemWithDetails, type PayItemsQueryOptions } from '@/lib/data/payitems.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { CreatePayItemInput, UpdatePayItemInput } from '@/lib/validations/payitems.schema';

/**
 * Hook to fetch pay items with caching and pagination
 */
export function usePayItems(options: PayItemsQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.payItems.list(options),
    queryFn: () => PayItemsService.getPayItems(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch pay items by pay run ID
 */
export function usePayItemsByPayRun(payRunId: string) {
  return useQuery({
    queryKey: queryKeys.payItems.byPayRun(payRunId),
    queryFn: () => PayItemsService.getPayItemsByPayRun(payRunId),
    enabled: !!payRunId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch pay items by employee ID
 */
export function usePayItemsByEmployee(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.payItems.byEmployee(employeeId),
    queryFn: () => PayItemsService.getPayItemsByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single pay item by ID
 */
export function usePayItem(id: string) {
  return useQuery({
    queryKey: queryKeys.payItems.detail(id),
    queryFn: () => PayItemsService.getPayItemById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual records
  });
}

/**
 * Hook to create a new pay item with optimistic updates
 */
export function useCreatePayItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payItemData: CreatePayItemInput) => {
      return PayItemsService.createPayItem(payItemData);
    },
    onMutate: async (newPayItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payItems.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.all });

      // Snapshot the previous values
      const previousPayItems = queryClient.getQueriesData({ queryKey: queryKeys.payItems.all });
      const previousPayRuns = queryClient.getQueriesData({ queryKey: queryKeys.payRuns.all });

      // Optimistically update the cache
      const tempPayItem: PayItemWithDetails = {
        id: `temp-${Date.now()}`,
        pay_run_id: newPayItem.pay_run_id,
        employee_id: newPayItem.employee_id,
        hours_worked: newPayItem.hours_worked,
        pieces_completed: newPayItem.pieces_completed,
        gross_pay: newPayItem.gross_pay,
        tax_deduction: newPayItem.tax_deduction,
        benefit_deductions: newPayItem.benefit_deductions,
        employer_contributions: newPayItem.employer_contributions,
        total_deductions: newPayItem.total_deductions,
        net_pay: newPayItem.net_pay,
        status: newPayItem.status || 'draft',
        notes: newPayItem.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueriesData<{ data: PayItemWithDetails[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payItems.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [tempPayItem, ...old.data],
            total: old.total + 1,
          };
        }
      );

      // Update pay items by pay run cache
      queryClient.setQueriesData<PayItemWithDetails[]>(
        { queryKey: queryKeys.payItems.byPayRun(newPayItem.pay_run_id) },
        (old) => {
          if (!old) return [tempPayItem];
          return [tempPayItem, ...old];
        }
      );

      return { previousPayItems, previousPayRuns };
    },
    onSuccess: (newPayItem) => {
      // Invalidate and refetch to get real data
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.byPayRun(newPayItem.pay_run_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.detail(newPayItem.pay_run_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.summary() });
      toast({
        title: 'Success',
        description: 'Pay item created successfully',
      });
    },
    onError: (error: Error, _newPayItem, context) => {
      // Rollback optimistic update on error
      if (context?.previousPayItems) {
        context.previousPayItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousPayRuns) {
        context.previousPayRuns.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create pay item',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a pay item with optimistic updates
 */
export function useUpdatePayItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayItemInput }) => {
      return PayItemsService.updatePayItem(id, data);
    },
    onMutate: async ({ id, data: updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payItems.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.payItems.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.all });

      // Snapshot the previous values
      const previousPayItem = queryClient.getQueryData<PayItemWithDetails>(queryKeys.payItems.detail(id));
      const previousPayItems = queryClient.getQueriesData({ queryKey: queryKeys.payItems.all });
      const previousPayRuns = queryClient.getQueriesData({ queryKey: queryKeys.payRuns.all });

      // Optimistically update the pay item in cache
      if (previousPayItem) {
        queryClient.setQueryData<PayItemWithDetails>(queryKeys.payItems.detail(id), {
          ...previousPayItem,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update in lists
      queryClient.setQueriesData<{ data: PayItemWithDetails[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payItems.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...updateData,
                    updated_at: new Date().toISOString(),
                  }
                : item
            ),
          };
        }
      );

      return { previousPayItem, previousPayItems, previousPayRuns };
    },
    onSuccess: (updatedPayItem, { id }) => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.byPayRun(updatedPayItem.pay_run_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.detail(updatedPayItem.pay_run_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.summary() });
      toast({
        title: 'Success',
        description: 'Pay item updated successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPayItem) {
        queryClient.setQueryData(queryKeys.payItems.detail(id), context.previousPayItem);
      }
      if (context?.previousPayItems) {
        context.previousPayItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousPayRuns) {
        context.previousPayRuns.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pay item',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a pay item with optimistic updates
 */
export function useDeletePayItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return PayItemsService.deletePayItem(id);
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.payItems.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.payRuns.all });

      // Snapshot the previous values
      const previousPayItem = queryClient.getQueryData<PayItemWithDetails>(queryKeys.payItems.detail(id));
      const previousPayItems = queryClient.getQueriesData({ queryKey: queryKeys.payItems.all });
      const previousPayRuns = queryClient.getQueriesData({ queryKey: queryKeys.payRuns.all });

      // Optimistically remove the pay item from cache
      queryClient.setQueriesData<{ data: PayItemWithDetails[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.payItems.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((item) => item.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.payItems.detail(id) });

      return { previousPayItem, previousPayItems, previousPayRuns };
    },
    onSuccess: (_, id) => {
      // Invalidate all pay item queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.all });
      toast({
        title: 'Success',
        description: 'Pay item deleted successfully',
      });
    },
    onError: (error: Error, id, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPayItem) {
        queryClient.setQueryData(queryKeys.payItems.detail(id), context.previousPayItem);
      }
      if (context?.previousPayItems) {
        context.previousPayItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousPayRuns) {
        context.previousPayRuns.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete pay item',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to recalculate a pay item
 */
export function useRecalculatePayItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, payRate, payType }: { id: string; payRate: number; payType: 'hourly' | 'salary' | 'piece_rate' | 'daily_rate' }) => {
      return PayItemsService.recalculatePayItem(id, payRate, payType);
    },
    onSuccess: (updatedPayItem, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payItems.byPayRun(updatedPayItem.pay_run_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payRuns.detail(updatedPayItem.pay_run_id) });
      toast({
        title: 'Success',
        description: 'Pay item recalculated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to recalculate pay item',
        variant: 'destructive',
      });
    },
  });
}

