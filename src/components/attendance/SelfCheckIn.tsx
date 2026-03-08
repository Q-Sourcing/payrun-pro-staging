// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AttendanceService, haversineDistance } from "@/lib/services/attendance.service";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, LogIn, LogOut, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface SelfCheckInProps {
  employeeId: string;
  organizationId: string;
}

export function SelfCheckIn({ employeeId, organizationId }: SelfCheckInProps) {
  const [activeLog, setActiveLog] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [policy, setPolicy] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [employeeId, organizationId]);

  const loadData = async () => {
    try {
      const [log, pol] = await Promise.all([
        AttendanceService.getActiveClockIn(employeeId),
        AttendanceService.getPolicy(organizationId),
      ]);
      setActiveLog(log);
      setPolicy(pol);

      // Load projects for selector
      const { data: prj } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name');
      setProjects(prj || []);
    } catch (err) {
      console.error('Error loading check-in data:', err);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLoading(false);
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(coords);
          setGeoError(null);
          resolve(coords);
        },
        (err) => {
          setGeoLoading(false);
          setGeoError(err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      let geofenceId: string | undefined;

      if (policy?.require_geolocation) {
        const coords = await getLocation();
        lat = coords.lat;
        lng = coords.lng;

        const validation = await AttendanceService.validateGeofence(
          employeeId, lat, lng, organizationId
        );
        if (!validation.valid) {
          toast({
            title: "Outside geofence",
            description: `You are ${validation.distance}m from the nearest allowed location.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        geofenceId = validation.geofence?.id;
      } else {
        try {
          const coords = await getLocation();
          lat = coords.lat;
          lng = coords.lng;
        } catch {
          // GPS optional
        }
      }

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date().toISOString();

      await AttendanceService.clockIn({
        organization_id: organizationId,
        employee_id: employeeId,
        project_id: selectedProject || null,
        clock_in_utc: now,
        timezone: tz,
        local_clock_in: now,
        attendance_mode: 'MOBILE_GPS',
        latitude: lat ?? null,
        longitude: lng ?? null,
        geofence_id: geofenceId ?? null,
        recorded_source: 'SELF_CHECKIN',
        remarks: remarks || null,
      });

      toast({ title: "Clocked in!", description: `At ${format(new Date(), 'HH:mm')}` });
      setRemarks("");
      await loadData();
    } catch (err: any) {
      toast({ title: "Clock-in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await AttendanceService.clockOut(activeLog.id, now, now);
      toast({ title: "Clocked out!", description: `At ${format(new Date(), 'HH:mm')}` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Clock-out failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = !!activeLog;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Self Check-In
        </CardTitle>
        <CardDescription>
          {isClockedIn
            ? `Clocked in since ${format(new Date(activeLog.clock_in_utc), 'HH:mm')}`
            : "Clock in to start your day"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge variant={isClockedIn ? "default" : "secondary"} className="gap-1">
            {isClockedIn ? (
              <><CheckCircle2 className="h-3 w-3" /> Clocked In</>
            ) : (
              <><AlertTriangle className="h-3 w-3" /> Not Clocked In</>
            )}
          </Badge>
          {position && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              GPS Captured
            </Badge>
          )}
        </div>

        {!isClockedIn && (
          <>
            {/* Project selector */}
            {projects.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Project (optional)
                </label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Remarks (optional)
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>
          </>
        )}

        {geoError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Location error: {geoError}
          </p>
        )}

        {/* Action button */}
        <Button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading || geoLoading}
          className="w-full"
          variant={isClockedIn ? "destructive" : "default"}
          size="lg"
        >
          {loading || geoLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
          ) : isClockedIn ? (
            <><LogOut className="h-4 w-4 mr-2" /> Clock Out</>
          ) : (
            <><LogIn className="h-4 w-4 mr-2" /> Clock In</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
