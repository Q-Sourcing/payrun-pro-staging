import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useUniversalAccess } from '@/hooks/use-universal-access';

/**
 * Universal Features Component
 * 
 * This component renders features that should be available to ALL authenticated users,
 * regardless of their role, permissions, or organizational context.
 * 
 * IMPORTANT: Only add features here that meet ALL these criteria:
 * 1. Must be available to every logged-in user
 * 2. Should not vary based on role or permissions
 * 3. Should not be organization or company specific
 * 
 * Examples of CORRECT universal features:
 * - Notification bell (all users can receive notifications)
 * - User profile menu (all users have a profile)
 * - Help/support button (all users may need help)
 * - Theme toggle (all users can choose appearance)
 * 
 * Examples of INCORRECT universal features (use role/permission checks instead):
 * - Admin panel links (role-specific)
 * - Create employee button (permission-specific)
 * - Company settings (context-specific)
 * 
 * Data Security Note:
 * While UI features are universal, the underlying data MUST still be properly
 * scoped via RLS policies in the database. For example, all users see the
 * notification bell, but RLS ensures each user only sees their own notifications.
 * 
 * @returns {JSX.Element | null} Universal features or null if not authenticated
 */
export function UniversalFeatures() {
    const { isAuthenticated } = useUniversalAccess();

    // Don't render anything if user is not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            {/* UNIVERSAL FEATURE: Notification Bell
          Available to all authenticated users
          Data scoped via RLS: user_id = auth.uid() */}
            <NotificationBell />

            {/* TODO: Add other universal features here as needed
          Examples:
          - <HelpButton />
          - <UserProfileMenu />
          - <ThemeToggle />
          
          Remember: Only add features that should be available to ALL users */}
        </>
    );
}
