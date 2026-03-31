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
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import { logAssetEventSchema } from '@/lib/validations/assets.schema';
import type { WorkAsset } from '@/lib/types/assets';
import { logAssetEvent } from '@/lib/services/assets.service';
import { useOrg } from '@/lib/auth/OrgProvider';
import { ASSET_EVENT_LABELS } from '@/lib/types/assets';

interface LogAssetEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: WorkAsset;
  onLogged?: () => void;
}

const LOGGABLE_EVENTS = ['note', 'damage', 'repair', 'status_change', 'decommission'] as const;

export function LogAssetEventDialog({ open, onOpenChange, asset, onLogged }: LogAssetEventDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId: orgId } = useOrg();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(logAssetEventSchema),
    defaultValues: {
      asset_id: asset.id,
      event_type: 'note',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: any) => logAssetEvent(values, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.logs(asset.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.detail(asset.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.lists() });
      toast({ title: 'Event logged', description: 'Activity recorded against this asset.' });
      reset({ asset_id: asset.id, event_type: 'note', description: '' });
      onOpenChange(false);
      onLogged?.();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Event</DialogTitle>
          <DialogDescription>
            Record an activity against <strong>{asset.name}</strong> ({asset.asset_number}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-2">
          <div>
            <Label>Event Type <span className="text-red-500">*</span></Label>
            <Select
              value={watch('event_type')}
              onValueChange={(v) => setValue('event_type', v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOGGABLE_EVENTS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ASSET_EVENT_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              placeholder={
                watch('event_type') === 'damage'
                  ? 'Describe the damage...'
                  : watch('event_type') === 'repair'
                  ? 'Describe what was repaired...'
                  : 'Describe the event...'
              }
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description.message as string}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Log Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
