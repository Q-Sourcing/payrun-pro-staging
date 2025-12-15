import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchTenants, type OrganizationTenant } from "@/api/tenants";
import { createOrg } from "@/api/orgs";

export const Route = createFileRoute("/_app/tenants/")({
  component: TenantsIndexPage,
});

const columnHelper = createColumnHelper<OrganizationTenant>();

const columns = [
  columnHelper.accessor("name", {
    header: "Organization",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("active", {
    header: "Active",
    cell: (info) => (info.getValue() ? "Yes" : "No"),
  }),
  columnHelper.accessor("companies_count", {
    header: "Companies",
    cell: (info) => info.getValue() ?? 0,
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    cell: (info) =>
      info.getValue()
        ? new Date(info.getValue() as string).toLocaleDateString()
        : "--",
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <RowActions orgId={row.original.id} />,
  }),
];

function TenantsIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
  });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      await createOrg({ name: name.trim(), description: description.trim() || null, active: true });
      setName("");
      setDescription("");
      await qc.invalidateQueries({ queryKey: ["tenants"] });
    } catch (err) {
      console.error("Create org failed", err);
    } finally {
      setCreating(false);
    }
  };

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            A tenant is an Organization (companies live under the organization).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="h-9 rounded-md border px-2 text-sm"
            placeholder="Org name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-9 rounded-md border px-2 text-sm"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button variant="secondary" disabled={!name.trim() || creating} onClick={handleCreate}>
            {creating ? "Creating..." : "Add Org"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Directory</CardTitle>
          <CardDescription>Real data pulled from `organizations` and `companies`.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading organizations...
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
                      No organizations found.
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

function RowActions({ orgId }: { orgId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link to="/tenants/$id" params={{ id: orgId }}>
        <Button variant="ghost" size="sm">View</Button>
      </Link>
      <Button variant="ghost" size="sm" disabled>
        Suspend
      </Button>
      <Button variant="ghost" size="sm" disabled>
        Delete
      </Button>
      <Button variant="ghost" size="icon" aria-label="More actions">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}


