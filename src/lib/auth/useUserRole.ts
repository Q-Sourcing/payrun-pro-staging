/**
 * Convenience hook that derives the user's primary role from JWT claims.
 * Zero DB calls — reads from the in-memory auth context.
 */

import { useAuth } from './AuthProvider';
import { usePermission } from './usePermission';
import type { UserRole } from '@/lib/types/roles';

export function useUserRole() {
  const { isLoading } = useAuth();
  const { role: rawRole, isPlatformAdmin, hasRole: checkRole } = usePermission();

  const role = (rawRole || 'SELF_USER') as UserRole;

  return {
    role,
    isLoading,
    isSuperAdmin: isPlatformAdmin,
    hasRole: (roleToCheck: UserRole) => checkRole(roleToCheck) || role === roleToCheck,
  };
}
