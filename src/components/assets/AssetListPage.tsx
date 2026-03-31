// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import { getAssets } from '@/lib/services/assets.service';
import { useOrg } from '@/lib/auth/OrgProvider';
import { usePermission } from '@/lib/auth/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AssetStatusBadge } from './AssetStatusBadge';
import { AssetTypeBadge } from './AssetTypeBadge';
import { AssetFormDialog } from './AssetFormDialog';
import { AssetExportDialog } from './AssetExportDialog';
import { Plus, Download, Monitor, Search } from 'lucide-react';
import { ASSET_STATUS_LABELS } from '@/lib/types/assets';
import type { AssetStatus } from '@/lib/types/assets';
import { AssetsExporter } from '@/lib/services/assets-exporter';

export function AssetListPage() {
  const navigate = useNavigate();
  const { organizationId: orgId } = useOrg();
  const perm = usePermission();
  const canCreate = perm.hasPermission('assets.create');
  const canViewFinancials = perm.hasPermission('assets.view_financials');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.workAssets.list({ orgId, canViewFinancials }),
    queryFn: () => getAssets(orgId!, canViewFinancials),
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.asset_number.toLowerCase().includes(search.toLowerCase()) ||
        a.employee?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.employee?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assets, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Work Assets</h1>
            <p className="text-sm text-muted-foreground">
              {assets.length} asset{assets.length !== 1 ? 's' : ''} in inventory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, number, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(ASSET_STATUS_LABELS) as AssetStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{ASSET_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Loading assets...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Monitor className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                {search || statusFilter !== 'all'
                  ? 'No assets match your filters.'
                  : 'No assets yet. Add your first work asset to get started.'}
              </p>
              {canCreate && !search && statusFilter === 'all' && (
                <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Asset #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Assigned Since</TableHead>
                  {canViewFinancials && (
                    <TableHead className="text-right">Price (UGX)</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/assets/${asset.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium text-blue-600">
                      {asset.asset_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        {asset.serial_number && (
                          <p className="text-xs text-muted-foreground">S/N: {asset.serial_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AssetTypeBadge assetType={asset.asset_type} />
                    </TableCell>
                    <TableCell>
                      <AssetStatusBadge status={asset.status} />
                    </TableCell>
                    <TableCell>
                      {asset.employee
                        ? `${asset.employee.first_name} ${asset.employee.last_name}`
                        : <span className="text-muted-foreground text-sm">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.assigned_at
                        ? new Date(asset.assigned_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    {canViewFinancials && (
                      <TableCell className="text-right text-sm">
                        {asset.purchase_price != null
                          ? AssetsExporter.formatCurrency(asset.purchase_price)
                          : '—'}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssetFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSaved={() => refetch()}
      />

      <AssetExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        assets={filtered}
      />
    </div>
  );
}
