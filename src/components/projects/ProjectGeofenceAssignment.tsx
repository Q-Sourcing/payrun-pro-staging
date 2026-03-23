import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPin, Save } from "lucide-react";
import { AttendanceService } from "@/lib/services/attendance.service";
import { useToast } from "@/hooks/use-toast";

interface Props {
  projectId: string;
  organizationId: string;
  readOnly?: boolean;
}

export function ProjectGeofenceAssignment({ projectId, organizationId, readOnly = false }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string> | null>(null);

  const { data: allGeofences = [] } = useQuery({
    queryKey: ["geofences", organizationId],
    queryFn: () => AttendanceService.getGeofences(organizationId),
    enabled: !!organizationId,
  });

  const { data: linked = [] } = useQuery({
    queryKey: ["project-geofences", projectId],
    queryFn: () => AttendanceService.getProjectGeofences(projectId),
    enabled: !!projectId,
    onSuccess: (data: any[]) => {
      if (selected === null) {
        setSelected(new Set(data.map((g: any) => g.id)));
      }
    },
  });

  const effectiveSelected = selected ?? new Set(linked.map((g: any) => g.id));

  const saveMutation = useMutation({
    mutationFn: () =>
      AttendanceService.setProjectGeofences(organizationId, projectId, Array.from(effectiveSelected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-geofences", projectId] });
      toast({ title: "Geofences saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev ?? effectiveSelected);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const typeColor: Record<string, string> = {
    office: "bg-blue-100 text-blue-700",
    site: "bg-orange-100 text-orange-700",
    client: "bg-purple-100 text-purple-700",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Site Geofences
          </CardTitle>
          <Badge variant="secondary">{effectiveSelected.size} linked</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {allGeofences.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No geofences configured. Add them in Settings → Attendance.
          </p>
        )}
        {allGeofences.map((geo: any) => (
          <div key={geo.id} className="flex items-center gap-3 py-1">
            {!readOnly && (
              <Checkbox
                id={`geo-${geo.id}`}
                checked={effectiveSelected.has(geo.id)}
                onCheckedChange={() => toggle(geo.id)}
              />
            )}
            <Label htmlFor={`geo-${geo.id}`} className="flex-1 flex items-center gap-2 cursor-pointer">
              <span className="font-medium text-sm">{geo.name}</span>
              <Badge className={`text-xs ${typeColor[geo.type] ?? "bg-gray-100 text-gray-700"}`}>
                {geo.type}
              </Badge>
              <span className="text-xs text-muted-foreground">{geo.radius_meters}m radius</span>
            </Label>
          </div>
        ))}
        {!readOnly && allGeofences.length > 0 && (
          <div className="pt-2">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
