// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceService } from "@/lib/services/attendance.service";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, Clock, Building2, Briefcase } from "lucide-react";

interface ProjectAttendanceDashboardProps {
  organizationId: string;
}

export function ProjectAttendanceDashboard({ organizationId }: ProjectAttendanceDashboardProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [organizationId]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name");
    setProjects(data || []);
  };

  useEffect(() => {
    loadSummaries();
  }, [organizationId, selectedProject]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await AttendanceService.getDailySummary(organizationId, {
        dateFrom: today,
        dateTo: today,
      });

      if (selectedProject !== "all") {
        setSummaries((data || []).filter((s: any) => s.project_id === selectedProject));
      } else {
        setSummaries(data || []);
      }
    } catch (err) {
      console.error("Error loading project summaries:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group by project
  const projectStats = useMemo(() => {
    const map: Record<string, { name: string; present: number; absent: number; late: number; total: number }> = {};

    // Add "Head Office" for records without a project
    map["head_office"] = { name: "Head Office", present: 0, absent: 0, late: 0, total: 0 };

    projects.forEach((p) => {
      map[p.id] = { name: p.name, present: 0, absent: 0, late: 0, total: 0 };
    });

    summaries.forEach((s: any) => {
      const key = s.project_id || "head_office";
      if (!map[key]) map[key] = { name: s.projects?.name || "Unknown", present: 0, absent: 0, late: 0, total: 0 };
      map[key].total++;
      if (s.status === "PRESENT" || s.status === "REMOTE") map[key].present++;
      else if (s.status === "ABSENT") map[key].absent++;
      else if (s.status === "LATE") { map[key].late++; map[key].present++; }
    });

    return Object.entries(map)
      .filter(([_, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [summaries, projects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Attendance</h3>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : projectStats.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No attendance data for today.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectStats.map(([key, stats]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {key === "head_office" ? (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  )}
                  {stats.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{stats.total}</span>
                    <span className="text-xs text-muted-foreground">staff</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-600">{stats.present}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserX className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{stats.absent}</span>
                  </div>
                  {stats.late > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-600">{stats.late}</span>
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                {stats.total > 0 && (
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(stats.present / stats.total) * 100}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${(stats.late / stats.total) * 100}%` }} />
                    <div className="bg-destructive h-full" style={{ width: `${(stats.absent / stats.total) * 100}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
