import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/lib/types/roles';

// Map app_role enum to UserRole type
const mapAppRoleToUserRole = (appRole: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    'super_admin': 'PLATFORM_SUPER_ADMIN',
    'admin': 'ORG_ADMIN',
    'manager': 'COMPANY_PAYROLL_ADMIN',
    'employee': 'SELF_USER',
  };
  return roleMap[appRole] || 'SELF_USER';
};

// Track which tables are available to avoid repeated failed queries
// Initialize as null to check on first run, then cache the result
let userRolesTableAvailable: boolean | null = null;
// Set users table as unavailable by default since it's causing 500 errors
// This prevents any queries to this table
let usersTableAvailable: boolean = false;

// Helper to check if an error indicates table is unavailable
const isTableUnavailableError = (error: any): boolean => {
  if (!error) return false;

  // Check error codes
  if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST301') {
    return true;
  }

  // Check error message for common indicators
  const message = error.message || '';
  if (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('permission denied') ||
    message.includes('Internal Server Error') ||
    message.includes('500')
  ) {
    return true;
  }

  // Check HTTP status if available
  if (error.status === 500 || error.status === 404 || error.status === 406) {
    return true;
  }

  return false;
};

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setIsLoading(false);
          return;
        }

        // Check for super admin email first (temporary fallback)
        // TODO: Remove this once user_roles table is properly set up
        const SUPER_ADMIN_EMAILS = ['nalungukevin@gmail.com'];
        if (SUPER_ADMIN_EMAILS.includes(user.email || '')) {
          setRole('PLATFORM_SUPER_ADMIN');
          setIsLoading(false);
          return;
        }

        // Try user_roles table first (newer system) - only if we haven't confirmed it's unavailable
        if (userRolesTableAvailable !== false) {
          try {
            const { data: userRole, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle();

            if (!roleError && userRole?.role) {
              // Map app_role enum to UserRole type
              const mappedRole = mapAppRoleToUserRole(userRole.role);
              setRole(mappedRole);
              setIsLoading(false);
              userRolesTableAvailable = true;
              return;
            }

            // If we get a 404/406, table might not exist or have RLS issues
            if (roleError) {
              const isTableError =
                roleError.code === 'PGRST116' || // Not found
                roleError.code === '42P01' || // Undefined table
                roleError.code === 'PGRST301' || // RLS policy violation
                roleError.message?.includes('relation') ||
                roleError.message?.includes('does not exist') ||
                roleError.message?.includes('permission denied');

              if (isTableError) {
                userRolesTableAvailable = false;
              }
            }
          } catch (err: any) {
            // Table might not exist or RLS issue
            const isTableError =
              err?.code === '42P01' ||
              err?.code === 'PGRST116' ||
              err?.message?.includes('relation') ||
              err?.message?.includes('does not exist') ||
              err?.message?.includes('permission denied');

            if (isTableError) {
              userRolesTableAvailable = false;
            }
          }
        }

        // Skip older 'users' table as it's not in the public schema/types

        // Default fallback - assign SELF_USER role
        setRole('SELF_USER' as UserRole);
      } catch (error) {
        console.error('Error in useUserRole:', error);
        // On any error, default to SELF_USER role
        setRole('SELF_USER' as UserRole);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (roleToCheck: UserRole) => {
    return role === roleToCheck;
  };

  return { role, isLoading, isSuperAdmin: role === 'PLATFORM_SUPER_ADMIN', hasRole };
}

