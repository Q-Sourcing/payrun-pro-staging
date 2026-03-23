export type AssetStatus = 'active' | 'damaged' | 'lost' | 'decommissioned';

export type AssetEventType =
  | 'note'
  | 'damage'
  | 'repair'
  | 'reassignment'
  | 'status_change'
  | 'decommission'
  | 'created';

export interface AssetType {
  id: string;
  org_id: string | null;
  name: string;
  icon_key: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface WorkAsset {
  id: string;
  org_id: string;
  asset_number: string;
  name: string;
  asset_type_id: string | null;
  asset_type?: AssetType;
  status: AssetStatus;
  useful_life_years: number | null;
  purchase_price: number | null;
  purchase_date: string | null;
  serial_number: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssetAssignment {
  id: string;
  org_id: string;
  asset_id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number?: string;
  };
  assigned_by: string | null;
  assigner?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  assigned_at: string;
  returned_at: string | null;
  return_condition: string | null;
  notes: string | null;
  created_at: string;
}

export interface AssetLog {
  id: string;
  org_id: string;
  asset_id: string;
  logged_by: string | null;
  logger?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  event_type: AssetEventType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Active',
  damaged: 'Damaged',
  lost: 'Lost',
  decommissioned: 'Decommissioned',
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  damaged: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  decommissioned: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export const ASSET_EVENT_LABELS: Record<AssetEventType, string> = {
  note: 'Note',
  damage: 'Damage Reported',
  repair: 'Repaired',
  reassignment: 'Reassigned',
  status_change: 'Status Changed',
  decommission: 'Decommissioned',
  created: 'Created',
};

export const ASSET_EVENT_COLORS: Record<AssetEventType, string> = {
  note: 'text-slate-500',
  damage: 'text-orange-600',
  repair: 'text-green-600',
  reassignment: 'text-blue-600',
  status_change: 'text-purple-600',
  decommission: 'text-red-600',
  created: 'text-emerald-600',
};
