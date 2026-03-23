// @ts-nocheck
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, MapPin, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { AttendanceService } from "@/lib/services/attendance.service";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type State = "loading" | "invalid" | "ready" | "clocked_in" | "done" | "error";

export default function AttendQr() {
  const [searchParams] = useSearchParams();
  const { session } = useSupabaseAuth();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [qrCode, setQrCode] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [clockedInTime, setClockedInTime] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setErrorMsg("No token provided in the URL.");
      return;
    }
    if (!session?.user?.id) return; // wait for auth
    init();
  }, [token, session]);

  const init = async () => {
    try {
      // Resolve token
      const code = await AttendanceService.resolveQrToken(token!);
      if (!code) {
        setState("invalid");
        setErrorMsg("This QR code is invalid or has been deactivated.");
        return;
      }
      if (code.expires_at && new Date(code.expires_at) < new Date()) {
        setState("invalid");
        setErrorMsg("This QR code has expired.");
        return;
      }
      setQrCode(code);

      // Resolve employee
      const { data: emp } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", session!.user.id)
        .maybeSingle();

      if (!emp) {
        setState("error");
        setErrorMsg("No employee record found for your account. Contact your administrator.");
        return;
      }
      setEmployeeId(emp.id);
      setOrganizationId(emp.organization_id);

      // Check if already clocked in on this project
      const { data: logs } = await supabase
        .from("attendance_time_logs")
        .select("*")
        .eq("employee_id", emp.id)
        .eq("project_id", code.project_id)
        .is("clock_out_utc", null)
        .limit(1)
        .maybeSingle();

      if (logs) {
        setActiveLog(logs);
        setState("clocked_in");
      } else {
        setState("ready");
      }
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleClockIn = async () => {
    if (!employeeId || !organizationId || !qrCode) return;
    setActionLoading(true);
    try {
      const policy = await AttendanceService.getProjectPolicy(qrCode.project_id);
      let latitude: number | null = null;
      let longitude: number | null = null;
      let geofenceId: string | null = qrCode.geofence_id ?? null;

      if (policy?.require_geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;

        const validation = await AttendanceService.validateAgainstProjectGeofences(
          qrCode.project_id,
          latitude,
          longitude
        );
        if (!validation.valid) {
          throw new Error(
            `You are ${validation.distance}m outside the site boundary. Please move closer and try again.`
          );
        }
        geofenceId = validation.geofence?.id ?? geofenceId;
      }

      const log = await AttendanceService.qrClockIn({
        organizationId,
        employeeId,
        projectId: qrCode.project_id,
        geofenceId,
        latitude,
        longitude,
        qrCodeId: qrCode.id,
      });

      setActiveLog(log);
      setClockedInTime(log.clock_in_utc);
      setState("clocked_in");
      toast({ title: "Clocked in successfully" });
    } catch (err: any) {
      toast({ title: "Clock-in failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeLog) return;
    setActionLoading(true);
    try {
      const now = new Date();
      const timezone = activeLog.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localNow = now.toLocaleString("sv-SE", { timeZone: timezone }).replace(" ", "T");
      await AttendanceService.clockOut(activeLog.id, now.toISOString(), localNow);
      setActiveLog(null);
      setState("done");
      toast({ title: "Clocked out successfully" });
    } catch (err: any) {
      toast({ title: "Clock-out failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const projectName = qrCode?.projects?.name ?? "Project";
  const geofenceName = qrCode?.geofences?.name;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        {/* Invalid / error */}
        {(state === "invalid" || state === "error") && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
              <CardTitle>Cannot Check In</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
          </>
        )}

        {/* Loading */}
        {state === "loading" && (
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        )}

        {/* Ready to clock in */}
        {state === "ready" && (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{projectName}</CardTitle>
              {geofenceName && (
                <CardDescription className="flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {geofenceName}
                </CardDescription>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(), "EEEE, d MMMM · HH:mm")}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-2">
              <Badge className="bg-slate-100 text-slate-600">Not clocked in</Badge>
              <Button
                size="lg"
                className="w-full h-14 text-base"
                onClick={handleClockIn}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-5 w-5 mr-2" />
                )}
                Clock In
              </Button>
            </CardContent>
          </>
        )}

        {/* Clocked in */}
        {state === "clocked_in" && (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{projectName}</CardTitle>
              {geofenceName && (
                <CardDescription className="flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {geofenceName}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-2">
              <Badge className="bg-green-100 text-green-700">
                Clocked in{activeLog?.clock_in_utc ? ` at ${format(new Date(activeLog.clock_in_utc), "HH:mm")}` : ""}
              </Badge>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-base border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleClockOut}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-5 w-5 mr-2" />
                )}
                Clock Out
              </Button>
            </CardContent>
          </>
        )}

        {/* Done */}
        {state === "done" && (
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-medium">Clocked out — have a good day!</p>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
