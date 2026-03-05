import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/lib/types/roles';

const ROLE_PRIORITY: UserRole[] = [
  'PLATFORM_SUPER_ADMIN',
  'PLATFORM_AUDITOR',
  'ORG_ADMIN',
  'ORG_FINANCE_CONTROLLER',
  'ORG_HR_ADMIN',
  'ORG_AUDITOR',
  'COMPANY_PAYROLL_ADMIN',
  'COMPANY_HR',
  'PROJECT_MANAGER',
  'PROJECT_PAYROLL_OFFICER',
  'ORG_VIEWER',
  'COMPANY_VIEWER',
  'PROJECT_VIEWER',
  'SELF_CONTRACTOR',
  'SELF_USER',
];

const normalizeRoleCodeToUserRole = (rawRole: string): UserRole | null => {
  const role = (rawRole || '').trim();
  if (!role) return null;

  const canonicalMap: Record<string, UserRole> = {
    PLATFORM_SUPER_ADMIN: 'PLATFORM_SUPER_ADMIN',
    PLATFORM_AUDITOR: 'PLATFORM_AUDITOR',
    ORG_OWNER: 'ORG_ADMIN',
    ORG_ADMIN: 'ORG_ADMIN',
    ORG_HR: 'ORG_HR_ADMIN',
    ORG_HR_ADMIN: 'ORG_HR_ADMIN',
    ORG_PAYROLL_ADMIN: 'COMPANY_PAYROLL_ADMIN',
    ORG_FINANCE_APPROVER: 'ORG_FINANCE_CONTROLLER',
    ORG_FINANCE_CONTROLLER: 'ORG_FINANCE_CONTROLLER',
    ORG_AUDITOR: 'ORG_AUDITOR',
    ORG_VIEWER: 'ORG_VIEWER',
    COMPANY_PAYROLL_ADMIN: 'COMPANY_PAYROLL_ADMIN',
    COMPANY_HR: 'COMPANY_HR',
    COMPANY_VIEWER: 'COMPANY_VIEWER',
    PROJECT_MANAGER: 'PROJECT_MANAGER',
    PROJECT_PAYROLL_OFFICER: 'PROJECT_PAYROLL_OFFICER',
    PROJECT_VIEWER: 'PROJECT_VIEWER',
    SELF_USER: 'SELF_USER',
    SELF_CONTRACTOR: 'SELF_CONTRACTOR',
    super_admin: 'PLATFORM_SUPER_ADMIN',
    admin: 'ORG_ADMIN',
    manager: 'COMPANY_PAYROLL_ADMIN',
    employee: 'SELF_USER',
  };

  return canonicalMap[role] ?? null;
};

const resolveHighestPriorityRole = (rawRoles: string[]): UserRole | null => {
  const normalizedRoles = rawRoles
    .map(normalizeRoleCodeToUserRole)
    .filter((role): role is UserRole => Boolean(role));

  if (normalizedRoles.length === 0) {
    return null;
  }

  for (const candidate of ROLE_PRIORITY) {
    if (normalizedRoles.includes(candidate)) {
      return candidate;
    }
  }

  return normalizedRoles[0] ?? null;
};

// Track which tables are available to avoid repeated failed queries
// Initialize as null to check on first run, then cache the result
let userRolesTableAvailable: boolean | null = null;
let rbacAssignmentsTableAvailable: boolean | null = null;

const getErrorField = (error: unknown, field: string): unknown => {
  if (!error || typeof error !== 'object') return undefined;
  return (error as Record<string, unknown>)[field];
};

// Helper to check if an error indicates table is unavailable
const isTableUnavailableError = (error: unknown): boolean => {
  if (!error) return false;

  // Check error codes
  const code = getErrorField(error, 'code');
  if (code === 'PGRST116' || code === '42P01' || code === 'PGRST301') {
    return true;
  }

  // Check error message for common indicators
  const message = String(getErrorField(error, 'message') || '');
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
  const status = getErrorField(error, 'status');
  if (status === 500 || status === 404 || status === 406) {
    return true;
  }

  return false;
};

const isAccessDeniedError = (error: unknown): boolean => {
  const code = String(getErrorField(error, 'code') || '');
  const message = String(getErrorField(error, 'message') || '').toLowerCase();
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('not allowed') ||
    message.includes('rls')
  );
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

        // 1. Try `rbac_assignments` (Modern OBAC System)
        if (rbacAssignmentsTableAvailable !== false) {
          try {
            console.log('🔎 useUserRole: checking rbac_assignments...');
            const { data: obacAssignments, error: obacError } = await supabase
              .from('rbac_assignments')
              .select('role_code')
              .eq('user_id', user.id);

            if (obacError) {
              const expectedMissing = isTableUnavailableError(obacError);
              const expectedDenied = isAccessDeniedError(obacError);
              if (expectedMissing || expectedDenied) {
                rbacAssignmentsTableAvailable = false;
              }
              // Never hard-fail role resolution on OBAC read issues; fallback chain handles it.
              console.warn('⚠️ useUserRole: skipping rbac_assignments lookup', {
                code: getErrorField(obacError, 'code'),
                message: getErrorField(obacError, 'message'),
              });
            } else if (Array.isArray(obacAssignments) && obacAssignments.length > 0) {
              const rawRoleCodes = obacAssignments
                .map((assignment) => assignment?.role_code)
                .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);
              const resolvedRole = resolveHighestPriorityRole(rawRoleCodes);

              if (resolvedRole) {
                console.log('✅ useUserRole: found OBAC role set', rawRoleCodes, 'resolved to', resolvedRole);
                setRole(resolvedRole);
              } else {
                // We have assignments but no recognized mapping; keep elevated org visibility vs hard fallback.
                console.warn('⚠️ useUserRole: unmapped OBAC roles, defaulting to ORG_VIEWER', rawRoleCodes);
                setRole('ORG_VIEWER');
              }
              rbacAssignmentsTableAvailable = true;
              setIsLoading(false);
              return;
            } else {
              rbacAssignmentsTableAvailable = true;
              console.log('⚠️ useUserRole: no OBAC role rows found');
            }
          } catch (e) {
            if (isTableUnavailableError(e) || isAccessDeniedError(e)) {
              rbacAssignmentsTableAvailable = false;
              console.warn('⚠️ useUserRole: rbac_assignments lookup unavailable, falling back', e);
            } else {
              console.error('Error checking rbac_assignments:', e);
            }
          }
        }

        // 2. Try user_profiles.role (legacy single-role column)
        try {
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (!profileError && userProfile?.role) {
            const mappedProfileRole = normalizeRoleCodeToUserRole(userProfile.role);
            if (mappedProfileRole) {
              console.log('👤 useUserRole: found profile role', userProfile.role, 'mapped to', mappedProfileRole);
              setRole(mappedProfileRole);
              setIsLoading(false);
              return;
            }
          }
        } catch (profileErr) {
          console.error('Error checking user_profiles role:', profileErr);
        }

        // 3. Try user_roles table (Legacy/Transition System)
        if (userRolesTableAvailable !== false) {
          try {
            const { data: userRole, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle();

            if (!roleError && userRole?.role) {
              const mappedRole = normalizeRoleCodeToUserRole(userRole.role) || 'SELF_USER';
              console.log('👴 useUserRole: found legacy role', userRole.role, 'mapped to', mappedRole);
              setRole(mappedRole);
              setIsLoading(false);
              userRolesTableAvailable = true;
              return;
            }

            if (roleError) {
              console.error('❌ useUserRole: user_roles error', roleError);
              if (isTableUnavailableError(roleError)) {
                userRolesTableAvailable = false;
              }
            }
          } catch (err) {
            console.error('❌ useUserRole: user_roles exception', err);
            if (isTableUnavailableError(err)) {
              userRolesTableAvailable = false;
            }
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

