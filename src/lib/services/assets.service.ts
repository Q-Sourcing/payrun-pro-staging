// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type {
  WorkAsset,
  AssetType,
  AssetAssignment,
  AssetLog,
} from '@/lib/types/assets';
import type {
  CreateAssetInput,
  UpdateAssetInput,
  LogAssetEventInput,
} from '@/lib/validations/assets.schema';

const ASSET_BASE_SELECT = `
  id, org_id, asset_number, name, asset_type_id, status,
  useful_life_years, purchase_date, serial_number, notes,
  assigned_to, assigned_at, is_deleted, created_at, updated_at,
  asset_type:asset_types(id, name, icon_key),
  employee:employees!assigned_to(id, first_name, last_name, employee_number)
`;

const ASSET_SELECT_WITH_PRICE = `${ASSET_BASE_SELECT}, purchase_price`;

export async function getAssets(
  orgId: string,
  canViewFinancials: boolean
): Promise<WorkAsset[]> {
  const selectStr = canViewFinancials ? ASSET_SELECT_WITH_PRICE : ASSET_BASE_SELECT;
  const { data, error } = await supabase
    .from('work_assets')
    .select(selectStr)
    .eq('org_id', orgId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkAsset[];
}

export async function getAsset(
  id: string,
  canViewFinancials: boolean
): Promise<WorkAsset> {
  const selectStr = canViewFinancials ? ASSET_SELECT_WITH_PRICE : ASSET_BASE_SELECT;
  const { data, error } = await supabase
    .from('work_assets')
    .select(selectStr)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as WorkAsset;
}

export async function getAssetsForEmployee(
  employeeId: string,
  orgId: string,
  canViewFinancials: boolean
): Promise<WorkAsset[]> {
  const selectStr = canViewFinancials ? ASSET_SELECT_WITH_PRICE : ASSET_BASE_SELECT;
  const { data, error } = await supabase
    .from('work_assets')
    .select(selectStr)
    .eq('org_id', orgId)
    .eq('assigned_to', employeeId)
    .eq('is_deleted', false)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkAsset[];
}

export async function createAsset(
  payload: CreateAssetInput & { org_id: string }
): Promise<WorkAsset> {
  // Generate asset number
  const { data: assetNumberData, error: numError } = await supabase.rpc(
    'generate_asset_number',
    { p_org_id: payload.org_id }
  );
  if (numError) throw numError;

  const { data, error } = await supabase
    .from('work_assets')
    .insert({
      ...payload,
      asset_number: assetNumberData,
    })
    .select(ASSET_BASE_SELECT)
    .single();

  if (error) throw error;

  // Log creation event
  await supabase.from('asset_logs').insert({
    org_id: payload.org_id,
    asset_id: data.id,
    event_type: 'created',
    description: `Asset ${assetNumberData} created`,
  });

  // If assigned on creation, record the assignment
  if (payload.assigned_to) {
    await supabase.from('asset_assignments').insert({
      org_id: payload.org_id,
      asset_id: data.id,
      employee_id: payload.assigned_to,
      assigned_at: data.assigned_at || new Date().toISOString(),
    });
  }

  return data as WorkAsset;
}

export async function updateAsset(
  id: string,
  updates: Partial<UpdateAssetInput>,
  orgId: string
): Promise<WorkAsset> {
  const { data, error } = await supabase
    .from('work_assets')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select(ASSET_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as WorkAsset;
}

export async function reassignAsset(
  assetId: string,
  newEmployeeId: string,
  orgId: string,
  returnCondition?: string | null,
  notes?: string | null
): Promise<void> {
  const { error } = await supabase.rpc('reassign_asset', {
    p_asset_id: assetId,
    p_new_employee_id: newEmployeeId,
    p_org_id: orgId,
    p_return_condition: returnCondition ?? null,
    p_notes: notes ?? null,
  });
  if (error) throw error;
}

export async function deleteAsset(id: string, orgId: string): Promise<void> {
  const { error } = await supabase
    .from('work_assets')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('org_id', orgId);
  if (error) throw error;
}

export async function logAssetEvent(
  input: LogAssetEventInput,
  orgId: string
): Promise<AssetLog> {
  const { data, error } = await supabase
    .from('asset_logs')
    .insert({
      org_id: orgId,
      asset_id: input.asset_id,
      event_type: input.event_type,
      description: input.description,
    })
    .select('*')
    .single();

  if (error) throw error;

  // If the event changes status, also update the asset status
  if (input.event_type === 'damage') {
    await supabase
      .from('work_assets')
      .update({ status: 'damaged' })
      .eq('id', input.asset_id)
      .eq('org_id', orgId);
  } else if (input.event_type === 'repair') {
    await supabase
      .from('work_assets')
      .update({ status: 'active' })
      .eq('id', input.asset_id)
      .eq('org_id', orgId);
  } else if (input.event_type === 'decommission') {
    await supabase
      .from('work_assets')
      .update({ status: 'decommissioned' })
      .eq('id', input.asset_id)
      .eq('org_id', orgId);
  }

  return data as AssetLog;
}

export async function getAssetAssignmentHistory(
  assetId: string
): Promise<AssetAssignment[]> {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(`
      *,
      employee:employees!employee_id(id, first_name, last_name, employee_number)
    `)
    .eq('asset_id', assetId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AssetAssignment[];
}

export async function getAssetLogs(assetId: string): Promise<AssetLog[]> {
  const { data, error } = await supabase
    .from('asset_logs')
    .select('*')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AssetLog[];
}

export async function getAssetTypes(orgId: string): Promise<AssetType[]> {
  const { data, error } = await supabase
    .from('asset_types')
    .select('*')
    .or(`org_id.is.null,org_id.eq.${orgId}`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AssetType[];
}
