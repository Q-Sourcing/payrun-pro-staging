import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

/**
 * Universal Access Hook
 * 
 * Use this hook for features that should be available to ALL authenticated users,
 * regardless of their role or permissions. This is a simplified alternative to
 * useUserRole() for universal features.
 * 
 * @example
 * // For universal features like notification bell, profile menu, etc.
 * const { isAuthenticated, user } = useUniversalAccess();
 * if (!isAuthenticated) return null;
 * return <NotificationBell />;
 * 
 * @returns {Object} Authentication status and user object
 * @returns {boolean} isAuthenticated - True if user is logged in
 * @returns {User | null} user - Current authenticated user or null
 */
export function useUniversalAccess() {
    const { user } = useSupabaseAuth();

    return {
        isAuthenticated: !!user,
        user
    };
}
