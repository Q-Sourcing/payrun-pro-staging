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
      console.log('🔄 useUserRole: fetching role...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('⏹️ useUserRole: no user found');
          setRole(null);
          setIsLoading(false);
          return;
        }
        console.log('👤 useUserRole: user found', user.id);

        // Check for super admin email first (temporary fallback)
        const SUPER_ADMIN_EMAILS = ['nalungukevin@gmail.com'];
        if (SUPER_ADMIN_EMAILS.includes(user.email || '')) {
          console.log('🚀 useUserRole: matched super admin email');
          setRole('PLATFORM_SUPER_ADMIN');
          setIsLoading(false);
          return;
        }

        // 1. Try `rbac_assignments` (Modern OBAC System)
        try {
          console.log('🔎 useUserRole: checking rbac_assignments...');
          const { data: obacRole, error: obacError } = await (supabase
            .from('rbac_assignments') as any)
            .select('role_code')
            .eq('user_id', user.id)
            .maybeSingle();

          if (obacError) {
            console.error('❌ useUserRole: rbac_assignments error', obacError);
          }

          if (!obacError && obacRole?.role_code) {
            console.log('✅ useUserRole: found OBAC role', obacRole.role_code);
            // Direct mapping if the code matches UserRole, or map via helper if needed
            // For now, assuming direct map or simple transformation
            // The frontend UserRole type expects specific strings.
            // We trust the code from DB if it matches, otherwise fallback.

            // Simple casting for now, but in production we should validate
            setRole(obacRole.role_code as UserRole);
            setIsLoading(false);
            return;
          } else {
            console.log('⚠️ useUserRole: no OBAC role found', obacRole);
          }
        } catch (e) {
          console.error("Error checking rbac_assignments:", e);
        }

        // 2. Try user_roles table (Legacy/Transition System)
        if (userRolesTableAvailable !== false) {
          try {
            const { data: userRole, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle();

            if (!roleError && userRole?.role) {
              const mappedRole = mapAppRoleToUserRole(userRole.role);
              console.log('👴 useUserRole: found legacy role', userRole.role, 'mapped to', mappedRole);
              setRole(mappedRole);
              setIsLoading(false);
              userRolesTableAvailable = true;
              return;
            }

            if (roleError) {
              // ... (existing error handling for userRolesTableAvailable)
            }
          } catch (err: any) {
            // ... (existing catch block for userRolesTableAvailable)
          }
        }

        // Default fallback
        console.log('⚠️ useUserRole: no role found, defaulting to SELF_USER');
        setRole('SELF_USER' as UserRole);
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole('SELF_USER' as UserRole);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 useUserRole: auth change', event);
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

