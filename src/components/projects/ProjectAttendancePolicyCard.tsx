import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Save } from "lucide-react";
import { AttendanceService, ProjectAttendancePolicy } from "@/lib/services/attendance.service";
import { useToast } from "@/hooks/use-toast";

interface Props {
  projectId: string;
  organizationId: string;
}

const DEFAULTS: Omit<ProjectAttendancePolicy, "id"> = {
  organization_id: "",
  project_id: "",
  attendance_required: true,
  allow_self_checkin: true,
  require_manager_checkin: false,
  require_geolocation: false,
  primary_geofence_id: null,
};

export function ProjectAttendancePolicyCard({ projectId, organizationId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectAttendancePolicy>({
    ...DEFAULTS,
    organization_id: organizationId,
    project_id: projectId,
  });
  const [dirty, setDirty] = useState(false);

  const { data: policy } = useQuery({
    queryKey: ["project-policy", projectId],
    queryFn: () => AttendanceService.getProjectPolicy(projectId),
    enabled: !!projectId,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ["project-geofences", projectId],
    queryFn: () => AttendanceService.getProjectGeofences(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (policy) {
      setForm({ ...DEFAULTS, ...policy, organization_id: organizationId, project_id: projectId });
      setDirty(false);
    }
  }, [policy, organizationId, projectId]);

  const update = (key: keyof ProjectAttendancePolicy, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // If manager check-in required, disable self check-in
      if (key === "require_manager_checkin" && value === true) {
        next.allow_self_checkin = false;
      }
      return next;
    });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => AttendanceService.upsertProjectPolicy(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-policy", projectId] });
      setDirty(false);
      toast({ title: "Attendance policy saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save policy", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Attendance Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Attendance tracking required</Label>
            <p className="text-xs text-muted-foreground">Staff must record attendance for this project</p>
          </div>
          <Switch
            checked={form.attendance_required}
            onCheckedChange={v => update("attendance_required", v)}
          />
        </div>

        {form.attendance_required && (
          <>
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Allow self check-in</Label>
                  <p className="text-xs text-muted-foreground">Staff can clock in themselves</p>
                </div>
                <Switch
                  checked={form.allow_self_checkin}
                  disabled={form.require_manager_checkin}
                  onCheckedChange={v => update("allow_self_checkin", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Require manager check-in</Label>
                  <p className="text-xs text-muted-foreground">Only a manager can clock staff in/out</p>
                </div>
                <Switch
                  checked={form.require_manager_checkin}
                  onCheckedChange={v => update("require_manager_checkin", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Require GPS / geofence</Label>
                  <p className="text-xs text-muted-foreground">Location must be within a linked geofence</p>
                </div>
                <Switch
                  checked={form.require_geolocation}
                  onCheckedChange={v => update("require_geolocation", v)}
                />
              </div>
            </div>

            {geofences.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Primary geofence (optional)</Label>
                <Select
                  value={form.primary_geofence_id ?? "__none__"}
                  onValueChange={v => update("primary_geofence_id", v === "__none__" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Any linked geofence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any linked geofence</SelectItem>
                    {geofences.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <div className="pt-1">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
          >
            <Save className="h-3 w-3 mr-1" />
            Save policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
