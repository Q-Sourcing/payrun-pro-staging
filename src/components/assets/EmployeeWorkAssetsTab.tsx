// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import { getAssetsForEmployee } from '@/lib/services/assets.service';
import { RBACService } from '@/lib/services/auth/rbac';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AssetStatusBadge } from './AssetStatusBadge';
import { AssetTypeBadge } from './AssetTypeBadge';
import { Monitor, ExternalLink } from 'lucide-react';
import { AssetsExporter } from '@/lib/services/assets-exporter';

interface EmployeeWorkAssetsTabProps {
  employeeId: string;
  orgId: string;
}

export function EmployeeWorkAssetsTab({ employeeId, orgId }: EmployeeWorkAssetsTabProps) {
  const navigate = useNavigate();
  const canViewFinancials = RBACService.hasPermission('assets.view_financials');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: queryKeys.workAssets.forEmployee(employeeId),
    queryFn: () => getAssetsForEmployee(employeeId, orgId, canViewFinancials),
    enabled: !!employeeId && !!orgId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        Loading assets...
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Monitor className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">No work assets assigned to this employee.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/assets')}>
            Go to Assets
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Asset #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Since</TableHead>
              {canViewFinancials && (
                <TableHead className="text-right">Price (UGX)</TableHead>
              )}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
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
                <TableCell className="text-sm text-muted-foreground">
                  {asset.assigned_at ? new Date(asset.assigned_at).toLocaleDateString() : '—'}
                </TableCell>
                {canViewFinancials && (
                  <TableCell className="text-right text-sm">
                    {asset.purchase_price != null
                      ? AssetsExporter.formatCurrency(asset.purchase_price)
                      : '—'}
                  </TableCell>
                )}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => navigate(`/assets/${asset.id}`)}
                    title="View asset details"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
