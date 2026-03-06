import { useState } from "react";
import { useMyTimesheets } from "@/components/timesheets/useTimesheets";
import { CreateTimesheetDialog } from "@/components/timesheets/CreateTimesheetDialog";
import { TimesheetReviewPanel } from "@/components/timesheets/TimesheetReviewPanel";
import { RBACService } from "@/lib/services/auth/rbac";
import { Button } from "@/components/ui/button";
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
  Hourglass,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function formatMaybeDate(value?: string | null, output = "dd MMM yyyy"): string {
  if (!value) return "—";
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, output);
}

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: any;
    chipClass: string;
    dotClass: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: Clock,
    chipClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  submitted: {
    label: "Pending Approval",
    icon: Hourglass,
    chipClass: "bg-warning/15 text-warning-foreground border border-warning/30",
    dotClass: "bg-warning",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    chipClass: "bg-success/15 text-success border border-success/30",
    dotClass: "bg-success",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    chipClass: "bg-destructive/10 text-destructive border border-destructive/20",
    dotClass: "bg-destructive",
  },
};

// ─── Filter tabs definition ──────────────────────────────────────────────────

const FILTER_TABS = [
  { key: "all", label: "All", statuses: ["draft", "submitted", "approved"] },
  { key: "pending", label: "Pending Approval", statuses: ["submitted"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];
interface HoursStats {
  submittedHours: number;
  pendingCount: number;
  approvedCount: number;
}

function normalizeTimesheetStatus(rawStatus: unknown): "draft" | "submitted" | "approved" | "rejected" {
  const status = String(rawStatus ?? "")
    .trim()
    .toLowerCase();

  if (status.includes("reject")) return "rejected";
  if (status.includes("approve")) return "approved";
  if (status.includes("submit") || status.includes("pending")) return "submitted";
  return "draft";
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Timesheets() {
  const canReviewTeam =
    RBACService.isOrgAdmin() ||
    RBACService.isPlatformAdmin() ||
    RBACService.hasPermission("payroll.approve");
  const { data: timesheets = [], isLoading } = useMyTimesheets();

  const [createOpen, setCreateOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Counts per filter tab
  const counts: Record<FilterKey, number> = {
    all: timesheets.filter((t) => normalizeTimesheetStatus(t.status) !== "rejected").length,
    pending: timesheets.filter((t) => normalizeTimesheetStatus(t.status) === "submitted").length,
    approved: timesheets.filter((t) => normalizeTimesheetStatus(t.status) === "approved").length,
    rejected: timesheets.filter((t) => normalizeTimesheetStatus(t.status) === "rejected").length,
  };

  const activeTabStatuses =
    FILTER_TABS.find((t) => t.key === activeFilter)?.statuses ?? [];
  const filtered = timesheets.filter((t) =>
    (activeTabStatuses as readonly string[]).includes(normalizeTimesheetStatus(t.status))
  );
  const hoursStats: HoursStats = timesheets.reduce(
    (acc, sheet) => {
      const status = normalizeTimesheetStatus(sheet.status);
      const hours = Number(sheet.total_hours ?? 0);
      if (status !== "draft") {
        acc.submittedHours += hours;
      }
      if (status === "submitted") {
        acc.pendingCount += 1;
      }
      if (status === "approved") {
        acc.approvedCount += 1;
      }
      return acc;
    },
    {
      submittedHours: 0,
      pendingCount: 0,
      approvedCount: 0,
    }
  );

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

      {canReviewTeam ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> My Timesheets
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Review
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my" className="mt-4">
            <MyTimesheetsContent
              timesheets={timesheets}
              isLoading={isLoading}
              expanded={expanded}
              onToggle={toggle}
              onEdit={(sheet) => setEditDraft(sheet)}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              filtered={filtered}
              counts={counts}
              hoursStats={hoursStats}
            />
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            <TimesheetReviewPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <MyTimesheetsContent
          timesheets={timesheets}
          isLoading={isLoading}
          expanded={expanded}
          onToggle={toggle}
          onEdit={(sheet) => setEditDraft(sheet)}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          filtered={filtered}
          counts={counts}
          hoursStats={hoursStats}
        />
      )}

      {/* Create dialog */}
      <CreateTimesheetDialog
        open={createOpen}
        onOpenChange={(v) => setCreateOpen(v)}
      />

      {/* Edit draft dialog */}
      <CreateTimesheetDialog
        open={!!editDraft}
        onOpenChange={(v) => { if (!v) setEditDraft(null); }}
        draftTimesheet={editDraft}
      />
    </div>
  );
}

// ─── My Timesheets content (filter bar + list) ───────────────────────────────

interface MyTimesheetsContentProps {
  timesheets: any[];
  isLoading: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (sheet: any) => void;
  activeFilter: FilterKey;
  setActiveFilter: (k: FilterKey) => void;
  filtered: any[];
  counts: Record<FilterKey, number>;
  hoursStats: HoursStats;
}

function MyTimesheetsContent({
  isLoading,
  expanded,
  onToggle,
  onEdit,
  activeFilter,
  setActiveFilter,
  filtered,
  counts,
  hoursStats,
}: MyTimesheetsContentProps) {
  return (
    <div className="space-y-4">
      {/* Status filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all border",
              activeFilter === tab.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                activeFilter === tab.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {activeFilter === "all" && (
        <HoursStatsCards
          stats={hoursStats}
          onOpenPending={() => setActiveFilter("pending")}
          onOpenApproved={() => setActiveFilter("approved")}
          onOpenAll={() => setActiveFilter("all")}
        />
      )}

      {/* Status summary cards (for non-all filters show a callout) */}
      {activeFilter !== "all" && (
        <StatusBanner status={activeFilter} count={counts[activeFilter]} />
      )}

      {/* Timesheet list */}
      <TimesheetList
        timesheets={filtered}
        isLoading={isLoading}
        expanded={expanded}
        onToggle={onToggle}
        onEdit={onEdit}
        emptyMessage={
          activeFilter === "pending"
            ? "No timesheets pending approval."
            : activeFilter === "approved"
            ? "No approved timesheets yet."
            : activeFilter === "rejected"
            ? "No rejected timesheets."
            : "No timesheets yet."
        }
      />

    </div>
  );
}

function HoursStatsCards({
  stats,
  onOpenPending,
  onOpenApproved,
  onOpenAll,
}: {
  stats: HoursStats;
  onOpenPending: () => void;
  onOpenApproved: () => void;
  onOpenAll: () => void;
}) {
  const cards = [
    {
      key: "submitted",
      title: "Submitted Hours",
      subtitle: "Open all submitted timesheets",
      accent: "text-primary",
      border: "border-primary/20",
      onClick: onOpenAll,
      valueText: `${stats.submittedHours.toFixed(1)}h`,
    },
    {
      key: "pending",
      title: "Pending Timesheets",
      subtitle: "Open pending approvals",
      accent: "text-warning",
      border: "border-warning/25",
      onClick: onOpenPending,
      valueText: String(stats.pendingCount),
    },
    {
      key: "approved",
      title: "Approved Timesheets",
      subtitle: "Open approved timesheets",
      accent: "text-success",
      border: "border-success/25",
      onClick: onOpenApproved,
      valueText: String(stats.approvedCount),
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {cards.map((card) => (
        <Card
          key={card.key}
          className={cn("border cursor-pointer transition-colors hover:bg-muted/30", card.border)}
          onClick={card.onClick}
        >
          <CardContent className="py-2.5 px-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.title}</p>
            <p className={cn("text-base font-semibold mt-0.5", card.accent)}>{card.valueText}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({ status, count }: { status: FilterKey; count: number }) {
  const banners: Record<string, { bg: string; border: string; icon: any; text: string; iconColor: string }> = {
    pending: {
      bg: "bg-warning/8",
      border: "border-warning/25",
      icon: Hourglass,
      iconColor: "text-warning",
      text: `${count} timesheet${count !== 1 ? "s" : ""} awaiting manager review.`,
    },
    approved: {
      bg: "bg-success/8",
      border: "border-success/25",
      icon: CheckCircle2,
      iconColor: "text-success",
      text: `${count} timesheet${count !== 1 ? "s" : ""} approved — hours are available for payroll.`,
    },
    rejected: {
      bg: "bg-destructive/8",
      border: "border-destructive/25",
      icon: AlertTriangle,
      iconColor: "text-destructive",
      text: `${count} timesheet${count !== 1 ? "s" : ""} rejected. Review the notes and resubmit a corrected draft.`,
    },
  };

  const cfg = banners[status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-xs", cfg.bg, cfg.border)}>
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cfg.iconColor)} />
      <p className="text-foreground">{cfg.text}</p>
    </div>
  );
}

// ─── Timesheet list sub-component ────────────────────────────────────────────

interface TimesheetListProps {
  timesheets: any[];
  isLoading: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (sheet: any) => void;
  emptyMessage?: string;
}

function TimesheetList({
  timesheets,
  isLoading,
  expanded,
  onToggle,
  onEdit,
  emptyMessage = "No timesheets yet.",
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
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        <p className="text-muted-foreground/60 text-xs">
          Click "Create Timesheet" above to log your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timesheets.map((sheet) => {
        const normalizedStatus = normalizeTimesheetStatus(sheet.status);
        const cfg = STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG.draft;
        const StatusIcon = cfg.icon;
        const isExpanded = expanded.has(sheet.id);
        const entries = sheet.timesheet_entries || [];
        const isDraft = normalizedStatus === "draft";

        return (
          <Card
            key={sheet.id}
            className={cn(
              "transition-all border",
              isDraft && "border-dashed",
              normalizedStatus === "submitted" && "border-warning/30",
              normalizedStatus === "approved" && "border-success/30",
              normalizedStatus === "rejected" && "border-destructive/25",
            )}
          >
            {/* Header row */}
            <div
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
              onClick={() => onToggle(sheet.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Status dot */}
                <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dotClass)} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {formatMaybeDate(sheet.period_start, "dd MMM")}
                    {sheet.period_start !== sheet.period_end && (
                      <> – {formatMaybeDate(sheet.period_end, "dd MMM yyyy")}</>
                    )}
                    {sheet.period_start === sheet.period_end && (
                      <> {formatMaybeDate(sheet.period_start, "yyyy")}</>
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
                    "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full",
                    cfg.chipClass
                  )}
                >
                  <StatusIcon className="w-3 h-3" />
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
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No entries — edit this draft to add records.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Time In</th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Time Out</th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Hours</th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Department</th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Tasks Performed</th>
                            <th className="text-left pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">Sign</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e: any) => (
                            <tr key={e.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 whitespace-nowrap">
                                {formatMaybeDate(e.work_date, "dd MMM yyyy")}
                              </td>
                              <td className="py-2 pr-4 whitespace-nowrap">{e.time_in || "—"}</td>
                              <td className="py-2 pr-4 whitespace-nowrap">{e.time_out || "—"}</td>
                              <td className="py-2 pr-4 font-medium">{e.hours_worked}h</td>
                              <td className="py-2 pr-4 whitespace-nowrap">{e.department}</td>
                              <td className="py-2 pr-4 text-muted-foreground max-w-[200px]">{e.task_description}</td>
                              <td className="py-2 pr-4">{e.employee_sign || "—"}</td>
                              <td className="py-2">
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  STATUS_CONFIG[normalizedStatus]?.chipClass ?? "bg-muted text-muted-foreground"
                                )}>
                                  {STATUS_CONFIG[normalizedStatus]?.label ?? sheet.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="pt-3 text-muted-foreground">Total</td>
                            <td className="pt-3 font-semibold" colSpan={5}>{sheet.total_hours ?? 0}h</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {sheet.submitted_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Submitted {formatMaybeDate(sheet.submitted_at, "dd MMM yyyy 'at' HH:mm")}
                    </p>
                  )}
                  {sheet.approved_at && (
                    <p className="text-xs text-success mt-1">
                      ✓ Approved {formatMaybeDate(sheet.approved_at, "dd MMM yyyy 'at' HH:mm")}
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
