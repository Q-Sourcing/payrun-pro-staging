import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Receipt, Search, Download, TrendingUp, DollarSign, Calendar, Loader2,
  FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PayslipRow {
  id: string;
  pay_period_start: string | null;
  pay_period_end: string | null;
  gross_pay: number | null;
  net_pay: number | null;
  status: string | null;
  currency: string | null;
  pay_run_id: string | null;
  pay_run_name: string | null;
  pay_group_name: string | null;
}

const PAGE_SIZE = 10;

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start) return "—";
  try {
    const s = format(new Date(start), "d MMM yyyy");
    const e = end ? format(new Date(end), "d MMM yyyy") : "";
    return e ? `${s} – ${e}` : s;
  } catch {
    return start;
  }
}

export default function MyPayslips() {
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Find the employee record linked to this user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (empError) throw empError;

        if (!empData) {
          setError("No employee record is linked to your account. Contact your HR administrator.");
          setLoading(false);
          return;
        }

        // Fetch pay items (payslips) for this employee
        const { data, error: payError } = await supabase
          .from("pay_items")
          .select(`
            id,
            gross_pay,
            net_pay,
            status,
            currency,
            pay_run_id,
            pay_runs (
              id,
              name,
              pay_period_start,
              pay_period_end,
              pay_groups ( name )
            )
          `)
          .eq("employee_id", empData.id)
          .order("created_at", { ascending: false });

        if (payError) throw payError;

        const rows: PayslipRow[] = (data ?? []).map((item: any) => ({
          id: item.id,
          pay_period_start: item.pay_runs?.pay_period_start ?? null,
          pay_period_end: item.pay_runs?.pay_period_end ?? null,
          gross_pay: item.gross_pay ?? null,
          net_pay: item.net_pay ?? null,
          status: item.status ?? null,
          currency: item.currency ?? item.pay_runs?.pay_groups?.currency ?? null,
          pay_run_id: item.pay_run_id ?? null,
          pay_run_name: item.pay_runs?.name ?? null,
          pay_group_name: item.pay_runs?.pay_groups?.name ?? null,
        }));

        setPayslips(rows);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load payslips");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = payslips.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.pay_run_name ?? "").toLowerCase().includes(q) ||
      (p.pay_group_name ?? "").toLowerCase().includes(q) ||
      (p.status ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary stats
  const totalGross = payslips.reduce((s, p) => s + (p.gross_pay ?? 0), 0);
  const totalNet = payslips.reduce((s, p) => s + (p.net_pay ?? 0), 0);
  const currency = payslips[0]?.currency ?? "UGX";
  const latestPayslip = payslips[0];

  const statusColor: Record<string, string> = {
    approved: "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30",
    paid: "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30",
    pending: "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/20",
    draft: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          My Payslips
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your payroll history and payment records.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your payslips…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <FileText className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Payslips</p>
                  <p className="text-2xl font-bold">{payslips.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Net Pay</p>
                  <p className="text-xl font-bold">{formatAmount(totalNet, currency)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Pay Period</p>
                  <p className="text-sm font-semibold">
                    {latestPayslip
                      ? formatPeriod(latestPayslip.pay_period_start, latestPayslip.pay_period_end)
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base">Payslip History</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payslips…"
                    className="pl-9 h-8 text-sm"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Receipt className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {payslips.length === 0
                      ? "No payslips yet. Your payslips will appear here once payroll is processed."
                      : "No payslips match your search."}
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pay Period</TableHead>
                        <TableHead>Pay Group</TableHead>
                        <TableHead>Gross Pay</TableHead>
                        <TableHead>Net Pay</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-sm">
                            {formatPeriod(row.pay_period_start, row.pay_period_end)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.pay_group_name ?? row.pay_run_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatAmount(row.gross_pay, row.currency)}
                          </TableCell>
                          <TableCell className="text-sm font-mono font-semibold">
                            {formatAmount(row.net_pay, row.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`capitalize text-xs ${statusColor[row.status ?? ""] ?? ""}`}
                            >
                              {row.status ?? "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 h-7 text-xs"
                              title="Download payslip (coming soon)"
                              disabled
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                      <span className="text-muted-foreground text-xs">
                        Page {page + 1} of {totalPages} · {filtered.length} payslips
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
