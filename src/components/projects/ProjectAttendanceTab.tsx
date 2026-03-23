import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, LogOut, Clock, Users } from "lucide-react";
import { AttendanceService } from "@/lib/services/attendance.service";
import { EmployeesService } from "@/lib/data/employees.service";
import { ProjectAttendancePolicyCard } from "./ProjectAttendancePolicyCard";
import { ProjectGeofenceAssignment } from "./ProjectGeofenceAssignment";
import { QrCodeManagerPanel } from "./QrCodeManagerPanel";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  projectId: string;
  organizationId: string;
  currentUserId: string;
  canManage: boolean;
}

function formatTime(utc: string | null | undefined) {
  if (!utc) return "—";
  return new Date(utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(utc: string) {
  return new Date(utc).toLocaleDateString([], { month: "short", day: "numeric" });
}

function hoursLabel(clockIn: string, clockOut: string | null | undefined) {
  if (!clockOut) return "—";
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000;
  return `${diff.toFixed(1)}h`;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "MANAGER_CHECKIN")
    return <Badge className="bg-orange-100 text-orange-700 text-xs">Manager</Badge>;
  if (source === "QR_CHECKIN")
    return <Badge className="bg-green-100 text-green-700 text-xs">QR</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 text-xs">Self</Badge>;
}

export function ProjectAttendanceTab({ projectId, organizationId, currentUserId, canManage }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loadingEmployee, setLoadingEmployee] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: policy } = useQuery({
    queryKey: ["project-policy", projectId],
    queryFn: () => AttendanceService.getProjectPolicy(projectId),
    enabled: !!projectId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["project-employees", projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId),
    enabled: !!projectId,
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: ["project-today-logs", projectId, today],
    queryFn: () =>
      AttendanceService.getTimeLogs(organizationId, {
        projectId,
        dateFrom: `${today}T00:00:00.000Z`,
        dateTo: `${today}T23:59:59.999Z`,
      }),
    enabled: !!projectId && !!organizationId,
  });

  const { data: historyLogs = [] } = useQuery({
    queryKey: ["project-history-logs", projectId],
    queryFn: () =>
      AttendanceService.getTimeLogs(organizationId, {
        projectId,
        dateFrom: sevenDaysAgo,
      }),
    enabled: !!projectId && !!organizationId,
  });

  const clockInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let geofenceId: string | null = null;

      if (policy?.require_geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        const validation = await AttendanceService.validateAgainstProjectGeofences(projectId, latitude, longitude);
        if (!validation.valid) {
          throw new Error(`Outside geofence (${validation.distance}m away). Must be within the site boundary.`);
        }
        geofenceId = validation.geofence?.id ?? null;
      }

      return AttendanceService.managerClockIn({
        organizationId,
        employeeId,
        projectId,
        managerId: currentUserId,
        latitude,
        longitude,
        geofenceId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-today-logs", projectId, today] });
      qc.invalidateQueries({ queryKey: ["project-history-logs", projectId] });
      toast({ title: "Clocked in" });
      setLoadingEmployee(null);
    },
    onError: (err: any) => {
      toast({ title: "Clock-in failed", description: err.message, variant: "destructive" });
      setLoadingEmployee(null);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: (employeeId: string) =>
      AttendanceService.managerClockOut(employeeId, projectId, currentUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-today-logs", projectId, today] });
      qc.invalidateQueries({ queryKey: ["project-history-logs", projectId] });
      toast({ title: "Clocked out" });
      setLoadingEmployee(null);
    },
    onError: (err: any) => {
      toast({ title: "Clock-out failed", description: err.message, variant: "destructive" });
      setLoadingEmployee(null);
    },
  });

  // Map employee_id → their active log today
  const activeLogMap = new Map<string, any>();
  for (const log of todayLogs as any[]) {
    if (!log.clock_out_utc) {
      activeLogMap.set(log.employee_id, log);
    }
  }

  return (
    <div className="space-y-6">
      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectAttendancePolicyCard projectId={projectId} organizationId={organizationId} />
        <ProjectGeofenceAssignment projectId={projectId} organizationId={organizationId} />
      </div>

      {/* Today's attendance */}
      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Today's Attendance
              <Badge variant="secondary">{today}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No staff assigned to this project.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clocked In</TableHead>
                    <TableHead>Clocked Out</TableHead>
                    {policy?.require_manager_checkin && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp: any) => {
                    const activeLog = activeLogMap.get(emp.id);
                    const todayLog = (todayLogs as any[]).find(l => l.employee_id === emp.id);
                    const isClockedIn = !!activeLog;
                    const isClockedOut = !!todayLog?.clock_out_utc;

                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.first_name} {emp.last_name}
                          {emp.employee_number && (
                            <span className="text-xs text-muted-foreground ml-1">#{emp.employee_number}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isClockedOut ? (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">Done</Badge>
                          ) : isClockedIn ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">Clocked In</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 text-xs">Not In</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatTime(todayLog?.clock_in_utc)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatTime(todayLog?.clock_out_utc)}
                        </TableCell>
                        {policy?.require_manager_checkin && (
                          <TableCell>
                            {!isClockedIn && !isClockedOut ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loadingEmployee === emp.id}
                                onClick={() => {
                                  setLoadingEmployee(emp.id);
                                  clockInMutation.mutate(emp.id);
                                }}
                              >
                                <LogIn className="h-3 w-3 mr-1" />
                                Clock In
                              </Button>
                            ) : isClockedIn ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loadingEmployee === emp.id}
                                onClick={() => {
                                  setLoadingEmployee(emp.id);
                                  clockOutMutation.mutate(emp.id);
                                }}
                              >
                                <LogOut className="h-3 w-3 mr-1" />
                                Clock Out
                              </Button>
                            ) : null}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7-day history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Time Logs (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(historyLogs as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">No time logs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historyLogs as any[]).slice(0, 50).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {log.employees?.first_name} {log.employees?.last_name}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(log.clock_in_utc)}</TableCell>
                    <TableCell className="text-sm">{formatTime(log.clock_in_utc)}</TableCell>
                    <TableCell className="text-sm">{formatTime(log.clock_out_utc)}</TableCell>
                    <TableCell className="text-sm">{hoursLabel(log.clock_in_utc, log.clock_out_utc)}</TableCell>
                    <TableCell><SourceBadge source={log.recorded_source} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Code manager */}
      {canManage && (
        <QrCodeManagerPanel
          projectId={projectId}
          organizationId={organizationId}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
