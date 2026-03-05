// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Save, TrendingUp, Users, DollarSign, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  pay_rate: number;
  pay_type: string;
}

interface AttendanceRow {
  employee_id: string;
  employee_name: string;
  pay_rate: number;
  status: "present" | "absent" | "leave" | "half_day";
  hours_worked: number;
  overtime_hours: number;
  remarks: string;
  // computed
  daily_cost: number;
}

interface PieceRow {
  employee_id: string;
  employee_name: string;
  pay_rate: number;
  quantity: number;
  piece_name: string;
  status: "present" | "absent";
  // computed
  row_cost: number;
}

interface Props {
  projectId: string;
  projectName?: string;
  invoiceAmount?: number;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "leave", label: "Leave", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "half_day", label: "Half Day", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
];

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function IppmsWorkboardEnhanced({ projectId, projectName, invoiceAmount }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [pieceRows, setPieceRows] = useState<PieceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localInvoice, setLocalInvoice] = useState(invoiceAmount ?? 0);
  const { toast } = useToast();

  // Fetch project employees
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, pay_rate, pay_type")
        .eq("project_id", projectId)
        .eq("status", "active");
      if (!error && data) {
        setEmployees(data);
        initAttendanceRows(data);
        initPieceRows(data);
      }
      setLoading(false);
    })();
  }, [projectId]);

  const initAttendanceRows = (emps: Employee[]) => {
    setAttendanceRows(
      emps.map((e) => ({
        employee_id: e.id,
        employee_name: `${e.first_name} ${e.last_name}`,
        pay_rate: e.pay_rate,
        status: "present",
        hours_worked: 8,
        overtime_hours: 0,
        remarks: "",
        daily_cost: e.pay_rate,
      }))
    );
  };

  const initPieceRows = (emps: Employee[]) => {
    setPieceRows(
      emps.map((e) => ({
        employee_id: e.id,
        employee_name: `${e.first_name} ${e.last_name}`,
        pay_rate: e.pay_rate,
        quantity: 0,
        piece_name: "",
        status: "present",
        row_cost: 0,
      }))
    );
  };

  // Batch-update all attendance rows
  const updateAllStatus = (status: AttendanceRow["status"]) => {
    setAttendanceRows((rows) =>
      rows.map((r) => ({
        ...r,
        status,
        daily_cost: status === "absent" ? 0 : status === "half_day" ? r.pay_rate / 2 : r.pay_rate,
        hours_worked: status === "absent" ? 0 : status === "half_day" ? 4 : 8,
      }))
    );
  };

  const updateAttRow = (idx: number, field: keyof AttendanceRow, val: any) => {
    setAttendanceRows((rows) => {
      const updated = [...rows];
      const row = { ...updated[idx], [field]: val };
      // Recompute cost
      if (field === "status" || field === "hours_worked") {
        const hrs = field === "hours_worked" ? Number(val) : row.hours_worked;
        const st = field === "status" ? val : row.status;
        row.daily_cost = st === "absent" ? 0 : (row.pay_rate / 8) * hrs;
      }
      updated[idx] = row;
      return updated;
    });
  };

  const updatePieceRow = (idx: number, field: keyof PieceRow, val: any) => {
    setPieceRows((rows) => {
      const updated = [...rows];
      const row = { ...updated[idx], [field]: val };
      if (field === "quantity" || field === "status") {
        const qty = field === "quantity" ? Number(val) : row.quantity;
        const st = field === "status" ? val : row.status;
        row.row_cost = st === "absent" ? 0 : qty * row.pay_rate;
      }
      updated[idx] = row;
      return updated;
    });
  };

  // ── Cost totals ──
  const attPresent = useMemo(() => attendanceRows.filter((r) => r.status !== "absent"), [attendanceRows]);
  const attAbsent = useMemo(() => attendanceRows.filter((r) => r.status === "absent"), [attendanceRows]);
  const totalAttCost = useMemo(() => attPresent.reduce((s, r) => s + r.daily_cost, 0), [attPresent]);
  const totalOvertimeCost = useMemo(
    () => attendanceRows.reduce((s, r) => s + (r.overtime_hours * (r.pay_rate / 8) * 1.5), 0),
    [attendanceRows]
  );
  const grandAttTotal = totalAttCost + totalOvertimeCost;

  const piecePresent = useMemo(() => pieceRows.filter((r) => r.status !== "absent"), [pieceRows]);
  const totalPieceCost = useMemo(() => piecePresent.reduce((s, r) => s + r.row_cost, 0), [piecePresent]);
  const invoiceDiff = localInvoice - grandAttTotal;

  // Save attendance
  const saveAttendance = async () => {
    setSaving(true);
    try {
      const payload = attendanceRows.map((r) => ({
        employee_id: r.employee_id,
        attendance_date: selectedDate,
        status: r.status,
        hours_worked: r.hours_worked,
        overtime_hours: r.overtime_hours,
        remarks: r.remarks,
      }));
      const { error } = await supabase.rpc("ippms_save_attendance_bulk", {
        p_project_id: projectId,
        p_records: payload,
      });
      if (error) throw error;
      toast({ title: "Attendance saved", description: `${attPresent.length} present, ${attAbsent.length} absent.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        <Clock className="h-5 w-5 mr-2 animate-spin" />
        Loading workboard...
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No active employees assigned to this project.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">{projectName ?? "IPPMS Workboard"}</h3>
          <p className="text-sm text-muted-foreground">{employees.length} active staff</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 h-8 text-sm"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{attPresent.length}</p>
            <p className="text-xs text-muted-foreground">{attAbsent.length} absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Est. Daily Cost</span>
            </div>
            <p className="text-2xl font-bold">{fmt(grandAttTotal)}</p>
            <p className="text-xs text-muted-foreground">incl. {fmt(totalOvertimeCost)} OT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Invoice Amount</span>
            </div>
            <Input
              type="number"
              value={localInvoice}
              onChange={(e) => setLocalInvoice(Number(e.target.value))}
              className="h-7 text-sm font-bold border-0 p-0 focus-visible:ring-0"
            />
            <p className="text-xs text-muted-foreground">edit to compare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Variance</span>
            </div>
            <p className={`text-2xl font-bold ${invoiceDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
              {invoiceDiff >= 0 ? "+" : ""}{fmt(invoiceDiff)}
            </p>
            <p className="text-xs text-muted-foreground">{invoiceDiff >= 0 ? "surplus" : "deficit"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Daily Attendance</TabsTrigger>
          <TabsTrigger value="piecework">Piece Work</TabsTrigger>
        </TabsList>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Batch set all to:</span>
            {STATUS_OPTIONS.map((s) => (
              <Button key={s.value} variant="outline" size="sm" onClick={() => updateAllStatus(s.value as any)}>
                {s.label}
              </Button>
            ))}
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Hours</TableHead>
                  <TableHead className="w-24">OT Hours</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRows.map((row, idx) => (
                  <TableRow key={row.employee_id} className={row.status === "absent" ? "opacity-50" : ""}>
                    <TableCell className="font-medium text-sm">{row.employee_name}</TableCell>
                    <TableCell>
                      <Select value={row.status} onValueChange={(v) => updateAttRow(idx, "status", v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        value={row.hours_worked}
                        onChange={(e) => updateAttRow(idx, "hours_worked", e.target.value)}
                        className="h-7 text-xs w-20"
                        disabled={row.status === "absent"}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={row.overtime_hours}
                        onChange={(e) => updateAttRow(idx, "overtime_hours", e.target.value)}
                        className="h-7 text-xs w-20"
                        disabled={row.status === "absent"}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.remarks}
                        onChange={(e) => updateAttRow(idx, "remarks", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Optional"
                        disabled={row.status === "absent"}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.status === "absent" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        fmt(row.daily_cost)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-medium">
              Total:{" "}
              <span className="font-bold">{fmt(grandAttTotal)}</span>
              <span className="text-muted-foreground ml-1 text-xs">
                ({attPresent.length}/{employees.length} present)
              </span>
            </p>
            <Button onClick={saveAttendance} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </TabsContent>

        {/* ── Piece Work Tab ── */}
        <TabsContent value="piecework" className="space-y-3">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Piece / Task</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-28">Rate/unit</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieceRows.map((row, idx) => (
                  <TableRow key={row.employee_id} className={row.status === "absent" ? "opacity-50" : ""}>
                    <TableCell className="font-medium text-sm">{row.employee_name}</TableCell>
                    <TableCell>
                      <Select value={row.status} onValueChange={(v) => updatePieceRow(idx, "status", v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.piece_name}
                        onChange={(e) => updatePieceRow(idx, "piece_name", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="e.g. Harvested bags"
                        disabled={row.status === "absent"}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={row.quantity}
                        onChange={(e) => updatePieceRow(idx, "quantity", e.target.value)}
                        className="h-7 text-xs w-20"
                        disabled={row.status === "absent"}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.pay_rate}
                        onChange={(e) => updatePieceRow(idx, "pay_rate", e.target.value)}
                        className="h-7 text-xs w-24"
                        disabled={row.status === "absent"}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.status === "absent" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        fmt(row.row_cost)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-medium">
              Piece Total:{" "}
              <span className="font-bold">{fmt(totalPieceCost)}</span>
              <span className="text-muted-foreground ml-1 text-xs">
                ({piecePresent.length}/{employees.length} active)
              </span>
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
