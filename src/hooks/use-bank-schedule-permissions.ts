import { hasPermission, UserRole } from '@/lib/types/roles';

/**
 * Custom hook to check if the current user has permission to export bank schedules
 */
export const useBankSchedulePermissions = () => {
  // For now, we'll assume the user has the permission
  // In a real implementation, you would check the user's role from the auth context
  const canExportBankSchedule = () => {
    // Mock user role - in real implementation, get from user context
    const userRole: UserRole = 'payroll_manager'; // This should come from user context
    
    return hasPermission(userRole, 'export_bank_schedule');
  };

  const isAuthorizedRole = () => {
    const authorizedRoles: UserRole[] = [
      'super_admin',
      'organization_admin',
      'payroll_manager',
      'finance_controller',
      'ceo_executive'
    ];

    // Mock user role - in real implementation, get from user context
    const userRole: UserRole = 'payroll_manager'; // This should come from user context
    
    return authorizedRoles.includes(userRole);
  };

  return {
    canExportBankSchedule: canExportBankSchedule(),
    isAuthorizedRole: isAuthorizedRole(),
    isLoading: false, // No loading state for now
  };
};
