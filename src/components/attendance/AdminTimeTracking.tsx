// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TimeTrackingService } from "@/lib/services/time-tracking.service";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Briefcase, Clock, DollarSign } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface AdminTimeTrackingProps {
  organizationId: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function AdminTimeTracking({ organizationId }: AdminTimeTrackingProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterFrom, setFilterFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));

  useEffect(() => {
    loadMeta();
  }, [organizationId]);

  useEffect(() => {
    loadEntries();
  }, [organizationId, filterEmployee, filterProject, filterFrom, filterTo]);

  const loadMeta = async () => {
    const [{ data: emp }, { data: prj }] = await Promise.all([
      supabase.from("employees").select("id, first_name, last_name, employee_number").eq("organization_id", organizationId).order("first_name"),
      supabase.from("projects").select("id, name").eq("organization_id", organizationId).order("name"),
    ]);
    setEmployees(emp || []);
    setProjects(prj || []);
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await TimeTrackingService.getOrgEntries(organizationId, {
        dateFrom: filterFrom + "T00:00:00",
        dateTo: filterTo + "T23:59:59",
        employeeId: filterEmployee || undefined,
        projectId: filterProject || undefined,
      });
      setEntries(data || []);
    } catch (err) {
      console.error("Error loading time entries:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const billableMinutes = entries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Employee</label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All employees</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.first_name} {e.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-xl font-bold mt-1">{formatDuration(totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Billable</p>
            <p className="text-xl font-bold mt-1 text-emerald-600">{formatDuration(billableMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-xl font-bold mt-1">{entries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Time Entries</CardTitle>
          <CardDescription>All tracked time for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No time entries found for the selected filters.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${entry.is_running ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.task_title || "Untitled"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.employees?.first_name} {entry.employees?.last_name}</span>
                        {entry.projects?.name && (
                          <span className="flex items-center gap-0.5">
                            <Briefcase className="h-3 w-3" /> {entry.projects.name}
                          </span>
                        )}
                        {entry.is_billable && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-emerald-500 text-emerald-600">$</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono">
                      {format(new Date(entry.start_time), "dd MMM HH:mm")}
                      {entry.end_time && ` – ${format(new Date(entry.end_time), "HH:mm")}`}
                    </p>
                    {entry.duration_minutes != null && !entry.is_running && (
                      <p className="text-xs text-muted-foreground">{formatDuration(entry.duration_minutes)}</p>
                    )}
                    {entry.is_running && (
                      <Badge variant="default" className="text-[10px] bg-emerald-600">Running</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
