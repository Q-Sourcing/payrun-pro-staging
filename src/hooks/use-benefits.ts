import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BenefitsService, type Benefit, type BenefitsQueryOptions } from '@/lib/data/benefits.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { CreateBenefitInput, UpdateBenefitInput } from '@/lib/validations/benefits.schema';

/**
 * Hook to fetch benefits with caching and pagination
 */
export function useBenefits(options: BenefitsQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.benefits.list(options),
    queryFn: () => BenefitsService.getBenefits(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch benefits by country
 */
export function useBenefitsByCountry(country: string) {
  return useQuery({
    queryKey: queryKeys.benefits.byCountry(country),
    queryFn: () => BenefitsService.getBenefitsByCountry(country),
    enabled: !!country,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single benefit by ID
 */
export function useBenefit(id: string) {
  return useQuery({
    queryKey: queryKeys.benefits.detail(id),
    queryFn: () => BenefitsService.getBenefitById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual records
  });
}

/**
 * Hook to create a new benefit with optimistic updates
 */
export function useCreateBenefit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (benefitData: CreateBenefitInput) => {
      return BenefitsService.createBenefit(benefitData);
    },
    onMutate: async (newBenefit) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.benefits.all });
      const previousBenefits = queryClient.getQueriesData({ queryKey: queryKeys.benefits.all });

      const tempBenefit: Benefit = {
        id: `temp-${Date.now()}`,
        name: newBenefit.name,
        cost: newBenefit.cost,
        cost_type: newBenefit.cost_type,
        benefit_type: newBenefit.benefit_type,
        applicable_countries: newBenefit.applicable_countries || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueriesData<{ data: Benefit[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.benefits.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [tempBenefit, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousBenefits };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.benefits.all });
      toast({
        title: 'Success',
        description: 'Benefit created successfully',
      });
    },
    onError: (error: Error, _newBenefit, context) => {
      if (context?.previousBenefits) {
        context.previousBenefits.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create benefit',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a benefit with optimistic updates
 */
export function useUpdateBenefit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBenefitInput }) => {
      return BenefitsService.updateBenefit(id, data);
    },
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.benefits.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.benefits.all });

      const previousBenefit = queryClient.getQueryData<Benefit>(queryKeys.benefits.detail(id));
      const previousBenefits = queryClient.getQueriesData({ queryKey: queryKeys.benefits.all });

      if (previousBenefit) {
        queryClient.setQueryData<Benefit>(queryKeys.benefits.detail(id), {
          ...previousBenefit,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      queryClient.setQueriesData<{ data: Benefit[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.benefits.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((benefit) =>
              benefit.id === id
                ? {
                    ...benefit,
                    ...updateData,
                    updated_at: new Date().toISOString(),
                  }
                : benefit
            ),
          };
        }
      );

      return { previousBenefit, previousBenefits };
    },
    onSuccess: (updatedBenefit, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.benefits.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.benefits.lists() });
      toast({
        title: 'Success',
        description: 'Benefit updated successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousBenefit) {
        queryClient.setQueryData(queryKeys.benefits.detail(id), context.previousBenefit);
      }
      if (context?.previousBenefits) {
        context.previousBenefits.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update benefit',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a benefit with optimistic updates
 */
export function useDeleteBenefit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return BenefitsService.deleteBenefit(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.benefits.all });

      const previousBenefit = queryClient.getQueryData<Benefit>(queryKeys.benefits.detail(id));
      const previousBenefits = queryClient.getQueriesData({ queryKey: queryKeys.benefits.all });

      queryClient.setQueriesData<{ data: Benefit[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.benefits.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((benefit) => benefit.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      queryClient.removeQueries({ queryKey: queryKeys.benefits.detail(id) });

      return { previousBenefit, previousBenefits };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.benefits.all });
      toast({
        title: 'Success',
        description: 'Benefit deleted successfully',
      });
    },
    onError: (error: Error, id, context) => {
      if (context?.previousBenefit) {
        queryClient.setQueryData(queryKeys.benefits.detail(id), context.previousBenefit);
      }
      if (context?.previousBenefits) {
        context.previousBenefits.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete benefit',
        variant: 'destructive',
      });
    },
  });
}

