import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/types/roles';
import { ROLE_DEFINITIONS } from '@/lib/types/roles';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: UserRole;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
  showIcon?: boolean;
}

const roleConfig: Record<UserRole, { color: string; icon: string; bgColor: string }> = {
  PLATFORM_SUPER_ADMIN: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: '👑',
  },
  PLATFORM_AUDITOR: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '🔍',
  },
  ORG_ADMIN: {
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: '🏢',
  },
  ORG_HR_ADMIN: {
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    icon: '🤝',
  },
  ORG_FINANCE_CONTROLLER: {
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: '📊',
  },
  ORG_AUDITOR: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '🔍',
  },
  ORG_VIEWER: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👁️',
  },
  COMPANY_PAYROLL_ADMIN: {
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '💰',
  },
  COMPANY_HR: {
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    icon: '🤝',
  },
  COMPANY_VIEWER: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👁️',
  },
  PROJECT_MANAGER: {
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '💼',
  },
  PROJECT_PAYROLL_OFFICER: {
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '💰',
  },
  PROJECT_VIEWER: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👁️',
  },
  SELF_USER: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👤',
  },
  SELF_CONTRACTOR: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👤',
  },
  ADMIN: {
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: '🏢',
  },
  HR: {
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    icon: '🤝',
  },
  GM: {
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '💼',
  },
  FINANCE: {
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: '📊',
  },
  STAFF: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👤',
  },
  CRM: {
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: '📋',
  },
  KAE: {
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    icon: '🔑',
  },
};

const fallbackConfig = { color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30', icon: '👤' };
const makeFallbackDef = (r: string) => ({ id: r as UserRole, name: r, description: '', level: 0, permissions: [], restrictions: [] });

export function RoleBadge({ role, variant = 'default', className, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role] ?? fallbackConfig;
  const roleDefinition = ROLE_DEFINITIONS[role] ?? makeFallbackDef(role);

  if (variant === 'outline') {
    return (
      <Badge
        variant="outline"
        className={cn('font-medium', config.color, className)}
      >
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {roleDefinition.name}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        'font-medium border-0',
        config.bgColor,
        config.color,
        className
      )}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {roleDefinition.name}
    </Badge>
  );
}

interface RoleBadgeSmallProps {
  role: UserRole;
  className?: string;
}

export function RoleBadgeSmall({ role, className }: RoleBadgeSmallProps) {
  const config = roleConfig[role] ?? fallbackConfig;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
      title={(ROLE_DEFINITIONS[role] ?? makeFallbackDef(role)).name}
    >
      <span>{config.icon}</span>
      <span className="hidden sm:inline">{(ROLE_DEFINITIONS[role] ?? makeFallbackDef(role)).name}</span>
    </span>
  );
}

