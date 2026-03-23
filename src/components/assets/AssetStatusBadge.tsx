import { Badge } from '@/components/ui/badge';
import type { AssetStatus } from '@/lib/types/assets';
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS } from '@/lib/types/assets';

interface AssetStatusBadgeProps {
  status: AssetStatus;
  className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ASSET_STATUS_COLORS[status]} ${className ?? ''}`}
    >
      {ASSET_STATUS_LABELS[status] ?? status}
    </span>
  );
}
