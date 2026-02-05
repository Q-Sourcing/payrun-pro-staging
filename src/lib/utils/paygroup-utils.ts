/**
 * Utility functions for PayGroup operations
 */

/**
 * Maps pay group types to their corresponding employee types
 */
export const PAYGROUP_TO_EMPLOYEE_TYPE_MAP: Record<string, string> = {
  'regular': 'regular',
  'expatriate': 'expatriate',
  'piece_rate': 'piece_rate',
  'intern': 'intern'
};

/**
 * Get the employee type that should be assigned to a pay group
 */
export function getEmployeeTypeForPayGroup(payGroupType: string): string | null {
  return PAYGROUP_TO_EMPLOYEE_TYPE_MAP[payGroupType] || null;
}

/**
 * Check if an employee type is compatible with a pay group type
 */
export function isEmployeeCompatibleWithPayGroup(employeeType: string, payGroupType: string): boolean {
  const expectedEmployeeType = getEmployeeTypeForPayGroup(payGroupType);
  return expectedEmployeeType === employeeType;
}

/**
 * Get type-specific color for UI indicators
 */
export function getPayGroupTypeColor(payGroupType: string): string {
  const colorMap: Record<string, string> = {
    'regular': 'blue',
    'expatriate': 'green',
    'piece_rate': 'amber',
    'intern': 'purple'
  };
  return colorMap[payGroupType] || 'gray';
}

/**
 * Get type-specific icon class for UI indicators
 */
export function getPayGroupTypeIconClass(payGroupType: string): string {
  const color = getPayGroupTypeColor(payGroupType);
  return `bg-${color}-100 text-${color}-700`;
}
