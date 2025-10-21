import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults for Supabase
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 10 minutes to reduce API calls
      staleTime: 10 * 60 * 1000, // 10 minutes
      // Keep data in cache for 15 minutes after it becomes stale
      gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
      // Retry failed requests up to 3 times
      retry: 3,
      // Don't refetch on window focus to reduce unnecessary calls
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect unless data is stale
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // Employee queries
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    counts: () => [...queryKeys.employees.all, 'counts'] as const,
    search: (term: string) => [...queryKeys.employees.all, 'search', term] as const,
  },
  
  // Pay group queries
  payGroups: {
    all: ['payGroups'] as const,
    lists: () => [...queryKeys.payGroups.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.payGroups.lists(), filters] as const,
    details: () => [...queryKeys.payGroups.all, 'detail'] as const,
    detail: (id: string, type: string) => [...queryKeys.payGroups.details(), id, type] as const,
    summary: () => [...queryKeys.payGroups.all, 'summary'] as const,
    employeeCounts: (ids: string[]) => [...queryKeys.payGroups.all, 'employeeCounts', ids] as const,
    search: (term: string) => [...queryKeys.payGroups.all, 'search', term] as const,
  },
  
  // Pay group employee queries
  payGroupEmployees: {
    all: ['payGroupEmployees'] as const,
    lists: () => [...queryKeys.payGroupEmployees.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.payGroupEmployees.lists(), filters] as const,
    byPayGroup: (payGroupId: string) => [...queryKeys.payGroupEmployees.all, 'byPayGroup', payGroupId] as const,
    byEmployee: (employeeId: string) => [...queryKeys.payGroupEmployees.all, 'byEmployee', employeeId] as const,
    currentPayGroup: (employeeId: string) => [...queryKeys.payGroupEmployees.all, 'currentPayGroup', employeeId] as const,
    stats: () => [...queryKeys.payGroupEmployees.all, 'stats'] as const,
  },
  
  // Pay run queries
  payRuns: {
    all: ['payRuns'] as const,
    lists: () => [...queryKeys.payRuns.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.payRuns.lists(), filters] as const,
    details: () => [...queryKeys.payRuns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payRuns.details(), id] as const,
    summary: () => [...queryKeys.payRuns.all, 'summary'] as const,
  },
} as const;
