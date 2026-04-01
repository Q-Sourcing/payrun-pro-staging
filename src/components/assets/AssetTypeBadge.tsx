import type { AssetType } from '@/lib/types/assets';
import {
  Laptop, Mail, MapPin, Smartphone, CreditCard, Car, Package,
} from 'lucide-react';

interface AssetTypeBadgeProps {
  assetType?: AssetType | null;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  laptop: Laptop,
  mail: Mail,
  'map-pin': MapPin,
  smartphone: Smartphone,
  'credit-card': CreditCard,
  car: Car,
  package: Package,
};

export function AssetTypeBadge({ assetType, className }: AssetTypeBadgeProps) {
  if (!assetType) return null;

  const IconComponent = assetType.icon_key ? ICON_MAP[assetType.icon_key] ?? Package : Package;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ${className ?? ''}`}
    >
      <IconComponent size={11} />
      {assetType.name}
    </span>
  );
}
