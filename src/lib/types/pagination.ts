/**
 * Pagination Types and Interfaces
 * 
 * Enterprise-grade pagination types for consistent pagination across all list views
 */

/**
 * Page size options available to users
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

/**
 * Default page size for all paginated views
 */
export const DEFAULT_PAGE_SIZE: PageSize = 25;

/**
 * View mode for list displays
 */
export type ViewMode = 'table' | 'card';

/**
 * Pagination state interface
 */
export interface PaginationState {
    /** Current page number (1-indexed) */
    page: number;
    /** Number of items per page */
    pageSize: PageSize;
    /** Total number of items across all pages */
    total: number;
    /** Active filters applied to the list */
    filters?: Record<string, any>;
    /** Search term */
    search?: string;
}

/**
 * Paginated response from API/database
 */
export interface PaginatedResponse<T> {
    /** Array of items for current page */
    data: T[];
    /** Pagination metadata */
    pagination: {
        /** Current page number */
        page: number;
        /** Items per page */
        pageSize: number;
        /** Total number of items */
        total: number;
        /** Total number of pages */
        totalPages: number;
        /** Whether there is a next page */
        hasNext: boolean;
        /** Whether there is a previous page */
        hasPrev: boolean;
    };
}

/**
 * Options for building paginated queries
 */
export interface PaginationOptions {
    /** Page number (1-indexed) */
    page: number;
    /** Number of items per page */
    pageSize: PageSize;
    /** Search term to filter by */
    search?: string;
    /** Column to search in */
    searchColumn?: string;
    /** Filters to apply */
    filters?: Record<string, any>;
    /** Sort column */
    sortBy?: string;
    /** Sort direction */
    sortDirection?: 'asc' | 'desc';
}

/**
 * Pagination info for display
 */
export interface PaginationInfo {
    /** Starting item number (e.g., 1 in "Showing 1-25 of 100") */
    start: number;
    /** Ending item number (e.g., 25 in "Showing 1-25 of 100") */
    end: number;
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page */
    hasNext: boolean;
    /** Whether there is a previous page */
    hasPrev: boolean;
}

/**
 * Calculate pagination information for display
 */
export function calculatePaginationInfo(
    page: number,
    pageSize: number,
    total: number
): PaginationInfo {
    const totalPages = Math.ceil(total / pageSize);
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    return {
        start,
        end,
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

/**
 * Get visible page numbers for pagination controls
 * Shows max 5 page numbers with current page in the middle when possible
 */
export function getVisiblePageNumbers(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
): number[] {
    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Validate page number
 */
export function validatePage(page: number, totalPages: number): number {
    if (page < 1) return 1;
    if (page > totalPages && totalPages > 0) return totalPages;
    return page;
}

/**
 * Validate page size
 */
export function validatePageSize(pageSize: number): PageSize {
    if (PAGE_SIZE_OPTIONS.includes(pageSize as PageSize)) {
        return pageSize as PageSize;
    }
    return DEFAULT_PAGE_SIZE;
}
