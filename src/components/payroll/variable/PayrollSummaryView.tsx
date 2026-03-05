// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Download, TrendingUp, Users, DollarSign, Building2, Package } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface PayrollSummaryViewProps {
  organizationId: string;
}

interface ProjectSummary {
  project_id: string | null;
  project_name: string;
  employee_count: number;
  total_daily_pay: number;
  total_piece_pay: number;
  total_allowances: number;
  gross_pay: number;
  tax_deduction: number;
  nssf_employee: number;
  net_pay: number;
  cycle_name: string;
  period_start: string;
  period_end: string;
  status: string;
}

interface EmployeeSummaryRow {
  employee_name: string;
  employee_id: string;
  contract_type: string;
  days_present: number;
  total_daily_pay: number;
  total_piece_pay: number;
  allowance_house: number;
  allowance_travel: number;
  allowance_airtime: number;
  allowance_medical: number;
  allowance_seating: number;
  gross_pay: number;
  tax_deduction: number;
  nssf_employee: number;
  net_pay: number;
}

function fmt(n: number) {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const COLORS = ["hsl(var(--primary))", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function PayrollSummaryView({ organizationId }: PayrollSummaryViewProps) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { fetchCycles(); }, [organizationId]);
  useEffect(() => { fetchSummaryData(); }, [selectedCycleId, organizationId]);

  const fetchCycles = async () => {
    const { data } = await supabase
      .from("variable_pay_cycles")
      .select("id, cycle_name, period_start, period_end, status, project_id")
      .eq("organization_id", organizationId)
      .order("period_start", { ascending: false });
    setCycles(data || []);

    // Fetch project names
    const projectIds = [...new Set((data || []).map(c => c.project_id).filter(Boolean))];
    if (projectIds.length) {
      const { data: projs } = await supabase.from("projects").select("id, name").in("id", projectIds);
      const map: Record<string, string> = {};
      (projs || []).forEach(p => { map[p.id] = p.name; });
      setProjects(map);
    }
  };

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      let cycleQuery = supabase
        .from("variable_pay_cycles")
        .select("id, cycle_name, period_start, period_end, status, project_id")
        .eq("organization_id", organizationId);

      if (selectedCycleId !== "all") cycleQuery = cycleQuery.eq("id", selectedCycleId);

      const { data: cycleDocs } = await cycleQuery;
      if (!cycleDocs?.length) { setProjectSummaries([]); setEmployeeRows([]); setLoading(false); return; }

      const cycleIds = cycleDocs.map(c => c.id);

      const { data: summaries } = await supabase
        .from("variable_pay_summaries")
        .select(`
          *,
          employees(first_name, last_name, contract_type),
          variable_pay_cycles!inner(cycle_name, period_start, period_end, project_id, status)
        `)
        .in("cycle_id", cycleIds);

      // Build employee rows
      const empRows: EmployeeSummaryRow[] = (summaries || []).map(s => ({
        employee_name: `${s.employees?.first_name || ""} ${s.employees?.last_name || ""}`.trim(),
        employee_id: s.employee_id,
        contract_type: s.employees?.contract_type || "variable",
        days_present: s.days_present || 0,
        total_daily_pay: s.total_daily_pay || 0,
        total_piece_pay: s.total_piece_pay || 0,
        allowance_house: s.allowance_house || 0,
        allowance_travel: s.allowance_travel || 0,
        allowance_airtime: s.allowance_airtime || 0,
        allowance_medical: s.allowance_medical || 0,
        allowance_seating: s.allowance_seating || 0,
        gross_pay: s.gross_pay || 0,
        tax_deduction: s.tax_deduction || 0,
        nssf_employee: s.nssf_employee || 0,
        net_pay: s.net_pay || 0,
      }));
      setEmployeeRows(empRows);

      // Build project summaries
      const byProject: Record<string, ProjectSummary> = {};
      (summaries || []).forEach(s => {
        const cycle = cycleDocs.find(c => c.id === s.cycle_id);
        const key = cycle?.project_id || "none";
        if (!byProject[key]) {
          byProject[key] = {
            project_id: cycle?.project_id || null,
            project_name: projects[cycle?.project_id] || cycle?.project_id || "No Project",
            employee_count: 0,
            total_daily_pay: 0,
            total_piece_pay: 0,
            total_allowances: 0,
            gross_pay: 0,
            tax_deduction: 0,
            nssf_employee: 0,
            net_pay: 0,
            cycle_name: cycle?.cycle_name || "",
            period_start: cycle?.period_start || "",
            period_end: cycle?.period_end || "",
            status: cycle?.status || "",
          };
        }
        const row = byProject[key];
        row.employee_count++;
        row.total_daily_pay += s.total_daily_pay || 0;
        row.total_piece_pay += s.total_piece_pay || 0;
        const allowTotal = (s.allowance_house || 0) + (s.allowance_travel || 0) + (s.allowance_airtime || 0) + (s.allowance_medical || 0) + (s.allowance_seating || 0);
        row.total_allowances += allowTotal;
        row.gross_pay += s.gross_pay || 0;
        row.tax_deduction += s.tax_deduction || 0;
        row.nssf_employee += s.nssf_employee || 0;
        row.net_pay += s.net_pay || 0;
      });
      setProjectSummaries(Object.values(byProject));
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => ({
    employees: employeeRows.length,
    gross: employeeRows.reduce((s, r) => s + r.gross_pay, 0),
    net: employeeRows.reduce((s, r) => s + r.net_pay, 0),
    tax: employeeRows.reduce((s, r) => s + r.tax_deduction, 0),
    nssf: employeeRows.reduce((s, r) => s + r.nssf_employee, 0),
    allowances: employeeRows.reduce((s, r) => s + r.allowance_house + r.allowance_travel + r.allowance_airtime + r.allowance_medical + r.allowance_seating, 0),
    daily: employeeRows.reduce((s, r) => s + r.total_daily_pay, 0),
    piece: employeeRows.reduce((s, r) => s + r.total_piece_pay, 0),
  }), [employeeRows]);

  const chartData = projectSummaries.map(p => ({
    name: p.project_name.length > 15 ? p.project_name.slice(0, 15) + "…" : p.project_name,
    "Daily Pay": Math.round(p.total_daily_pay),
    "Piece Pay": Math.round(p.total_piece_pay),
    "Allowances": Math.round(p.total_allowances),
  }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(employeeRows.map(r => ({
      "Employee": r.employee_name,
      "Contract Type": r.contract_type,
      "Days Present": r.days_present,
      "Daily Labour Pay": r.total_daily_pay,
      "Piece-Rate Pay": r.total_piece_pay,
      "House Allowance": r.allowance_house,
      "Travel Allowance": r.allowance_travel,
      "Airtime Allowance": r.allowance_airtime,
      "Medical Allowance": r.allowance_medical,
      "Seating Allowance": r.allowance_seating,
      "Gross Pay": r.gross_pay,
      "PAYE Tax": r.tax_deduction,
      "NSSF (Employee)": r.nssf_employee,
      "Net Pay": r.net_pay,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
    XLSX.writeFile(wb, `variable-payroll-summary-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Exported", description: "Payroll summary exported to Excel." });
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Variable Payroll Summary
          </h3>
          <p className="text-xs text-muted-foreground">Breakdown of costs per project — daily labour, piece-rate, and allowances</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-52 h-8 text-sm">
              <SelectValue placeholder="All cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.cycle_name}
                  <Badge variant={c.status === "processed" ? "default" : "outline"} className="ml-2 text-xs">{c.status}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={employeeRows.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Total Workers", value: totals.employees, color: "" },
          { icon: DollarSign, label: "Total Gross Pay", value: fmt(totals.gross), color: "text-primary" },
          { icon: Package, label: "Daily + Piece Pay", value: fmt(totals.daily + totals.piece), color: "text-blue-600" },
          { icon: TrendingUp, label: "Total Net Pay", value: fmt(totals.net), color: "text-green-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pay Component Breakdown */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Daily Labour", value: totals.daily, pct: totals.gross ? (totals.daily / totals.gross * 100).toFixed(1) : 0 },
          { label: "Piece-Rate", value: totals.piece, pct: totals.gross ? (totals.piece / totals.gross * 100).toFixed(1) : 0 },
          { label: "Allowances", value: totals.allowances, pct: totals.gross ? (totals.allowances / totals.gross * 100).toFixed(1) : 0 },
        ].map(({ label, value, pct }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{fmt(value)}</p>
              <p className="text-xs text-muted-foreground">{pct}% of gross</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="by-project">
        <TabsList>
          <TabsTrigger value="by-project">By Project</TabsTrigger>
          <TabsTrigger value="by-employee">By Employee</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
        </TabsList>

        {/* By Project */}
        <TabsContent value="by-project">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : projectSummaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No processed variable pay cycles found.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Project</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead className="w-16">Staff</TableHead>
                    <TableHead className="text-right">Daily Pay</TableHead>
                    <TableHead className="text-right">Piece Pay</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">PAYE</TableHead>
                    <TableHead className="text-right">NSSF</TableHead>
                    <TableHead className="text-right font-bold">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectSummaries.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.project_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.cycle_name}
                        {p.period_start && <div>{format(parseISO(p.period_start), "MMM d")}–{format(parseISO(p.period_end), "MMM d")}</div>}
                      </TableCell>
                      <TableCell className="text-center">{p.employee_count}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.total_daily_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.total_piece_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-amber-600">{fmt(p.total_allowances)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{fmt(p.gross_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-500">{fmt(p.tax_deduction)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-orange-500">{fmt(p.nssf_employee)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">{fmt(p.net_pay)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "processed" ? "default" : p.status === "open" ? "outline" : "secondary"} className="text-xs">
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell className="text-xs font-bold" colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(totals.daily)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(totals.piece)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(totals.allowances)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.gross)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(totals.tax)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(totals.nssf)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600">{fmt(totals.net)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* By Employee */}
        <TabsContent value="by-employee">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-16">Days</TableHead>
                  <TableHead className="text-right">Daily Pay</TableHead>
                  <TableHead className="text-right">Piece Pay</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right font-bold">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeRows.map((r, i) => {
                  const totalAllow = r.allowance_house + r.allowance_travel + r.allowance_airtime + r.allowance_medical + r.allowance_seating;
                  const totalDed = r.tax_deduction + r.nssf_employee;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{r.employee_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.contract_type}</Badge></TableCell>
                      <TableCell className="text-center">{r.days_present}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.total_daily_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.total_piece_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-amber-600">{fmt(totalAllow)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{fmt(r.gross_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-500">{fmt(totalDed)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">{fmt(r.net_pay)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Chart */}
        <TabsContent value="chart">
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No data to display</div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Pay Cost Breakdown by Project</h4>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="Daily Pay" fill="hsl(var(--primary))" stackId="a" />
                    <Bar dataKey="Piece Pay" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="Allowances" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" />Daily Labour</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Piece-Rate</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Allowances</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
