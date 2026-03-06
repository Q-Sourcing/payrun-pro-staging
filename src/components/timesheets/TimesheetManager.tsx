import { useState, useMemo } from "react";
import { useMyTimesheets, useUpsertTimesheet, useSaveEntry, useDeleteEntry, useSubmitTimesheet, useDepartments, Timesheet } from "./useTimesheets";
import { TimesheetEntryRow } from "./TimesheetEntryRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  SendHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  ClockIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Clock, variant: "secondary" as const },
  submitted: { label: "Submitted", icon: ClockIcon, variant: "default" as const },
  approved: { label: "Approved", icon: CheckCircle2, variant: "default" as const },
  rejected: { label: "Rejected", icon: XCircle, variant: "destructive" as const },
};

function getWeekBounds() {
  const now = new Date();
  const s = startOfWeek(now, { weekStartsOn: 1 });
  const e = endOfWeek(now, { weekStartsOn: 1 });
  return {
    start: format(s, "yyyy-MM-dd"),
    end: format(e, "yyyy-MM-dd"),
  };
}

export function TimesheetManager() {
  const { data: timesheets = [], isLoading } = useMyTimesheets();
  const upsert = useUpsertTimesheet();
  const saveEntry = useSaveEntry();
  const deleteEntry = useDeleteEntry();
  const submitSheet = useSubmitTimesheet();

  const [newPeriodStart, setNewPeriodStart] = useState(getWeekBounds().start);
  const [newPeriodEnd, setNewPeriodEnd] = useState(getWeekBounds().end);
  const [singleDay, setSingleDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [createMode, setCreateMode] = useState<"period" | "day">("period");
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);
  const [submitDialogId, setSubmitDialogId] = useState<string | null>(null);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

  // Get org id for departments
  const firstSheet = timesheets[0];
  const { data: departments = [] } = useDepartments(firstSheet?.organization_id);

  const activeSheet = timesheets.find((t) => t.id === activeSheetId);

  const usedDates = useMemo(() => {
    if (!activeSheet) return [];
    return (activeSheet.timesheet_entries || []).map((e) => e.work_date);
  }, [activeSheet]);

  async function handleCreateSheet() {
    const periodStart = createMode === "day" ? singleDay : newPeriodStart;
    const periodEnd = createMode === "day" ? singleDay : newPeriodEnd;
    if (!periodStart || !periodEnd) return;
    if (periodEnd < periodStart) return;
    const sheet = await upsert.mutateAsync({
      period_start: periodStart,
      period_end: periodEnd,
    });
    setActiveSheetId(sheet.id);
    setShowNewRow(true);
    setExpandedSheets((p) => new Set(p).add(sheet.id));
  }

  async function handleSaveEntry(data: any) {
    if (!activeSheet) return;
    const empId = activeSheet.employee_id;
    setSavingEntryId(data.id || "new");
    await saveEntry.mutateAsync({
      ...data,
      timesheet_id: activeSheet.id,
      employee_id: empId,
    });
    setSavingEntryId(null);
    setShowNewRow(false);
  }

  async function handleDeleteEntry(id: string) {
    await deleteEntry.mutateAsync(id);
  }

  function validateBeforeSubmit(sheet: Timesheet) {
    const entries = sheet.timesheet_entries || [];
    if (entries.length === 0) return "Add at least one entry before submitting.";
    for (const e of entries) {
      if (!e.work_date || !e.hours_worked || !e.department || !e.task_description)
        return "All entry fields are required before submission.";
    }
    const dates = entries.map((e) => e.work_date);
    const unique = new Set(dates);
    if (unique.size !== dates.length) return "Duplicate dates detected in this timesheet.";
    const totalHours = entries.reduce((s, e) => s + (e.hours_worked || 0), 0);
    if (totalHours > 24 * 7) return `Total hours (${totalHours}h) exceed 7 days × 24h.`;
    return null;
  }

  function toggleExpand(id: string) {
    setExpandedSheets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        Loading timesheets…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new timesheet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Timesheet</CardTitle>
          <CardDescription className="text-xs">
            Create either a period timesheet or a single-day timesheet, then add daily work entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={createMode === "period" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateMode("period")}
              >
                Period
              </Button>
              <Button
                type="button"
                variant={createMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateMode("day")}
              >
                Single Day
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {createMode === "period" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Period Start</Label>
                    <Input
                      type="date"
                      className="h-9 text-xs w-40"
                      value={newPeriodStart}
                      onChange={(e) => setNewPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Period End</Label>
                    <Input
                      type="date"
                      className="h-9 text-xs w-40"
                      value={newPeriodEnd}
                      min={newPeriodStart}
                      onChange={(e) => setNewPeriodEnd(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Work Day</Label>
                  <Input
                    type="date"
                    className="h-9 text-xs w-40"
                    value={singleDay}
                    onChange={(e) => setSingleDay(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateSheet}
              disabled={upsert.isPending}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-2" />
              {upsert.isPending ? "Creating…" : createMode === "day" ? "Create Day Timesheet" : "Create Timesheet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing timesheets */}
      {timesheets.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No timesheets yet. Create your first one above.
        </p>
      )}

      {timesheets.map((sheet) => {
        const cfg = STATUS_CONFIG[sheet.status];
        const StatusIcon = cfg.icon;
        const isExpanded = expandedSheets.has(sheet.id);
        const isActive = activeSheetId === sheet.id;
        const isDraft = sheet.status === "draft";
        const entries = sheet.timesheet_entries || [];
        const validationError = isDraft ? validateBeforeSubmit(sheet) : null;

        return (
          <Card
            key={sheet.id}
            className={cn(
              "transition-all",
              isActive && "ring-2 ring-primary"
            )}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 cursor-pointer"
              onClick={() => {
                setActiveSheetId(isActive ? null : sheet.id);
                toggleExpand(sheet.id);
                setShowNewRow(false);
              }}
            >
              <div className="flex items-center gap-3">
                <StatusIcon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">
                    {format(parseISO(sheet.period_start), "dd MMM")} –{" "}
                    {format(parseISO(sheet.period_end), "dd MMM yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "entry" : "entries"} ·{" "}
                    {sheet.total_hours ?? 0}h total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={cfg.variant} className="text-xs capitalize">
                  {cfg.label}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {isExpanded && (
              <>
                <Separator />
                <CardContent className="pt-4 space-y-3">
                  {/* Reviewer notes */}
                  {sheet.reviewer_notes && (
                    <div className="flex items-start gap-2 text-xs bg-muted rounded-md p-3">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>
                        <span className="font-semibold">Reviewer note: </span>
                        {sheet.reviewer_notes}
                      </span>
                    </div>
                  )}

                  {/* Existing entries */}
                  {entries.map((entry) => (
                    <TimesheetEntryRow
                      key={entry.id}
                      entry={entry as any}
                      departments={departments}
                      disabledDates={usedDates}
                      periodStart={sheet.period_start}
                      periodEnd={sheet.period_end}
                      onSave={(d) => {
                        setActiveSheetId(sheet.id);
                        handleSaveEntry(d);
                      }}
                      onDelete={isDraft ? handleDeleteEntry : undefined}
                      saving={savingEntryId === entry.id}
                    />
                  ))}

                  {/* New row */}
                  {isDraft && isActive && showNewRow && (
                    <TimesheetEntryRow
                      departments={departments}
                      disabledDates={usedDates}
                      periodStart={sheet.period_start}
                      periodEnd={sheet.period_end}
                      onSave={handleSaveEntry}
                      saving={savingEntryId === "new"}
                      isNew
                    />
                  )}

                  {/* Actions */}
                  {isDraft && (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveSheetId(sheet.id);
                          setShowNewRow(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
                      </Button>

                      <div className="ml-auto flex items-center gap-2">
                        {validationError && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {validationError}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.success("Draft saved")}
                        >
                          Save as Draft
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSubmitDialogId(sheet.id)}
                          disabled={!!validationError}
                        >
                          <SendHorizontal className="w-3.5 h-3.5 mr-1" />
                          Submit Everything
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        );
      })}

      {/* Submit confirmation dialog */}
      <AlertDialog
        open={!!submitDialogId}
        onOpenChange={(o) => !o && setSubmitDialogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Timesheet?</AlertDialogTitle>
            <AlertDialogDescription>
              All drafted entries will be submitted as a single batch for manager
              approval. You will not be able to edit them after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (submitDialogId) {
                  await submitSheet.mutateAsync(submitDialogId);
                  setSubmitDialogId(null);
                  setActiveSheetId(null);
                }
              }}
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
