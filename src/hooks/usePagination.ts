/**
 * usePagination Hook
 * 
 * Custom React hook for managing pagination state with URL sync and localStorage persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    PaginationState,
    PageSize,
    DEFAULT_PAGE_SIZE,
    validatePage,
    validatePageSize,
} from '@/lib/types/pagination';
import { getPageSize, setPageSize as savePageSize } from '@/lib/utils/localStorage';

interface UsePaginationOptions {
    /** Context key for localStorage (e.g., 'employees', 'paygroups') */
    context: string;
    /** Default page size if not found in localStorage */
    defaultPageSize?: PageSize;
    /** Whether to sync state with URL query parameters */
    syncWithUrl?: boolean;
    /** Initial filters */
    initialFilters?: Record<string, any>;
}

interface UsePaginationReturn extends PaginationState {
    /** Go to a specific page */
    goToPage: (page: number) => void;
    /** Go to next page */
    nextPage: () => void;
    /** Go to previous page */
    prevPage: () => void;
    /** Change page size */
    changePageSize: (size: PageSize) => void;
    /** Set filters */
    setFilters: (filters: Record<string, any>) => void;
    /** Set search term */
    setSearch: (search: string) => void;
    /** Reset to first page (useful after filter/search changes) */
    resetToFirstPage: () => void;
    /** Set total count (call this after fetching data) */
    setTotal: (total: number) => void;
    /** Reset all pagination state */
    reset: () => void;
}

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
    const { context, defaultPageSize = DEFAULT_PAGE_SIZE, syncWithUrl = true, initialFilters = {} } = options;

    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize page size from localStorage or default
    const initialPageSize = useMemo(() => {
        const saved = getPageSize(context);
        return saved || defaultPageSize;
    }, [context, defaultPageSize]);

    // Initialize state from URL or defaults
    const [state, setState] = useState<PaginationState>(() => {
        if (syncWithUrl) {
            const urlPage = parseInt(searchParams.get('page') || '1', 10);
            const urlPageSize = parseInt(searchParams.get('pageSize') || initialPageSize.toString(), 10);
            const urlSearch = searchParams.get('search') || '';

            return {
                page: validatePage(urlPage, 1),
                pageSize: validatePageSize(urlPageSize),
                total: 0,
                filters: initialFilters,
                search: urlSearch,
            };
        }

        return {
            page: 1,
            pageSize: initialPageSize,
            total: 0,
            filters: initialFilters,
            search: '',
        };
    });

    // Sync state with URL when syncWithUrl is enabled
    useEffect(() => {
        if (!syncWithUrl) return;

        const params = new URLSearchParams();
        params.set('page', state.page.toString());
        params.set('pageSize', state.pageSize.toString());

        if (state.search) {
            params.set('search', state.search);
        }

        // Add filters to URL
        if (state.filters) {
            Object.entries(state.filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.set(key, String(value));
                }
            });
        }

        setSearchParams(params, { replace: true });
    }, [state.page, state.pageSize, state.search, state.filters, syncWithUrl, setSearchParams]);

    // Go to specific page
    const goToPage = useCallback((page: number) => {
        setState(prev => ({
            ...prev,
            page: validatePage(page, Math.ceil(prev.total / prev.pageSize)),
        }));
    }, []);

    // Go to next page
    const nextPage = useCallback(() => {
        setState(prev => {
            const totalPages = Math.ceil(prev.total / prev.pageSize);
            if (prev.page < totalPages) {
                return { ...prev, page: prev.page + 1 };
            }
            return prev;
        });
    }, []);

    // Go to previous page
    const prevPage = useCallback(() => {
        setState(prev => {
            if (prev.page > 1) {
                return { ...prev, page: prev.page - 1 };
            }
            return prev;
        });
    }, []);

    // Change page size
    const changePageSize = useCallback((size: PageSize) => {
        const validSize = validatePageSize(size);
        savePageSize(context, validSize);

        setState(prev => ({
            ...prev,
            pageSize: validSize,
            page: 1, // Reset to first page when changing page size
        }));
    }, [context]);

    // Set filters
    const setFilters = useCallback((filters: Record<string, any>) => {
        setState(prev => ({
            ...prev,
            filters,
            page: 1, // Reset to first page when filters change
        }));
    }, []);

    // Set search term
    const setSearch = useCallback((search: string) => {
        setState(prev => ({
            ...prev,
            search,
            page: 1, // Reset to first page when search changes
        }));
    }, []);

    // Reset to first page
    const resetToFirstPage = useCallback(() => {
        setState(prev => ({ ...prev, page: 1 }));
    }, []);

    // Set total count
    const setTotal = useCallback((total: number) => {
        setState(prev => ({
            ...prev,
            total,
            // Validate current page against new total
            page: validatePage(prev.page, Math.ceil(total / prev.pageSize)),
        }));
    }, []);

    // Reset all state
    const reset = useCallback(() => {
        setState({
            page: 1,
            pageSize: initialPageSize,
            total: 0,
            filters: initialFilters,
            search: '',
        });
    }, [initialPageSize, initialFilters]);

    return {
        ...state,
        goToPage,
        nextPage,
        prevPage,
        changePageSize,
        setFilters,
        setSearch,
        resetToFirstPage,
        setTotal,
        reset,
    };
}
