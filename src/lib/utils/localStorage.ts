/**
 * LocalStorage Utilities
 * 
 * Type-safe localStorage utilities for persisting user preferences
 */

import { PageSize, validatePageSize, PAGE_SIZE_OPTIONS } from '@/lib/types/pagination';
import { ViewMode } from '@/lib/types/pagination';

const NAMESPACE = 'payrun-pro';

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
    PAGE_SIZE: (context: string) => `${NAMESPACE}:pageSize:${context}`,
    VIEW_MODE: (context: string) => `${NAMESPACE}:view:${context}`,
} as const;

/**
 * Get page size from localStorage
 */
export function getPageSize(context: string): PageSize | null {
    try {
        const key = STORAGE_KEYS.PAGE_SIZE(context);
        const value = localStorage.getItem(key);

        if (!value) return null;

        const parsed = parseInt(value, 10);
        return validatePageSize(parsed);
    } catch (error) {
        console.error('Error reading page size from localStorage:', error);
        return null;
    }
}

/**
 * Set page size in localStorage
 */
export function setPageSize(context: string, pageSize: PageSize): void {
    try {
        const key = STORAGE_KEYS.PAGE_SIZE(context);
        localStorage.setItem(key, pageSize.toString());
    } catch (error) {
        console.error('Error saving page size to localStorage:', error);
    }
}

/**
 * Get view mode from localStorage
 */
export function getViewMode(context: string): ViewMode | null {
    try {
        const key = STORAGE_KEYS.VIEW_MODE(context);
        const value = localStorage.getItem(key);

        if (!value) return null;

        if (value === 'table' || value === 'card') {
            return value;
        }

        return null;
    } catch (error) {
        console.error('Error reading view mode from localStorage:', error);
        return null;
    }
}

/**
 * Set view mode in localStorage
 */
export function setViewMode(context: string, mode: ViewMode): void {
    try {
        const key = STORAGE_KEYS.VIEW_MODE(context);
        localStorage.setItem(key, mode);
    } catch (error) {
        console.error('Error saving view mode to localStorage:', error);
    }
}

/**
 * Clear all pagination preferences for a context
 */
export function clearPaginationPreferences(context: string): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.PAGE_SIZE(context));
        localStorage.removeItem(STORAGE_KEYS.VIEW_MODE(context));
    } catch (error) {
        console.error('Error clearing pagination preferences:', error);
    }
}
