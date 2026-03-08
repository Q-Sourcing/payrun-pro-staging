// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AttendanceService } from "@/lib/services/attendance.service";
import { supabase } from "@/integrations/supabase/client";
import { Save, Users, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import TableWrapper from "@/components/TableWrapper";

interface AdminAttendanceGridProps {
  organizationId: string;
}

const STATUSES = [
  "PRESENT", "ABSENT", "LATE", "HALF_DAY", "LEAVE", "SICK", "OFF", "PUBLIC_HOLIDAY", "REMOTE"
];

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  LATE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  HALF_DAY: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  LEAVE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SICK: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OFF: "bg-muted text-muted-foreground",
  PUBLIC_HOLIDAY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  REMOTE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export function AdminAttendanceGrid({ organizationId }: AdminAttendanceGridProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [organizationId, selectedDate]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Get employees
      const { data: emps } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('last_name');

      setEmployees(emps || []);

      // Get existing attendance for this date
      const { data: existing } = await supabase
        .from('attendance_daily_summary')
        .select('employee_id, status')
        .eq('organization_id', organizationId)
        .eq('attendance_date', selectedDate);

      const map: Record<string, string> = {};
      existing?.forEach((r: any) => { map[r.employee_id] = r.status; });
      setAttendance(map);
    } catch (err) {
      console.error("Error loading employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (empId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [empId]: status }));
  };

  const markAllPresent = () => {
    const map: Record<string, string> = {};
    employees.forEach((e) => { map[e.id] = "PRESENT"; });
    setAttendance(map);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance)
        .filter(([_, status]) => status)
        .map(([empId, status]) => ({
          organization_id: organizationId,
          employee_id: empId,
          attendance_date: selectedDate,
          status,
        }));

      if (records.length === 0) {
        toast({ title: "No records to save", variant: "destructive" });
        return;
      }

      await AttendanceService.markAttendance(records);
      toast({ title: "Attendance saved", description: `${records.length} records updated.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mark Attendance
            </CardTitle>
            <CardDescription>Mark attendance for all employees on a specific date</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark All Present
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No active employees found.</p>
        ) : (
          <TableWrapper>
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Emp No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {emp.employee_number || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={attendance[emp.id] || ""}
                      onValueChange={(val) => setStatus(emp.id, val)}
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue placeholder="Select...">
                          {attendance[emp.id] && (
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[attendance[emp.id]]}`}>
                              {attendance[emp.id].replace("_", " ")}
                            </Badge>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s]}`}>
                              {s.replace("_", " ")}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </CardContent>
    </Card>
  );
}
