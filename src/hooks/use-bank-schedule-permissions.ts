import { usePermission } from '@/lib/auth/usePermission';

/**
 * Custom hook to check if the current user has permission to export bank schedules
 */
export const useBankSchedulePermissions = () => {
  const perm = usePermission();

  return {
    canExportBankSchedule: perm.hasPermission('payroll.export_bank'),
    isAuthorizedRole: perm.isOrgAdmin || perm.hasPermission('payroll.export_bank'),
    isLoading: false,
  };
};
