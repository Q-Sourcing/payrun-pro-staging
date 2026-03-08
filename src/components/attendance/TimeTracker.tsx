// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { TimeTrackingService } from "@/lib/services/time-tracking.service";
import { supabase } from "@/integrations/supabase/client";
import {
  Play, Square, Plus, Trash2, Clock, Timer, DollarSign,
  Briefcase, Loader2, Edit2, Check, X
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO } from "date-fns";

interface TimeTrackerProps {
  employeeId: string;
  organizationId: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatElapsed(startTime: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TimeTracker({ employeeId, organizationId }: TimeTrackerProps) {
  const [runningEntry, setRunningEntry] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [showManual, setShowManual] = useState(false);

  // Timer input
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isBillable, setIsBillable] = useState(false);

  // Manual entry
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("17:00");
  const [manualTask, setManualTask] = useState("");
  const [manualProject, setManualProject] = useState<string>("");
  const [manualBillable, setManualBillable] = useState(false);
  const [manualDescription, setManualDescription] = useState("");

  // Today's summary
  const [todaySummary, setTodaySummary] = useState({ totalMinutes: 0, billableMinutes: 0, entries: 0 });

  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadData();
    return () => clearInterval(timerRef.current);
  }, [employeeId]);

  useEffect(() => {
    if (runningEntry) {
      timerRef.current = setInterval(() => {
        setElapsed(formatElapsed(runningEntry.start_time));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed("00:00:00");
    }
    return () => clearInterval(timerRef.current);
  }, [runningEntry]);

  const loadData = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const [running, todayEntries, summary] = await Promise.all([
        TimeTrackingService.getRunningEntry(employeeId),
        TimeTrackingService.getEntries(employeeId, {
          dateFrom: today + "T00:00:00",
          dateTo: today + "T23:59:59",
        }),
        TimeTrackingService.getDailySummary(employeeId, today),
      ]);

      setRunningEntry(running);
      setEntries(todayEntries || []);
      setTodaySummary(summary);

      if (running) {
        setTaskTitle(running.task_title || "");
        setSelectedProject(running.project_id || "");
        setIsBillable(running.is_billable);
      }

      // Load projects
      const { data: prj } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("name");
      setProjects(prj || []);
    } catch (err) {
      console.error("Error loading time tracking data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!taskTitle.trim()) {
      toast({ title: "Enter a task title", variant: "destructive" });
      return;
    }
    setStarting(true);
    try {
      const result = await TimeTrackingService.startTimer({
        organization_id: organizationId,
        employee_id: employeeId,
        project_id: selectedProject || null,
        task_title: taskTitle,
        is_running: true,
        is_billable: isBillable,
        start_time: new Date().toISOString(),
      });
      setRunningEntry(result);
      toast({ title: "Timer started", description: taskTitle });
    } catch (err: any) {
      toast({ title: "Failed to start timer", description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!runningEntry) return;
    setStarting(true);
    try {
      await TimeTrackingService.stopTimer(runningEntry.id);
      setRunningEntry(null);
      setTaskTitle("");
      setSelectedProject("");
      setIsBillable(false);
      toast({ title: "Timer stopped" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to stop timer", description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualTask.trim()) {
      toast({ title: "Enter a task title", variant: "destructive" });
      return;
    }
    try {
      await TimeTrackingService.createManualEntry({
        organization_id: organizationId,
        employee_id: employeeId,
        project_id: manualProject || null,
        task_title: manualTask,
        description: manualDescription || null,
        start_time: `${manualDate}T${manualStart}:00`,
        end_time: `${manualDate}T${manualEnd}:00`,
        is_billable: manualBillable,
      });
      toast({ title: "Time entry added" });
      setManualTask("");
      setManualDescription("");
      setShowManual(false);
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to add entry", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await TimeTrackingService.deleteEntry(id);
      toast({ title: "Entry deleted" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <Card><CardContent className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Timer Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-5 w-5" /> Time Tracker
          </CardTitle>
          <CardDescription>Track hours against tasks and projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer display */}
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-mono font-bold tabular-nums ${runningEntry ? "text-emerald-600" : "text-muted-foreground"}`}>
              {elapsed}
            </div>
            {runningEntry && (
              <Badge variant="default" className="gap-1 animate-pulse bg-emerald-600">
                <div className="w-2 h-2 rounded-full bg-white" /> Recording
              </Badge>
            )}
          </div>

          {/* Task input row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="What are you working on?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              disabled={!!runningEntry}
              className="flex-1"
            />
            {projects.length > 0 && (
              <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!!runningEntry}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={isBillable}
                onCheckedChange={setIsBillable}
                disabled={!!runningEntry}
              />
              <Label className="text-xs whitespace-nowrap">
                <DollarSign className="h-3 w-3 inline" /> Billable
              </Label>
            </div>
          </div>

          {/* Start / Stop */}
          <div className="flex gap-2">
            {runningEntry ? (
              <Button onClick={handleStop} disabled={starting} variant="destructive" size="lg" className="gap-2">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Stop
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={starting} size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => setShowManual(!showManual)} className="gap-2">
              <Plus className="h-4 w-4" /> Manual Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Form */}
      {showManual && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Manual Time Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
              </div>
            </div>
            <Input
              placeholder="Task title"
              value={manualTask}
              onChange={(e) => setManualTask(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.length > 0 && (
                <Select value={manualProject} onValueChange={setManualProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={manualBillable} onCheckedChange={setManualBillable} />
                <Label className="text-xs">Billable</Label>
              </div>
            </div>
            <Textarea
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleManualEntry}>
                <Check className="h-4 w-4 mr-1" /> Save Entry
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowManual(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Today's Hours</p>
            <p className="text-xl font-bold mt-1">{formatDuration(todaySummary.totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Billable</p>
            <p className="text-xl font-bold mt-1 text-emerald-600">{formatDuration(todaySummary.billableMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-xl font-bold mt-1">{todaySummary.entries}</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No time entries today. Start the timer or add a manual entry.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${entry.is_running ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.task_title || "Untitled"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {format(new Date(entry.start_time), "HH:mm")}
                        {entry.end_time && ` – ${format(new Date(entry.end_time), "HH:mm")}`}
                      </p>
                      {entry.duration_minutes != null && !entry.is_running && (
                        <p className="text-xs text-muted-foreground">{formatDuration(entry.duration_minutes)}</p>
                      )}
                      {entry.is_running && (
                        <Badge variant="default" className="text-[10px] bg-emerald-600">Running</Badge>
                      )}
                    </div>
                    {!entry.is_running && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
