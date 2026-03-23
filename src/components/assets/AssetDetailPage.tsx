// @ts-nocheck
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/data/query-client';
import {
  getAsset, getAssetAssignmentHistory, getAssetLogs, deleteAsset,
} from '@/lib/services/assets.service';
import { useOrg } from '@/lib/tenant/OrgContext';
import { RBACService } from '@/lib/services/auth/rbac';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AssetStatusBadge } from './AssetStatusBadge';
import { AssetTypeBadge } from './AssetTypeBadge';
import { AssetFormDialog } from './AssetFormDialog';
import { ReassignAssetDialog } from './ReassignAssetDialog';
import { LogAssetEventDialog } from './LogAssetEventDialog';
import { useToast } from '@/hooks/use-toast';
import { AssetsExporter } from '@/lib/services/assets-exporter';
import {
  ArrowLeft, Edit, UserCheck, ClipboardList, Trash2, DollarSign,
  Calendar, Hash, Info, Clock,
} from 'lucide-react';
import { ASSET_EVENT_LABELS, ASSET_EVENT_COLORS } from '@/lib/types/assets';
import type { AssetEventType } from '@/lib/types/assets';

export function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId: orgId } = useOrg();

  const canEdit = RBACService.hasPermission('assets.edit');
  const canDelete = RBACService.hasPermission('assets.delete');
  const canViewFinancials = RBACService.hasPermission('assets.view_financials');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: asset, isLoading } = useQuery({
    queryKey: queryKeys.workAssets.detail(assetId!),
    queryFn: () => getAsset(assetId!, canViewFinancials),
    enabled: !!assetId,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: queryKeys.workAssets.assignments(assetId!),
    queryFn: () => getAssetAssignmentHistory(assetId!),
    enabled: !!assetId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: queryKeys.workAssets.logs(assetId!),
    queryFn: () => getAssetLogs(assetId!),
    enabled: !!assetId,
  });

  const handleDelete = async () => {
    if (!asset || !orgId) return;
    if (!confirm(`Delete asset ${asset.asset_number}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteAsset(asset.id, orgId);
      toast({ title: 'Asset deleted', description: `${asset.asset_number} has been removed.` });
      queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.lists() });
      navigate('/assets');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading asset...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-muted-foreground">Asset not found.</p>
        <Button variant="outline" onClick={() => navigate('/assets')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Assets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
              {asset.asset_number}
            </span>
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <AssetStatusBadge status={asset.status} />
            <AssetTypeBadge assetType={asset.asset_type} />
          </div>
          {asset.employee && (
            <p className="text-sm text-muted-foreground mt-1">
              Assigned to{' '}
              <span className="font-medium text-foreground">
                {asset.employee.first_name} {asset.employee.last_name}
              </span>
              {asset.assigned_at && (
                <> since {new Date(asset.assigned_at).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowLogDialog(true)}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Log Event
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowReassignDialog(true)}>
                <UserCheck className="h-4 w-4 mr-2" />
                Reassign
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">
            Assignment History
            {assignments.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{assignments.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="log">
            Activity Log
            {logs.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{logs.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow label="Asset Number" value={asset.asset_number} mono />
                <DetailRow label="Name" value={asset.name} />
                <DetailRow label="Type" value={<AssetTypeBadge assetType={asset.asset_type} />} />
                <DetailRow label="Status" value={<AssetStatusBadge status={asset.status} />} />
                {asset.serial_number && (
                  <DetailRow label="Serial / ID" value={asset.serial_number} mono />
                )}
                {asset.useful_life_years && (
                  <DetailRow label="Useful Life" value={`${asset.useful_life_years} years`} />
                )}
                {asset.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-foreground">{asset.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {canViewFinancials && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {asset.purchase_price != null ? (
                    <DetailRow
                      label="Purchase Price"
                      value={AssetsExporter.formatCurrency(asset.purchase_price)}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">No financial data recorded.</p>
                  )}
                  {asset.purchase_date && (
                    <DetailRow
                      label="Purchase Date"
                      value={new Date(asset.purchase_date).toLocaleDateString()}
                    />
                  )}
                  {asset.useful_life_years && asset.purchase_date && (
                    <DetailRow
                      label="End of Life"
                      value={new Date(
                        new Date(asset.purchase_date).setFullYear(
                          new Date(asset.purchase_date).getFullYear() + asset.useful_life_years
                        )
                      ).toLocaleDateString()}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Created" value={new Date(asset.created_at).toLocaleString()} />
              <DetailRow label="Last Updated" value={new Date(asset.updated_at).toLocaleString()} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {assignments.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  No assignment history yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Returned</TableHead>
                      <TableHead>Return Condition</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.employee
                            ? `${a.employee.first_name} ${a.employee.last_name}`
                            : '—'}
                          {!a.returned_at && (
                            <Badge variant="outline" className="ml-2 text-xs text-green-600 border-green-300">
                              Current
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(a.assigned_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.returned_at ? new Date(a.returned_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{a.return_condition ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  No activity logged yet.
                </div>
              ) : (
                <div className="divide-y">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 px-6 py-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          ASSET_EVENT_COLORS[log.event_type as AssetEventType]
                            .replace('text-', 'bg-')
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${ASSET_EVENT_COLORS[log.event_type as AssetEventType]}`}>
                            {ASSET_EVENT_LABELS[log.event_type as AssetEventType] ?? log.event_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5">{log.description}</p>
                        {log.logger && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {log.logger.first_name} {log.logger.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showEditDialog && (
        <AssetFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          asset={asset}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.detail(assetId!) });
          }}
        />
      )}

      {showReassignDialog && (
        <ReassignAssetDialog
          open={showReassignDialog}
          onOpenChange={setShowReassignDialog}
          asset={asset}
          onReassigned={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.detail(assetId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.assignments(assetId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.logs(assetId!) });
          }}
        />
      )}

      {showLogDialog && (
        <LogAssetEventDialog
          open={showLogDialog}
          onOpenChange={setShowLogDialog}
          asset={asset}
          onLogged={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.logs(assetId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.workAssets.detail(assetId!) });
          }}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
