// @ts-nocheck
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import type { WorkAsset } from '@/lib/types/assets';
import { getAssetLogs } from '@/lib/services/assets.service';
import { AssetsExporter } from '@/lib/services/assets-exporter';
import { RBACService } from '@/lib/services/auth/rbac';
import { useOrg } from "@/lib/tenant/OrgContext";
import { Download } from 'lucide-react';

interface AssetExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: WorkAsset[];
}

export function AssetExportDialog({ open, onOpenChange, assets }: AssetExportDialogProps) {
  const { toast } = useToast();
  const { organizationId: orgId } = useOrg();
  const canViewFinancials = RBACService.hasPermission('assets.view_financials');

  const [includeFinancials, setIncludeFinancials] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Fetch all logs for the current asset list
  const assetIds = assets.map((a) => a.id);
  const { data: allLogs = [] } = useQuery({
    queryKey: ['export-logs', orgId, assetIds.join(',')],
    queryFn: async () => {
      if (!assetIds.length) return [];
      const results = await Promise.all(
        assetIds.map((id) => getAssetLogs(id))
      );
      return results.flat();
    },
    enabled: open && includeLogs && assetIds.length > 0,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      AssetsExporter.exportToExcel(assets, allLogs, {
        includeFinancials: canViewFinancials && includeFinancials,
        includeLogs,
        fileName: `Work_Assets_${new Date().toISOString().split('T')[0]}.xlsx`,
      });
      toast({ title: 'Export complete', description: 'Your Excel file has been downloaded.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>
            Exporting {assets.length} asset{assets.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {canViewFinancials && (
            <div className="flex items-center gap-3">
              <Checkbox
                id="include-financials"
                checked={includeFinancials}
                onCheckedChange={(v) => setIncludeFinancials(!!v)}
              />
              <Label htmlFor="include-financials" className="cursor-pointer">
                Include purchase price / financial data
              </Label>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Checkbox
              id="include-logs"
              checked={includeLogs}
              onCheckedChange={(v) => setIncludeLogs(!!v)}
            />
            <Label htmlFor="include-logs" className="cursor-pointer">
              Include activity log sheet
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            File will contain an Assets sheet, Summary sheet
            {includeLogs ? ', and Activity Log sheet' : ''}.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Download'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
