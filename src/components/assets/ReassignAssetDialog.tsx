// @ts-nocheck
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import { reassignAssetSchema } from '@/lib/validations/assets.schema';
import type { WorkAsset } from '@/lib/types/assets';
import { reassignAsset } from '@/lib/services/assets.service';
import { useOrg } from '@/lib/auth/OrgProvider';
import { supabase } from '@/integrations/supabase/client';

interface ReassignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: WorkAsset;
  onReassigned?: () => void;
}

export function ReassignAssetDialog({ open, onOpenChange, asset, onReassigned }: ReassignAssetDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId: orgId } = useOrg();

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

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(reassignAssetSchema),
    defaultValues: { asset_id: asset.id },
  });

  const mutation = useMutation({
    mutationFn: (values: any) =>
      reassignAsset(asset.id, values.new_employee_id, orgId, values.return_condition, values.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.detail(asset.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.assignments(asset.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.logs(asset.id) });
      toast({ title: 'Asset reassigned', description: 'The asset has been successfully reassigned.' });
      reset();
      onOpenChange(false);
      onReassigned?.();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const currentAssignee = asset.employee
    ? `${asset.employee.first_name} ${asset.employee.last_name}`
    : 'Unassigned';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Asset</DialogTitle>
          <DialogDescription>
            Reassign <strong>{asset.name}</strong> ({asset.asset_number}).
            Currently assigned to: <strong>{currentAssignee}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-2">
          <div>
            <Label>New Assignee <span className="text-red-500">*</span></Label>
            <Select
              value={watch('new_employee_id') ?? '__none__'}
              onValueChange={(v) => setValue('new_employee_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((e: any) => e.id !== asset.assigned_to)
                  .map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                      {e.employee_number ? ` (${e.employee_number})` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.new_employee_id && (
              <p className="text-xs text-red-500 mt-1">{errors.new_employee_id.message as string}</p>
            )}
          </div>

          <div>
            <Label htmlFor="return_condition">Return Condition (of old assignment)</Label>
            <Textarea
              id="return_condition"
              placeholder="e.g. Good condition, minor scratches..."
              rows={2}
              {...register('return_condition')}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Reason for reassignment..."
              rows={2}
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Reassigning...' : 'Reassign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
