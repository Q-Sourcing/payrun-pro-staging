import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw, SkipForward, UserPlus, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ZohoSyncMode, ZohoSyncPreview, ZohoSyncPreviewRow, ZohoSyncSummary } from "@/lib/services/zoho-integration.service";

type PreviewFilter = "all" | "create" | "update" | "warning" | "skip" | "error";

interface ZohoSyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ZohoSyncMode;
  summary: ZohoSyncSummary | null;
  preview: ZohoSyncPreview | null;
  confirming: boolean;
  onConfirm: () => void;
}

const FILTER_LABELS: Record<PreviewFilter, string> = {
  all: "All",
  create: "Creates",
  update: "Updates",
  warning: "Warnings",
  skip: "Skipped",
  error: "Errors",
};

export function ZohoSyncPreviewDialog({
  open,
  onOpenChange,
  mode,
  summary,
  preview,
  confirming,
  onConfirm,
}: ZohoSyncPreviewDialogProps) {
  const [filter, setFilter] = useState<PreviewFilter>("all");

  const rows = preview?.rows || [];
  const actionableCount = rows.filter((row) => row.action === "create" || row.action === "update").length;
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "all") return true;
      if (filter === "warning") return row.warnings.length > 0;
      return row.action === filter;
    });
  }, [filter, rows]);

  const filterCounts = useMemo(() => {
    return {
      all: rows.length,
      create: rows.filter((row) => row.action === "create").length,
      update: rows.filter((row) => row.action === "update").length,
      warning: rows.filter((row) => row.warnings.length > 0).length,
      skip: rows.filter((row) => row.action === "skip").length,
      error: rows.filter((row) => row.action === "error").length,
    } satisfies Record<PreviewFilter, number>;
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Zoho Sync Preview</DialogTitle>
          <DialogDescription>
            Review employee changes for <span className="font-medium">{mode}</span> mode before confirming the sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {summary && (
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard
                title="Import"
                description={`${summary.imported.created} create · ${summary.imported.updated} update · ${summary.imported.skipped} skip · ${summary.imported.failed} error`}
              />
              <SummaryCard
                title="Export"
                description={`${summary.exported.updated} update · ${summary.exported.skipped} skip · ${summary.exported.failed} error`}
              />
              <SummaryCard
                title="Preview"
                description={
                  preview?.truncated
                    ? `Showing ${preview.rows.length} of ${preview.totalRows} rows`
                    : `${preview?.totalRows || 0} rows ready for review`
                }
              />
            </div>
          )}

          {summary?.warnings?.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Sync warnings
              </div>
              <ul className="space-y-1">
                {summary.warnings.slice(0, 10).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              {summary.warnings.length > 10 && (
                <p className="mt-2 text-xs text-amber-800">More warnings exist in the preview response.</p>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as PreviewFilter[]).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={filter === item ? "default" : "outline"}
                onClick={() => setFilter(item)}
              >
                {FILTER_LABELS[item]} ({filterCounts[item]})
              </Button>
            ))}
          </div>

          <div className="max-h-[55vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Direction</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Warnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No preview rows match the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={`${row.direction}-${row.localEmployeeId || "new"}-${row.zohoEmployeeId || row.displayName}`}>
                      <TableCell>
                        <Badge variant="outline">{row.direction}</Badge>
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={row.action} />
                      </TableCell>
                      <TableCell className="space-y-1 align-top">
                        <div className="font-medium">{row.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.zohoEmployeeId ? `Zoho: ${row.zohoEmployeeId}` : "Zoho: —"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.localEmployeeId ? `Local: ${row.localEmployeeId}` : "Local: new employee"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {row.reason || "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        {row.fieldDiffs.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No field changes</span>
                        ) : (
                          <div className="space-y-2">
                            {row.fieldDiffs.map((diff) => (
                              <div key={`${row.displayName}-${diff.field}`} className="rounded-md border px-2 py-1 text-xs">
                                <div className="font-medium">{diff.field}</div>
                                <div className="text-muted-foreground">
                                  {diff.from || "—"} → {diff.to || "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {row.warnings.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-2">
                            {row.warnings.map((warning) => (
                              <div key={`${row.displayName}-${warning}`} className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                {warning}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Close
          </Button>
          <Button type="button" onClick={onConfirm} disabled={confirming || actionableCount === 0}>
            {confirming ? "Running Sync..." : `Confirm Sync${actionableCount > 0 ? ` (${actionableCount})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-4 py-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

function ActionBadge({ action }: { action: ZohoSyncPreviewRow["action"] }) {
  if (action === "create") {
    return (
      <Badge className="gap-1">
        <UserPlus className="h-3 w-3" />
        Create
      </Badge>
    );
  }

  if (action === "update") {
    return (
      <Badge className="gap-1" variant="secondary">
        <RefreshCcw className="h-3 w-3" />
        Update
      </Badge>
    );
  }

  if (action === "skip") {
    return (
      <Badge className="gap-1" variant="outline">
        <SkipForward className="h-3 w-3" />
        Skip
      </Badge>
    );
  }

  if (action === "error") {
    return (
      <Badge className="gap-1" variant="destructive">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }

  return (
    <Badge className="gap-1" variant="outline">
      <CheckCircle2 className="h-3 w-3" />
      Ready
    </Badge>
  );
}
