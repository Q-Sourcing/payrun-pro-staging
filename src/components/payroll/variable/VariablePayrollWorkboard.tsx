// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Save, Users, DollarSign, AlertTriangle, CheckCircle2,
  Plus, Trash2, Package, Lock, Unlock, TrendingUp, ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, parseISO } from "date-fns";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  pay_rate: number;
  pay_type: string;
  contract_type: string;
}

interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  category: string;
}

interface WorkLogRow {
  employee_id: string;
  employee_name: string;
  daily_rate: number;
  attendance_status: "present" | "absent" | "leave" | "half_day";
  hours_worked: number;
  daily_cost: number;
  remarks: string;
  item_logs: { catalog_item_id: string; item_name: string; unit: string; unit_cost: number; quantity: number; total_cost: number }[];
}

interface AllowanceRow {
  employee_id: string;
  allowance_house: number;
  allowance_travel: number;
  allowance_airtime: number;
  allowance_medical: number;
  allowance_seating: number;
}

interface Cycle {
  id: string;
  cycle_name: string;
  period_start: string;
  period_end: string;
  status: string;
  total_daily_cost: number;
  total_piece_cost: number;
  total_allowances: number;
  total_net_pay: number;
}

interface Props {
  projectId?: string;
  projectName?: string;
  organizationId: string;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
  { value: "half_day", label: "Half Day" },
];

function fmt(n: number) {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function computeDailyCost(row: WorkLogRow): number {
  if (row.attendance_status === "absent") return 0;
  if (row.attendance_status === "half_day") return row.daily_rate * 0.5;
  return row.daily_rate * (row.hours_worked / 8.0);
}

export function VariablePayrollWorkboard({ projectId, projectName, organizationId }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [workRows, setWorkRows] = useState<WorkLogRow[]>([]);
  const [allowanceRows, setAllowanceRows] = useState<AllowanceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [newCycle, setNewCycle] = useState({ cycle_name: "", period_start: "", period_end: "" });
  const { toast } = useToast();

  useEffect(() => { fetchCycles(); fetchCatalog(); }, [projectId, organizationId]);
  useEffect(() => { if (activeCycle) fetchEmployeesForCycle(); }, [activeCycle]);

  const fetchCycles = async () => {
    let q = supabase.from("variable_pay_cycles").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (projectId) q = q.eq("project_id", projectId);
    const { data } = await q;
    setCycles(data || []);
    if (data?.length && !activeCycle) setActiveCycle(data[0]);
  };

  const fetchCatalog = async () => {
    let q = supabase.from("items_catalog").select("id,name,unit,unit_cost,category").eq("organization_id", organizationId).eq("is_active", true);
    if (projectId) q = q.or(`project_id.eq.${projectId},project_id.is.null`);
    const { data } = await q;
    setCatalogItems(data || []);
  };

  const fetchEmployeesForCycle = async () => {
    setLoading(true);
    let q = supabase.from("employees").select("id,first_name,last_name,pay_rate,pay_type,contract_type").eq("status", "active");
    if (projectId) q = q.eq("project_id", projectId);
    const { data: emps } = await q;
    const empList = emps || [];
    setEmployees(empList);

    // Load existing work logs for selected date
    if (activeCycle) {
      const { data: logs } = await supabase
        .from("variable_work_logs")
        .select("*, variable_item_logs(*)")
        .eq("cycle_id", activeCycle.id)
        .eq("work_date", selectedDate);

      const logMap = (logs || []).reduce((acc, l) => { acc[l.employee_id] = l; return acc; }, {} as Record<string, any>);

      setWorkRows(empList.map(e => {
        const log = logMap[e.id];
        return {
          employee_id: e.id,
          employee_name: `${e.first_name} ${e.last_name}`,
          daily_rate: e.pay_rate,
          attendance_status: log?.attendance_status || "present",
          hours_worked: log?.hours_worked ?? 8,
          daily_cost: log?.daily_cost ?? e.pay_rate,
          remarks: log?.remarks || "",
          item_logs: (log?.variable_item_logs || []).map((il: any) => ({
            catalog_item_id: il.catalog_item_id || "",
            item_name: il.item_name,
            unit: il.item_unit,
            unit_cost: il.unit_cost,
            quantity: il.quantity,
            total_cost: il.total_cost,
          })),
        };
      }));

      // Load allowance summaries
      const { data: summaries } = await supabase
        .from("variable_pay_summaries")
        .select("*")
        .eq("cycle_id", activeCycle.id);

      const sumMap = (summaries || []).reduce((acc, s) => { acc[s.employee_id] = s; return acc; }, {} as Record<string, any>);

      setAllowanceRows(empList.map(e => {
        const s = sumMap[e.id];
        return {
          employee_id: e.id,
          allowance_house: s?.allowance_house || 0,
          allowance_travel: s?.allowance_travel || 0,
          allowance_airtime: s?.allowance_airtime || 0,
          allowance_medical: s?.allowance_medical || 0,
          allowance_seating: s?.allowance_seating || 0,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => { if (activeCycle) fetchEmployeesForCycle(); }, [selectedDate]);

  const updateWorkRow = (idx: number, field: string, val: any) => {
    setWorkRows(rows => {
      const updated = [...rows];
      const row = { ...updated[idx], [field]: val };
      row.daily_cost = computeDailyCost({ ...row, [field]: val });
      updated[idx] = row;
      return updated;
    });
  };

  const addItemLog = (empIdx: number) => {
    setWorkRows(rows => {
      const updated = [...rows];
      updated[empIdx] = {
        ...updated[empIdx],
        item_logs: [...updated[empIdx].item_logs, { catalog_item_id: "", item_name: "", unit: "unit", unit_cost: 0, quantity: 1, total_cost: 0 }],
      };
      return updated;
    });
  };

  const updateItemLog = (empIdx: number, logIdx: number, field: string, val: any) => {
    setWorkRows(rows => {
      const updated = [...rows];
      const logs = [...updated[empIdx].item_logs];
      logs[logIdx] = { ...logs[logIdx], [field]: val };

      if (field === "catalog_item_id") {
        const cat = catalogItems.find(c => c.id === val);
        if (cat) {
          logs[logIdx].item_name = cat.name;
          logs[logIdx].unit = cat.unit;
          logs[logIdx].unit_cost = cat.unit_cost;
        }
      }
      logs[logIdx].total_cost = (logs[logIdx].quantity || 0) * (logs[logIdx].unit_cost || 0);
      updated[empIdx] = { ...updated[empIdx], item_logs: logs };
      return updated;
    });
  };

  const removeItemLog = (empIdx: number, logIdx: number) => {
    setWorkRows(rows => {
      const updated = [...rows];
      const logs = updated[empIdx].item_logs.filter((_, i) => i !== logIdx);
      updated[empIdx] = { ...updated[empIdx], item_logs: logs };
      return updated;
    });
  };

  const updateAllowance = (empIdx: number, field: string, val: string) => {
    setAllowanceRows(rows => {
      const updated = [...rows];
      updated[empIdx] = { ...updated[empIdx], [field]: parseFloat(val) || 0 };
      return updated;
    });
  };

  const validateWorkLogs = (): string[] => {
    const errors: string[] = [];
    workRows.forEach(row => {
      if (row.attendance_status === "present" && row.daily_rate <= 0) {
        errors.push(`${row.employee_name}: daily rate must be > 0 for present workers`);
      }
      row.item_logs.forEach((il, i) => {
        if (!il.item_name) errors.push(`${row.employee_name}: item log ${i + 1} missing name`);
        if (il.quantity <= 0) errors.push(`${row.employee_name}: item log "${il.item_name}" quantity must be > 0`);
      });
    });
    return errors;
  };

  const saveWorkLogs = async () => {
    if (!activeCycle) return;
    const errors = validateWorkLogs();
    if (errors.length) {
      toast({ title: "Validation Failed", description: errors[0], variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      for (const row of workRows) {
        const dailyCost = computeDailyCost(row);
        // Upsert work log
        const { data: wl, error: wlErr } = await supabase
          .from("variable_work_logs")
          .upsert({
            cycle_id: activeCycle.id,
            employee_id: row.employee_id,
            work_date: selectedDate,
            attendance_status: row.attendance_status,
            hours_worked: row.hours_worked,
            daily_rate: row.daily_rate,
            daily_cost: dailyCost,
            remarks: row.remarks,
          }, { onConflict: "cycle_id,employee_id,work_date" })
          .select("id").single();

        if (wlErr) throw wlErr;

        // Delete old item logs for this work log, then re-insert
        await supabase.from("variable_item_logs").delete().eq("work_log_id", wl.id);

        if (row.item_logs.length > 0) {
          const itemPayload = row.item_logs.map(il => ({
            cycle_id: activeCycle.id,
            work_log_id: wl.id,
            employee_id: row.employee_id,
            catalog_item_id: il.catalog_item_id || null,
            item_name: il.item_name,
            item_unit: il.unit,
            unit_cost: il.unit_cost,
            quantity: il.quantity,
            total_cost: il.total_cost,
            work_date: selectedDate,
          }));
          const { error: ilErr } = await supabase.from("variable_item_logs").insert(itemPayload);
          if (ilErr) throw ilErr;
        }
      }
      toast({ title: "Work logs saved", description: `${selectedDate} logs saved successfully.` });
      fetchEmployeesForCycle();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveAllowances = async () => {
    if (!activeCycle) return;
    setSaving(true);
    try {
      for (const row of allowanceRows) {
        await supabase.from("variable_pay_summaries").upsert({
          cycle_id: activeCycle.id,
          employee_id: row.employee_id,
          allowance_house: row.allowance_house,
          allowance_travel: row.allowance_travel,
          allowance_airtime: row.allowance_airtime,
          allowance_medical: row.allowance_medical,
          allowance_seating: row.allowance_seating,
        }, { onConflict: "cycle_id,employee_id" });
      }
      toast({ title: "Allowances saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const processPayroll = async () => {
    if (!activeCycle) return;
    const errors = validateWorkLogs();
    if (errors.length) {
      toast({ title: "Cannot process – validation errors", description: errors.join("; "), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Aggregate per employee across all dates in cycle
      const { data: allLogs } = await supabase
        .from("variable_work_logs")
        .select("*, variable_item_logs(*)")
        .eq("cycle_id", activeCycle.id);

      const { data: allSummaries } = await supabase
        .from("variable_pay_summaries")
        .select("*")
        .eq("cycle_id", activeCycle.id);

      const sumMap = (allSummaries || []).reduce((acc, s) => { acc[s.employee_id] = s; return acc; }, {} as Record<string, any>);

      for (const emp of employees) {
        const empLogs = (allLogs || []).filter(l => l.employee_id === emp.id);
        const daysPresent = empLogs.filter(l => l.attendance_status === "present" || l.attendance_status === "half_day").length;
        const totalDaily = empLogs.reduce((s, l) => s + (l.daily_cost || 0), 0);
        const totalPiece = empLogs.reduce((s, l) => s + (l.variable_item_logs || []).reduce((ss: number, il: any) => ss + (il.total_cost || 0), 0), 0);

        const existing = sumMap[emp.id] || {};
        const totalAllowances = (existing.allowance_house || 0) + (existing.allowance_travel || 0) +
          (existing.allowance_airtime || 0) + (existing.allowance_medical || 0) + (existing.allowance_seating || 0);

        const gross = totalDaily + totalPiece + totalAllowances;
        const nssf = gross * 0.05;
        const tax = gross > 235000 ? (gross - 235000) * 0.1 : 0; // simplified PAYE
        const net = gross - nssf - tax;

        await supabase.from("variable_pay_summaries").upsert({
          cycle_id: activeCycle.id,
          employee_id: emp.id,
          days_present: daysPresent,
          total_daily_pay: totalDaily,
          total_piece_pay: totalPiece,
          allowance_house: existing.allowance_house || 0,
          allowance_travel: existing.allowance_travel || 0,
          allowance_airtime: existing.allowance_airtime || 0,
          allowance_medical: existing.allowance_medical || 0,
          allowance_seating: existing.allowance_seating || 0,
          gross_pay: gross,
          tax_deduction: tax,
          nssf_employee: nssf,
          net_pay: net,
          work_log_validated: true,
        }, { onConflict: "cycle_id,employee_id" });
      }

      // Lock cycle
      await supabase.from("variable_pay_cycles").update({ status: "processed" }).eq("id", activeCycle.id);
      toast({ title: "Payroll processed!", description: "Variable pay cycle is now locked and processed." });
      fetchCycles();
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createCycle = async () => {
    if (!newCycle.cycle_name || !newCycle.period_start || !newCycle.period_end) {
      toast({ title: "Fill all cycle fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("variable_pay_cycles").insert({
      organization_id: organizationId,
      project_id: projectId || null,
      cycle_name: newCycle.cycle_name,
      period_start: newCycle.period_start,
      period_end: newCycle.period_end,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cycle created" });
    setNewCycleOpen(false);
    fetchCycles();
  };

  const totalDailyCost = useMemo(() => workRows.reduce((s, r) => s + computeDailyCost(r), 0), [workRows]);
  const totalPieceCost = useMemo(() => workRows.reduce((s, r) => s + r.item_logs.reduce((ss, il) => ss + il.total_cost, 0), 0), [workRows]);
  const totalAllowanceDay = useMemo(() => allowanceRows.reduce((s, r) => s + r.allowance_house + r.allowance_travel + r.allowance_airtime + r.allowance_medical + r.allowance_seating, 0), [allowanceRows]);
  const presentCount = useMemo(() => workRows.filter(r => r.attendance_status !== "absent").length, [workRows]);

  if (cycles.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-medium text-sm mb-2">No pay cycles yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create a pay cycle to start tracking variable pay</p>
          <Button size="sm" onClick={() => setNewCycleOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Pay Cycle
          </Button>
          <NewCycleDialog open={newCycleOpen} onOpenChange={setNewCycleOpen} value={newCycle} onChange={setNewCycle} onSave={createCycle} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cycle selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <Select value={activeCycle?.id || ""} onValueChange={id => setActiveCycle(cycles.find(c => c.id === id) || null)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select pay cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span>{c.cycle_name}</span>
                    <Badge variant={c.status === "processed" ? "default" : c.status === "locked" ? "secondary" : "outline"} className="text-xs">
                      {c.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeCycle && (
          <span className="text-xs text-muted-foreground">
            {format(parseISO(activeCycle.period_start), "MMM d")} – {format(parseISO(activeCycle.period_end), "MMM d, yyyy")}
          </span>
        )}
        <Button size="sm" variant="outline" onClick={() => setNewCycleOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Cycle
        </Button>
        {activeCycle?.status === "open" && (
          <Button size="sm" variant="default" onClick={processPayroll} disabled={saving}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Process & Lock Payroll
          </Button>
        )}
        {activeCycle?.status === "processed" && (
          <Badge className="gap-1"><Lock className="h-3 w-3" />Processed</Badge>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Present Today", value: `${presentCount}/${workRows.length}`, sub: `${workRows.length - presentCount} absent`, color: "text-green-600" },
          { icon: DollarSign, label: "Daily Labour Cost", value: fmt(totalDailyCost), sub: "attendance-based", color: "" },
          { icon: Package, label: "Piece-Rate Cost", value: fmt(totalPieceCost), sub: "items & output", color: "text-blue-600" },
          { icon: TrendingUp, label: "Total + Allowances", value: fmt(totalDailyCost + totalPieceCost + totalAllowanceDay), sub: "gross estimate", color: "text-primary" },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Daily Attendance & Items</TabsTrigger>
          <TabsTrigger value="allowances">Allowances</TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-3">
          <div className="flex items-center justify-between">
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            {activeCycle?.status === "open" && (
              <Button size="sm" onClick={saveWorkLogs} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving…" : "Save Day Logs"}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : workRows.length === 0 ? (
            <Alert><AlertDescription>No active variable-pay employees found for this project.</AlertDescription></Alert>
          ) : (
            <div className="space-y-3">
              {workRows.map((row, empIdx) => (
                <Card key={row.employee_id} className={`overflow-hidden ${row.attendance_status === "absent" ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{row.employee_name}</span>
                      <Select
                        value={row.attendance_status}
                        onValueChange={v => updateWorkRow(empIdx, "attendance_status", v)}
                        disabled={activeCycle?.status !== "open"}
                      >
                        <SelectTrigger className="h-6 w-28 text-xs border-0 bg-transparent p-0 focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {row.attendance_status !== "absent" && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">Hrs:</span>
                          <Input
                            type="number" min={0} max={24} value={row.hours_worked}
                            onChange={e => updateWorkRow(empIdx, "hours_worked", Number(e.target.value))}
                            className="h-6 w-14 text-xs p-1"
                            disabled={activeCycle?.status !== "open"}
                          />
                        </div>
                      )}
                      <span className="font-mono font-semibold text-xs">
                        Labour: {fmt(computeDailyCost(row))}
                      </span>
                      <span className="font-mono font-semibold text-xs text-blue-600">
                        Items: {fmt(row.item_logs.reduce((s, il) => s + il.total_cost, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Item Logs */}
                  {row.attendance_status !== "absent" && (
                    <div className="px-4 py-2 space-y-2">
                      {row.item_logs.map((il, logIdx) => (
                        <div key={logIdx} className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={il.catalog_item_id || "__custom__"}
                            onValueChange={v => updateItemLog(empIdx, logIdx, "catalog_item_id", v === "__custom__" ? "" : v)}
                            disabled={activeCycle?.status !== "open"}
                          >
                            <SelectTrigger className="h-7 w-44 text-xs">
                              <SelectValue placeholder="Select item…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__custom__">— Custom —</SelectItem>
                              {catalogItems.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name} ({c.unit})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!il.catalog_item_id && (
                            <Input
                              value={il.item_name}
                              onChange={e => updateItemLog(empIdx, logIdx, "item_name", e.target.value)}
                              placeholder="Item name"
                              className="h-7 text-xs w-32"
                              disabled={activeCycle?.status !== "open"}
                            />
                          )}
                          <Input
                            type="number" min={0} value={il.unit_cost}
                            onChange={e => updateItemLog(empIdx, logIdx, "unit_cost", parseFloat(e.target.value))}
                            placeholder="Unit cost"
                            className="h-7 text-xs w-24"
                            disabled={activeCycle?.status !== "open"}
                          />
                          <span className="text-xs text-muted-foreground">×</span>
                          <Input
                            type="number" min={0} step="0.01" value={il.quantity}
                            onChange={e => updateItemLog(empIdx, logIdx, "quantity", parseFloat(e.target.value))}
                            placeholder="Qty"
                            className="h-7 text-xs w-20"
                            disabled={activeCycle?.status !== "open"}
                          />
                          <span className="text-xs font-mono font-semibold w-20 text-right">{fmt(il.total_cost)}</span>
                          {activeCycle?.status === "open" && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItemLog(empIdx, logIdx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {activeCycle?.status === "open" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addItemLog(empIdx)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Item
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Allowances Tab */}
        <TabsContent value="allowances" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Set allowances applied to the full cycle (added to final gross pay)</p>
            {activeCycle?.status === "open" && (
              <Button size="sm" onClick={saveAllowances} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> Save Allowances
              </Button>
            )}
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Employee</TableHead>
                  <TableHead className="w-24">House</TableHead>
                  <TableHead className="w-24">Travel</TableHead>
                  <TableHead className="w-24">Airtime</TableHead>
                  <TableHead className="w-24">Medical</TableHead>
                  <TableHead className="w-24">Seating</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allowanceRows.map((row, i) => {
                  const emp = employees.find(e => e.id === row.employee_id);
                  const total = row.allowance_house + row.allowance_travel + row.allowance_airtime + row.allowance_medical + row.allowance_seating;
                  return (
                    <TableRow key={row.employee_id}>
                      <TableCell className="text-sm font-medium">{emp?.first_name} {emp?.last_name}</TableCell>
                      {(["allowance_house", "allowance_travel", "allowance_airtime", "allowance_medical", "allowance_seating"] as const).map(field => (
                        <TableCell key={field}>
                          <Input
                            type="number" min={0} value={row[field]}
                            onChange={e => updateAllowance(i, field, e.target.value)}
                            className="h-7 text-xs"
                            disabled={activeCycle?.status !== "open"}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-semibold text-sm">{fmt(total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <NewCycleDialog open={newCycleOpen} onOpenChange={setNewCycleOpen} value={newCycle} onChange={setNewCycle} onSave={createCycle} />
    </div>
  );
}

function NewCycleDialog({ open, onOpenChange, value, onChange, onSave }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Pay Cycle</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Cycle Name *</Label>
            <Input value={value.cycle_name} onChange={e => onChange((v: any) => ({ ...v, cycle_name: e.target.value }))} placeholder="e.g. May 2025 Variable" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Period Start *</Label>
              <Input type="date" value={value.period_start} onChange={e => onChange((v: any) => ({ ...v, period_start: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Period End *</Label>
              <Input type="date" value={value.period_end} onChange={e => onChange((v: any) => ({ ...v, period_end: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Create Cycle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
