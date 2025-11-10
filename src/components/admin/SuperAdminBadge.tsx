import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuperAdminBadgeProps {
  variant?: 'default' | 'small' | 'icon-only';
  className?: string;
  showText?: boolean;
}

export function SuperAdminBadge({ variant = 'default', className, showText = true }: SuperAdminBadgeProps) {
  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center w-6 h-6 rounded-full',
          'bg-gradient-to-br from-yellow-400 to-yellow-600',
          'text-yellow-900 shadow-lg',
          className
        )}
        title="Super Admin"
      >
        <Crown className="w-3.5 h-3.5" />
      </div>
    );
  }

  if (variant === 'small') {
    return (
      <Badge
        className={cn(
          'bg-gradient-to-r from-yellow-400 to-yellow-600',
          'text-yellow-900 font-semibold',
          'border-0 shadow-sm',
          className
        )}
      >
        <Crown className="w-3 h-3 mr-1" />
        {showText && 'Super Admin'}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        'bg-gradient-to-r from-yellow-400 to-yellow-600',
        'text-yellow-900 font-semibold px-3 py-1',
        'border-0 shadow-md',
        'flex items-center gap-1.5',
        className
      )}
    >
      <Crown className="w-4 h-4" />
      {showText && 'Super Admin'}
    </Badge>
  );
}

