import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAuditLogs, type AuditLog } from "@/api/logs";

export const Route = createFileRoute("/_app/logs")({
  component: AuditLogsPage,
});

const columnHelper = createColumnHelper<AuditLog>();

const columns = [
  columnHelper.accessor("action", { header: "Action" }),
  columnHelper.accessor("resource", { header: "Resource" }),
  columnHelper.accessor("user_id", { header: "User ID" }),
  columnHelper.accessor("result", { header: "Result" }),
  columnHelper.accessor("timestamp", {
    header: "Timestamp",
    cell: (info) =>
      info.getValue() ? new Date(info.getValue() as string).toLocaleString() : "--",
  }),
  columnHelper.accessor("details", {
    header: "Details",
    cell: (info) => {
      const meta = info.getValue();
      return (
        <code className="text-xs">
          {meta ? JSON.stringify(meta).slice(0, 80) : "{}"}
          {meta && JSON.stringify(meta).length > 80 ? "..." : ""}
        </code>
      );
    },
  }),
];

function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchAuditLogs({ limit: 100, offset: 0 }),
  });

  const table = useReactTable({
    data: data?.logs ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          View real audit logs from `audit_logs`.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Backed by the platform-admin audit logs Edge Function.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit logs...
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-sm">
                      No audit logs yet.
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}








