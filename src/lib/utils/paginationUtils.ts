/**
 * Supabase Pagination Utilities
 * 
 * Utilities for building paginated queries with Supabase
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { PaginationOptions, PaginatedResponse, calculatePaginationInfo } from '@/lib/types/pagination';

/**
 * Build a paginated Supabase query
 * 
 * @param client Supabase client instance
 * @param table Table name
 * @param options Pagination options
 * @returns Query builder with pagination applied
 */
export function buildPaginatedQuery<T = any>(
    query: any,
    options: PaginationOptions
) {
    const { page, pageSize, search, searchColumn, filters, sortBy, sortDirection } = options;

    // Apply search if provided
    if (search && searchColumn) {
        query = query.ilike(searchColumn, `%${search}%`);
    }

    // Apply filters
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    query = query.in(key, value);
                } else {
                    query = query.eq(key, value);
                }
            }
        });
    }

    // Apply sorting
    if (sortBy) {
        query = query.order(sortBy, { ascending: sortDirection === 'asc' });
    }

    // Apply pagination using range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    return query;
}

/**
 * Get total count for a query
 * 
 * @param client Supabase client instance
 * @param table Table name
 * @param filters Filters to apply
 * @param search Search term
 * @param searchColumn Column to search in
 * @returns Total count
 */
export async function getTotalCount(
    query: any,
    filters?: Record<string, any>,
    search?: string,
    searchColumn?: string
): Promise<number> {
    // Clone the query for count
    let countQuery = query;

    // Apply search if provided
    if (search && searchColumn) {
        countQuery = countQuery.ilike(searchColumn, `%${search}%`);
    }

    // Apply filters
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    countQuery = countQuery.in(key, value);
                } else {
                    countQuery = countQuery.eq(key, value);
                }
            }
        });
    }

    const { count, error } = await countQuery;

    if (error) {
        console.error('Error fetching total count:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Execute a paginated query and return formatted response
 * 
 * @param query Base Supabase query
 * @param options Pagination options
 * @returns Paginated response with data and metadata
 */
export async function executePaginatedQuery<T>(
    baseQuery: any,
    options: PaginationOptions
): Promise<PaginatedResponse<T>> {
    const { page, pageSize } = options;

    // Get total count first (using count query)
    const countQuery = baseQuery.select('*', { count: 'exact', head: true });
    const { count: total, error: countError } = await getTotalCountFromQuery(
        countQuery,
        options.filters,
        options.search,
        options.searchColumn
    );

    if (countError) {
        console.error('Error fetching count:', countError);
    }

    // Build and execute paginated query
    const dataQuery = baseQuery.select('*');
    const paginatedQuery = buildPaginatedQuery(dataQuery, options);
    const { data, error } = await paginatedQuery;

    if (error) {
        console.error('Error fetching paginated data:', error);
        throw error;
    }

    const paginationInfo = calculatePaginationInfo(page, pageSize, total || 0);

    return {
        data: data || [],
        pagination: {
            page: paginationInfo.page,
            pageSize,
            total: paginationInfo.total,
            totalPages: paginationInfo.totalPages,
            hasNext: paginationInfo.hasNext,
            hasPrev: paginationInfo.hasPrev,
        },
    };
}

/**
 * Helper to get count from a count query
 */
async function getTotalCountFromQuery(
    countQuery: any,
    filters?: Record<string, any>,
    search?: string,
    searchColumn?: string
): Promise<{ count: number; error: any }> {
    // Apply search if provided
    if (search && searchColumn) {
        countQuery = countQuery.ilike(searchColumn, `%${search}%`);
    }

    // Apply filters
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    countQuery = countQuery.in(key, value);
                } else {
                    countQuery = countQuery.eq(key, value);
                }
            }
        });
    }

    const { count, error } = await countQuery;
    return { count: count || 0, error };
}

/**
 * Format pagination display text
 * 
 * @param start Starting item number
 * @param end Ending item number
 * @param total Total number of items
 * @returns Formatted text (e.g., "Showing 1–25 of 100 items")
 */
export function formatPaginationText(start: number, end: number, total: number): string {
    if (total === 0) {
        return 'No items';
    }
    return `Showing ${start}–${end} of ${total} items`;
}
