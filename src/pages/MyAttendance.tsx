// @ts-nocheck
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelfCheckIn } from "@/components/attendance/SelfCheckIn";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { RegularizationPanel } from "@/components/attendance/RegularizationPanel";
import { AttendanceService } from "@/lib/services/attendance.service";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Clock, Calendar, FileText, AlertCircle, ChevronLeft, ChevronRight, AlarmClock, UserX, Timer } from "lucide-react";
import { TimeTracker } from "@/components/attendance/TimeTracker";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Link } from "react-router-dom";

export default function MyAttendance() {
  const { session } = useSupabaseAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);

  // Regularization form
  const [regDate, setRegDate] = useState("");
  const [regClockIn, setRegClockIn] = useState("");
  const [regClockOut, setRegClockOut] = useState("");
  const [regReason, setRegReason] = useState("");

  useEffect(() => {
    loadEmployee();
  }, [session]);

  const loadEmployee = async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (emp) {
        setEmployeeId(emp.id);
        setOrganizationId(emp.organization_id);
      } else {
        // Try getting org from user_profiles for admin users
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("id", session.user.id)
          .maybeSingle();
        if (prof?.organization_id) {
          setOrganizationId(prof.organization_id);
        }
      }
    } catch (err) {
      console.error("Error loading employee:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadRecords();
      loadTimeLogs();
    }
  }, [employeeId, currentMonth]);

  const loadRecords = async () => {
    if (!employeeId) return;
    try {
      const from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const to = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const data = await AttendanceService.getMyDailySummary(employeeId, from, to);
      setRecords(data || []);
    } catch (err) {
      console.error("Error loading records:", err);
    }
  };

  const loadTimeLogs = async () => {
    if (!employeeId || !organizationId) return;
    try {
      const from = format(startOfMonth(currentMonth), "yyyy-MM-dd") + "T00:00:00";
      const to = format(endOfMonth(currentMonth), "yyyy-MM-dd") + "T23:59:59";
      const data = await AttendanceService.getTimeLogs(organizationId, {
        employeeId,
        dateFrom: from,
        dateTo: to,
      });
      setTimeLogs(data || []);
    } catch (err) {
      console.error("Error loading time logs:", err);
    }
  };

  const handleRegularization = async () => {
    if (!employeeId || !organizationId || !regDate || !regClockIn || !regClockOut || !regReason) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    try {
      await AttendanceService.createRegularizationRequest({
        organization_id: organizationId,
        employee_id: employeeId,
        attendance_date: regDate,
        requested_clock_in: `${regDate}T${regClockIn}:00`,
        requested_clock_out: `${regDate}T${regClockOut}:00`,
        reason: regReason,
      });
      toast({ title: "Request submitted" });
      setRegDate(""); setRegClockIn(""); setRegClockOut(""); setRegReason("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-6"><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>;
  }

  // If user is admin without employee profile, show admin redirect
  if (!employeeId && organizationId) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Time & Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your attendance, clock in/out, and manage timesheets</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">No Employee Profile</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your account doesn't have an employee profile linked. As an admin, you can manage attendance for all employees.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link to="/attendance">
                <Button>Go to Attendance Management</Button>
              </Link>
              <Link to="/timesheets">
                <Button variant="outline">
                  <AlarmClock className="h-4 w-4 mr-2" /> My Timesheets
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No employee profile linked to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Time & Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your attendance, clock in/out, and manage timesheets</p>
      </div>

      <Tabs defaultValue="checkin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checkin" className="gap-1.5">
            <Clock className="h-4 w-4" /> Check-In
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-4 w-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <FileText className="h-4 w-4" /> History
          </TabsTrigger>
          <TabsTrigger value="regularization" className="gap-1.5">
            <AlertCircle className="h-4 w-4" /> Corrections
          </TabsTrigger>
          <TabsTrigger value="timesheets" className="gap-1.5">
            <AlarmClock className="h-4 w-4" /> Timesheets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <SelfCheckIn employeeId={employeeId} organizationId={organizationId!} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <AttendanceCalendar records={records} month={currentMonth} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance History</CardTitle>
              <CardDescription>Your recent clock-in/out records</CardDescription>
            </CardHeader>
            <CardContent>
              {timeLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No attendance records found for this month.</p>
              ) : (
                <div className="space-y-2">
                  {timeLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(log.clock_in_utc), "EEE, dd MMM yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.projects?.name || "No project"}
                            {log.attendance_mode && ` • ${log.attendance_mode.replace("_", " ")}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(log.clock_in_utc), "HH:mm")}
                          {log.clock_out_utc && ` — ${format(new Date(log.clock_out_utc), "HH:mm")}`}
                        </p>
                        {log.clock_out_utc && (
                          <p className="text-xs text-muted-foreground">
                            {((new Date(log.clock_out_utc).getTime() - new Date(log.clock_in_utc).getTime()) / 3600000).toFixed(1)}h
                          </p>
                        )}
                        {!log.clock_out_utc && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Active</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regularization" className="space-y-4">
          {/* Submit new request */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit Correction Request</CardTitle>
              <CardDescription>Forgot to clock in? Submit a regularization request for approval.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Clock In</label>
                  <Input type="time" value={regClockIn} onChange={(e) => setRegClockIn(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Clock Out</label>
                  <Input type="time" value={regClockOut} onChange={(e) => setRegClockOut(e.target.value)} />
                </div>
              </div>
              <Textarea
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
                placeholder="Reason for correction..."
                rows={2}
              />
              <Button size="sm" onClick={handleRegularization}>Submit Request</Button>
            </CardContent>
          </Card>

          <RegularizationPanel
            organizationId={organizationId!}
            mode="employee"
            employeeId={employeeId}
          />
        </TabsContent>

        <TabsContent value="timesheets">
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <AlarmClock className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Timesheets</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage your weekly timesheets. Timesheet entries can be pre-populated from your attendance records.
                </p>
              </div>
              <Link to="/timesheets">
                <Button>
                  <AlarmClock className="h-4 w-4 mr-2" /> Open Timesheets
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
