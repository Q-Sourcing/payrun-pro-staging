// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AttendanceService } from "@/lib/services/attendance.service";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Settings, MapPin, Clock, Shield, Plus, Trash2, Save, Loader2 } from "lucide-react";
import TableWrapper from "@/components/TableWrapper";

const TIMEZONES = [
  "Africa/Kampala", "Africa/Nairobi", "Africa/Kigali",
  "Europe/London", "America/New_York", "America/Chicago",
  "Asia/Dubai", "Asia/Kolkata",
];

export function AttendanceSettingsSection() {
  const { session } = useSupabaseAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // New geofence form
  const [newGeo, setNewGeo] = useState({ name: "", country: "", latitude: "", longitude: "", radius_meters: "200", type: "office" });
  // New shift form
  const [newShift, setNewShift] = useState({ name: "", start_time: "08:00", end_time: "17:00", timezone: "Africa/Kampala", grace_period_minutes: "15", break_minutes: "60", overtime_threshold: "8" });

  useEffect(() => {
    loadOrg();
  }, [session]);

  const loadOrg = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data?.organization_id) {
      setOrgId(data.organization_id);
      await loadData(data.organization_id);
    }
    setLoading(false);
  };

  const loadData = async (id: string) => {
    const [pol, geos, shfts] = await Promise.all([
      AttendanceService.getPolicy(id),
      AttendanceService.getGeofences(id),
      AttendanceService.getShifts(id),
    ]);
    setPolicy(pol || {
      organization_id: id,
      grace_period_minutes: 15,
      late_threshold_minutes: 30,
      half_day_hours: 4,
      overtime_enabled: false,
      overtime_threshold_hours: 8,
      regularization_enabled: true,
      regularization_auto_approve: false,
      require_geolocation: false,
      geofence_radius_meters: 200,
      allow_self_checkin: true,
      work_start_time: "08:00",
      work_end_time: "17:00",
      default_timezone: "Africa/Kampala",
    });
    setGeofences(geos || []);
    setShifts(shfts || []);
  };

  const savePolicy = async () => {
    if (!orgId || !policy) return;
    setSaving(true);
    try {
      await AttendanceService.upsertPolicy({ ...policy, organization_id: orgId });
      toast({ title: "Policy saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addGeofence = async () => {
    if (!orgId || !newGeo.name || !newGeo.latitude || !newGeo.longitude) return;
    try {
      await AttendanceService.createGeofence({
        organization_id: orgId,
        name: newGeo.name,
        country: newGeo.country || null,
        latitude: parseFloat(newGeo.latitude),
        longitude: parseFloat(newGeo.longitude),
        radius_meters: parseInt(newGeo.radius_meters) || 200,
        type: newGeo.type,
        is_active: true,
      });
      toast({ title: "Geofence added" });
      setNewGeo({ name: "", country: "", latitude: "", longitude: "", radius_meters: "200", type: "office" });
      await loadData(orgId);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const deleteGeofence = async (id: string) => {
    if (!orgId) return;
    await AttendanceService.deleteGeofence(id);
    toast({ title: "Geofence deleted" });
    await loadData(orgId);
  };

  const addShift = async () => {
    if (!orgId || !newShift.name) return;
    try {
      await AttendanceService.createShift({
        organization_id: orgId,
        name: newShift.name,
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        timezone: newShift.timezone,
        grace_period_minutes: parseInt(newShift.grace_period_minutes) || 15,
        overtime_threshold: parseFloat(newShift.overtime_threshold) || 8,
        break_minutes: parseInt(newShift.break_minutes) || 60,
        is_default: false,
        is_active: true,
      });
      toast({ title: "Shift created" });
      setNewShift({ name: "", start_time: "08:00", end_time: "17:00", timezone: "Africa/Kampala", grace_period_minutes: "15", break_minutes: "60", overtime_threshold: "8" });
      await loadData(orgId);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const deleteShift = async (id: string) => {
    if (!orgId) return;
    await AttendanceService.deleteShift(id);
    toast({ title: "Shift deleted" });
    await loadData(orgId);
  };

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="policy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policy" className="gap-1.5"><Settings className="h-4 w-4" /> Policy</TabsTrigger>
          <TabsTrigger value="geofences" className="gap-1.5"><MapPin className="h-4 w-4" /> Geofences</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5"><Clock className="h-4 w-4" /> Shifts</TabsTrigger>
        </TabsList>

        {/* POLICY TAB */}
        <TabsContent value="policy">
          {policy && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Policy</CardTitle>
                <CardDescription>Configure attendance rules for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Grace Period (minutes)</Label>
                    <Input type="number" value={policy.grace_period_minutes} onChange={(e) => setPolicy({ ...policy, grace_period_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Late Threshold (minutes)</Label>
                    <Input type="number" value={policy.late_threshold_minutes} onChange={(e) => setPolicy({ ...policy, late_threshold_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Half Day Hours</Label>
                    <Input type="number" value={policy.half_day_hours} onChange={(e) => setPolicy({ ...policy, half_day_hours: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max Late Per Month</Label>
                    <Input type="number" value={policy.max_late_per_month || ""} onChange={(e) => setPolicy({ ...policy, max_late_per_month: parseInt(e.target.value) || null })} placeholder="Unlimited" />
                  </div>
                  <div>
                    <Label>Work Start Time</Label>
                    <Input type="time" value={policy.work_start_time} onChange={(e) => setPolicy({ ...policy, work_start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Work End Time</Label>
                    <Input type="time" value={policy.work_end_time} onChange={(e) => setPolicy({ ...policy, work_end_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Default Timezone</Label>
                    <Select value={policy.default_timezone} onValueChange={(val) => setPolicy({ ...policy, default_timezone: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Geofence Radius (meters)</Label>
                    <Input type="number" value={policy.geofence_radius_meters} onChange={(e) => setPolicy({ ...policy, geofence_radius_meters: parseInt(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "allow_self_checkin", label: "Allow Self Check-in" },
                    { key: "require_geolocation", label: "Require Geolocation" },
                    { key: "overtime_enabled", label: "Enable Overtime Tracking" },
                    { key: "regularization_enabled", label: "Enable Regularization" },
                    { key: "regularization_auto_approve", label: "Auto-Approve Regularizations" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <Label>{label}</Label>
                      <Switch checked={policy[key]} onCheckedChange={(val) => setPolicy({ ...policy, [key]: val })} />
                    </div>
                  ))}
                </div>

                <Button onClick={savePolicy} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Policy
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GEOFENCES TAB */}
        <TabsContent value="geofences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Geofence</CardTitle>
              <CardDescription>Define allowed clock-in locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Name" value={newGeo.name} onChange={(e) => setNewGeo({ ...newGeo, name: e.target.value })} />
                <Input placeholder="Country" value={newGeo.country} onChange={(e) => setNewGeo({ ...newGeo, country: e.target.value })} />
                <Select value={newGeo.type} onValueChange={(val) => setNewGeo({ ...newGeo, type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Latitude" type="number" step="any" value={newGeo.latitude} onChange={(e) => setNewGeo({ ...newGeo, latitude: e.target.value })} />
                <Input placeholder="Longitude" type="number" step="any" value={newGeo.longitude} onChange={(e) => setNewGeo({ ...newGeo, longitude: e.target.value })} />
                <Input placeholder="Radius (m)" type="number" value={newGeo.radius_meters} onChange={(e) => setNewGeo({ ...newGeo, radius_meters: e.target.value })} />
              </div>
              <Button className="mt-3" size="sm" onClick={addGeofence}><Plus className="h-4 w-4 mr-1" /> Add Geofence</Button>
            </CardContent>
          </Card>

          {geofences.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Existing Geofences</CardTitle></CardHeader>
              <CardContent>
                <TableWrapper>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Country</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Coordinates</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Radius</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geofences.map((g) => (
                      <tr key={g.id} className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-sm font-medium">{g.name}</td>
                        <td className="px-4 py-2.5 text-sm">{g.country || "—"}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs capitalize">{g.type}</Badge></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{g.latitude}, {g.longitude}</td>
                        <td className="px-4 py-2.5 text-sm">{g.radius_meters}m</td>
                        <td className="px-4 py-2.5">
                          <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => deleteGeofence(g.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SHIFTS TAB */}
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Shift</CardTitle>
              <CardDescription>Define work shifts with timezone support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Shift Name" value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} />
                <Input type="time" value={newShift.start_time} onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })} />
                <Input type="time" value={newShift.end_time} onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })} />
                <Select value={newShift.timezone} onValueChange={(val) => setNewShift({ ...newShift, timezone: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Grace (min)" type="number" value={newShift.grace_period_minutes} onChange={(e) => setNewShift({ ...newShift, grace_period_minutes: e.target.value })} />
                <Input placeholder="Break (min)" type="number" value={newShift.break_minutes} onChange={(e) => setNewShift({ ...newShift, break_minutes: e.target.value })} />
              </div>
              <Button className="mt-3" size="sm" onClick={addShift}><Plus className="h-4 w-4 mr-1" /> Add Shift</Button>
            </CardContent>
          </Card>

          {shifts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Existing Shifts</CardTitle></CardHeader>
              <CardContent>
                <TableWrapper>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Start</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">End</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Timezone</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Grace</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-sm font-medium">{s.name}</td>
                        <td className="px-4 py-2.5 text-sm">{s.start_time}</td>
                        <td className="px-4 py-2.5 text-sm">{s.end_time}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.timezone}</td>
                        <td className="px-4 py-2.5 text-sm">{s.grace_period_minutes}min</td>
                        <td className="px-4 py-2.5">
                          <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => deleteShift(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
