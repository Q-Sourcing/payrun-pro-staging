import { useState } from "react";
import { useMyTimesheets } from "@/components/timesheets/useTimesheets";
import { CreateTimesheetDialog } from "@/components/timesheets/CreateTimesheetDialog";
import { TimesheetReviewPanel } from "@/components/timesheets/TimesheetReviewPanel";
import { RBACService } from "@/lib/services/auth/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Clock,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive"; icon: any; className: string }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
  submitted: {
    label: "Submitted",
    variant: "default",
    icon: Send,
    className: "bg-primary/10 text-primary",
  },
  approved: {
    label: "Approved",
    variant: "default",
    icon: CheckCircle2,
    className: "bg-accent text-accent-foreground",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

export default function Timesheets() {
  const isManager = RBACService.isOrgAdmin() || RBACService.isPlatformAdmin();
  const { data: timesheets = [], isLoading } = useMyTimesheets();

  const [createOpen, setCreateOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Timesheets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Log your daily work hours and submit them for manager approval.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Create Timesheet
        </Button>
      </div>

      {isManager ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> My Timesheets
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Review Team
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my" className="mt-4">
            <TimesheetList
              timesheets={timesheets}
              isLoading={isLoading}
              expanded={expanded}
              onToggle={toggle}
              onEdit={(sheet) => setEditDraft(sheet)}
            />
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            <TimesheetReviewPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <TimesheetList
          timesheets={timesheets}
          isLoading={isLoading}
          expanded={expanded}
          onToggle={toggle}
          onEdit={(sheet) => setEditDraft(sheet)}
        />
      )}

      {/* Create dialog */}
      <CreateTimesheetDialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
        }}
      />

      {/* Edit draft dialog */}
      <CreateTimesheetDialog
        open={!!editDraft}
        onOpenChange={(v) => {
          if (!v) setEditDraft(null);
        }}
        draftTimesheet={editDraft}
      />
    </div>
  );
}

// ─── Timesheet list sub-component ─────────────────────────────────────────────

interface TimesheetListProps {
  timesheets: any[];
  isLoading: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (sheet: any) => void;
}

function TimesheetList({
  timesheets,
  isLoading,
  expanded,
  onToggle,
  onEdit,
}: TimesheetListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Loading timesheets…
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Clock className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">No timesheets yet.</p>
        <p className="text-muted-foreground/60 text-xs">
          Click "Create Timesheet" above to log your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timesheets.map((sheet) => {
        const cfg = STATUS_CONFIG[sheet.status] ?? STATUS_CONFIG.draft;
        const StatusIcon = cfg.icon;
        const isExpanded = expanded.has(sheet.id);
        const entries = sheet.timesheet_entries || [];
        const isDraft = sheet.status === "draft";

        return (
          <Card
            key={sheet.id}
            className={cn(
              "transition-all border",
              isDraft && "border-dashed"
            )}
          >
            {/* Header row */}
            <div
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
              onClick={() => onToggle(sheet.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon
                  className={cn("w-4 h-4 shrink-0", isDraft ? "text-muted-foreground" : "text-primary")}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {format(parseISO(sheet.period_start), "dd MMM")}
                    {sheet.period_start !== sheet.period_end && (
                      <> – {format(parseISO(sheet.period_end), "dd MMM yyyy")}</>
                    )}
                    {sheet.period_start === sheet.period_end && (
                      <> {format(parseISO(sheet.period_start), "yyyy")}</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "entry" : "entries"} ·{" "}
                    {sheet.total_hours ?? 0}h total
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-0.5 rounded-full",
                    cfg.className
                  )}
                >
                  {cfg.label}
                </span>
                {isDraft && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(sheet);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded entries */}
            {isExpanded && (
              <>
                <Separator />
                <CardContent className="pt-4 pb-4">
                  {/* Reviewer note */}
                  {sheet.reviewer_notes && (
                    <div className="flex items-start gap-2 text-xs bg-muted border border-border rounded-md p-3 mb-4">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
                      <span>
                        <span className="font-semibold">Reviewer note: </span>
                        {sheet.reviewer_notes}
                      </span>
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No entries — edit this draft to add records.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">
                              Date
                            </th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">
                              Department
                            </th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground">
                              Hours
                            </th>
                            <th className="text-left pb-2 font-medium text-muted-foreground">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e: any) => (
                            <tr key={e.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 whitespace-nowrap">
                                {format(parseISO(e.work_date), "dd MMM yyyy")}
                              </td>
                              <td className="py-2 pr-4 whitespace-nowrap">{e.department}</td>
                              <td className="py-2 pr-4 font-medium">{e.hours_worked}h</td>
                              <td className="py-2 text-muted-foreground">{e.task_description}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2} className="pt-3 text-muted-foreground">
                              Total
                            </td>
                            <td className="pt-3 font-semibold" colSpan={2}>
                              {sheet.total_hours ?? 0}h
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {sheet.submitted_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Submitted{" "}
                      {format(parseISO(sheet.submitted_at), "dd MMM yyyy 'at' HH:mm")}
                    </p>
                  )}
                  {sheet.approved_at && (
                    <p className="text-xs text-primary mt-1">
                      Approved{" "}
                      {format(parseISO(sheet.approved_at), "dd MMM yyyy 'at' HH:mm")}
                    </p>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
