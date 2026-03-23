// @ts-nocheck
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import { createAssetSchema, updateAssetSchema } from '@/lib/validations/assets.schema';
import type { CreateAssetInput } from '@/lib/validations/assets.schema';
import type { WorkAsset, AssetType } from '@/lib/types/assets';
import { createAsset, updateAsset, getAssetTypes } from '@/lib/services/assets.service';
import { useOrg } from "@/lib/tenant/OrgContext";
import { supabase } from '@/integrations/supabase/client';
import { RBACService } from '@/lib/services/auth/rbac';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: WorkAsset | null;
  onSaved?: () => void;
}

export function AssetFormDialog({ open, onOpenChange, asset, onSaved }: AssetFormDialogProps) {
  const isEdit = !!asset;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId: orgId } = useOrg();

  const canViewFinancials = RBACService.hasPermission('assets.view_financials');

  const { data: assetTypes = [] } = useQuery({
    queryKey: queryKeys.workAssets.types(),
    queryFn: () => getAssetTypes(orgId),
    enabled: !!orgId && open,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('first_name');
      return data ?? [];
    },
    enabled: !!orgId && open,
  });

  const schema = isEdit ? updateAssetSchema : createAssetSchema;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          id: asset.id,
          name: asset.name,
          asset_type_id: asset.asset_type_id ?? undefined,
          status: asset.status,
          useful_life_years: asset.useful_life_years ?? undefined,
          purchase_price: asset.purchase_price ?? undefined,
          purchase_date: asset.purchase_date ?? undefined,
          serial_number: asset.serial_number ?? undefined,
          notes: asset.notes ?? undefined,
          assigned_to: asset.assigned_to ?? undefined,
        }
      : { status: 'active' },
  });

  useEffect(() => {
    if (open && isEdit && asset) {
      reset({
        id: asset.id,
        name: asset.name,
        asset_type_id: asset.asset_type_id ?? undefined,
        status: asset.status,
        useful_life_years: asset.useful_life_years ?? undefined,
        purchase_price: asset.purchase_price ?? undefined,
        purchase_date: asset.purchase_date ?? undefined,
        serial_number: asset.serial_number ?? undefined,
        notes: asset.notes ?? undefined,
        assigned_to: asset.assigned_to ?? undefined,
      });
    } else if (open && !isEdit) {
      reset({ status: 'active' });
    }
  }, [open, asset]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (isEdit) {
        return updateAsset(asset.id, values, orgId);
      }
      return createAsset({ ...values, org_id: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.lists() });
      toast({ title: isEdit ? 'Asset updated' : 'Asset created', description: isEdit ? 'Changes saved.' : 'New asset added to inventory.' });
      onOpenChange(false);
      onSaved?.();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Asset' : 'Add Work Asset'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the asset details below.' : 'Register a new work tool or asset.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="name">Asset Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g. MacBook Pro 14 / desk@co.ug / Desk 3B" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={watch('asset_type_id') ?? '__none__'}
                onValueChange={(v) => setValue('asset_type_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No type</SelectItem>
                  {assetTypes.map((t: AssetType) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Assign To</Label>
            <Select
              value={watch('assigned_to') ?? '__none__'}
              onValueChange={(v) => setValue('assigned_to', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}
                    {e.employee_number ? ` (${e.employee_number})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serial_number">Serial / ID</Label>
              <Input id="serial_number" placeholder="Optional" {...register('serial_number')} />
            </div>
            <div>
              <Label htmlFor="useful_life_years">Useful Life (years)</Label>
              <Input
                id="useful_life_years"
                type="number"
                min={1}
                placeholder="e.g. 3"
                {...register('useful_life_years', { valueAsNumber: true })}
              />
            </div>
          </div>

          {canViewFinancials && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_price">Purchase Price (UGX)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  min={0}
                  placeholder="e.g. 3500000"
                  {...register('purchase_price', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input id="purchase_date" type="date" {...register('purchase_date')} />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Any additional details..." rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
