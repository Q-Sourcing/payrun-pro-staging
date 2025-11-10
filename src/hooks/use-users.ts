import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersService, type UserWithRole, type UsersQueryOptions } from '@/lib/data/users.service';
import { queryKeys } from '@/lib/data/query-client';
import { useToast } from '@/hooks/use-toast';
import type { CreateUserInput, UpdateUserInput } from '@/lib/validations/users.schema';

/**
 * Hook to fetch users with caching and pagination
 */
export function useUsers(options: UsersQueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(options),
    queryFn: () => UsersService.getUsers(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch users by role
 */
export function useUsersByRole(role: string) {
  return useQuery({
    queryKey: queryKeys.users.byRole(role),
    queryFn: () => UsersService.getUsersByRole(role as any),
    enabled: !!role,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => UsersService.getUserById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual records
  });
}

/**
 * Hook to create a new user with optimistic updates
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userData, password }: { userData: CreateUserInput; password?: string }) => {
      return UsersService.createUser(userData, password);
    },
    onMutate: async ({ userData }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      const previousUsers = queryClient.getQueriesData({ queryKey: queryKeys.users.all });

      const tempUser: UserWithRole = {
        id: `temp-${Date.now()}`,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        isActive: userData.is_active ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: userData.permissions as any[],
        restrictions: userData.restrictions,
        twoFactorEnabled: userData.two_factor_enabled ?? false,
        sessionTimeout: userData.session_timeout ?? 480,
      };

      queryClient.setQueriesData<{ data: UserWithRole[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.users.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [tempUser, ...old.data],
            total: old.total + 1,
          };
        }
      );

      return { previousUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (error: Error, _newUser, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a user with optimistic updates
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserInput }) => {
      return UsersService.updateUser(id, data);
    },
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });

      const previousUser = queryClient.getQueryData<UserWithRole>(queryKeys.users.detail(id));
      const previousUsers = queryClient.getQueriesData({ queryKey: queryKeys.users.all });

      if (previousUser) {
        queryClient.setQueryData<UserWithRole>(queryKeys.users.detail(id), {
          ...previousUser,
          ...updateData,
          updatedAt: new Date().toISOString(),
        });
      }

      queryClient.setQueriesData<{ data: UserWithRole[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.users.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((user) =>
              user.id === id
                ? {
                    ...user,
                    ...updateData,
                    updatedAt: new Date().toISOString(),
                  }
                : user
            ),
          };
        }
      );

      return { previousUser, previousUsers };
    },
    onSuccess: (updatedUser, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(id), context.previousUser);
      }
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a user with optimistic updates
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, hardDelete = false }: { id: string; hardDelete?: boolean }) => {
      return UsersService.deleteUser(id, hardDelete);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });

      const previousUser = queryClient.getQueryData<UserWithRole>(queryKeys.users.detail(id));
      const previousUsers = queryClient.getQueriesData({ queryKey: queryKeys.users.all });

      queryClient.setQueriesData<{ data: UserWithRole[]; total: number; page: number; limit: number }>(
        { queryKey: queryKeys.users.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((user) => user.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });

      return { previousUser, previousUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(id), context.previousUser);
      }
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });
}

