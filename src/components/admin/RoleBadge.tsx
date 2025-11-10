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
  super_admin: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: '👑',
  },
  organization_admin: {
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: '🏢',
  },
  ceo_executive: {
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '💼',
  },
  payroll_manager: {
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '💰',
  },
  finance_controller: {
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: '📊',
  },
  hr_business_partner: {
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    icon: '🤝',
  },
  employee: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: '👤',
  },
};

export function RoleBadge({ role, variant = 'default', className, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role];
  const roleDefinition = ROLE_DEFINITIONS[role];

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
  const config = roleConfig[role];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
      title={ROLE_DEFINITIONS[role].name}
    >
      <span>{config.icon}</span>
      <span className="hidden sm:inline">{ROLE_DEFINITIONS[role].name}</span>
    </span>
  );
}

