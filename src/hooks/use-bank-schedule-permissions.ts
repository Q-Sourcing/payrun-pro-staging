import { UserRole } from '@/lib/types/roles';
import { RBACService } from '@/lib/services/auth/rbac';

/**
 * Custom hook to check if the current user has permission to export bank schedules
 */
export const useBankSchedulePermissions = () => {
  const canExportBankSchedule = () => {
    return RBACService.hasPermission('payroll.export_bank');
  };

  const isAuthorizedRole = () => {
    // In the new OBAC model, we check for permissions, but we can also check for generic admin roles
    return RBACService.isOrgAdmin() || RBACService.hasPermission('payroll.export_bank');
  };

  return {
    canExportBankSchedule: canExportBankSchedule(),
    isAuthorizedRole: isAuthorizedRole(),
    isLoading: false,
  };
};
