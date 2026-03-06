import { useState } from "react";
import { useAllTimesheets, useReviewTimesheet } from "./useTimesheets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function TimesheetReviewPanel() {
  const { data: sheets = [], isLoading } = useAllTimesheets();
  const review = useReviewTimesheet();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogSheet, setDialogSheet] = useState<{ id: string; action: "approved" | "rejected" } | null>(null);
  const [notes, setNotes] = useState("");

  function toggle(id: string) {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleReview() {
    if (!dialogSheet) return;
    await review.mutateAsync({ timesheetId: dialogSheet.id, action: dialogSheet.action, notes });
    setDialogSheet(null);
    setNotes("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No submitted timesheets to review.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Review submitted timesheets by employee, expand any item to inspect full entries, then approve or reject with an optional note.
      </p>
      {sheets.map((sheet: any) => {
        const entries = sheet.timesheet_entries || [];
        const emp = sheet.employees;
        const isExpanded = expanded.has(sheet.id);

        return (
          <Card key={sheet.id}>
            <div
              className="flex items-center justify-between px-5 py-3 cursor-pointer"
              onClick={() => toggle(sheet.id)}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">
                    {emp?.first_name} {emp?.last_name}{" "}
                    <span className="text-muted-foreground font-normal text-xs">
                      ({emp?.employee_number})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(sheet.period_start), "dd MMM")} –{" "}
                    {format(parseISO(sheet.period_end), "dd MMM yyyy")} ·{" "}
                    {sheet.total_hours ?? 0}h · {entries.length} entries
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-0.5 rounded-full capitalize",
                    STATUS_COLORS[sheet.status] || "bg-muted text-muted-foreground"
                  )}
                >
                  {sheet.status}
                </span>
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
                <CardContent className="pt-4 space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Hours</TableHead>
                        <TableHead className="text-xs">Department</TableHead>
                        <TableHead className="text-xs">Task Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs">
                            {format(parseISO(e.work_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {e.hours_worked}h
                          </TableCell>
                          <TableCell className="text-xs">{e.department}</TableCell>
                          <TableCell className="text-xs">{e.task_description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-muted-foreground">
                      Submitted {sheet.submitted_at ? format(parseISO(sheet.submitted_at), "dd MMM yyyy HH:mm") : "—"}
                    </div>
                    {sheet.status === "submitted" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDialogSheet({ id: sheet.id, action: "rejected" });
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> ❌ Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            setDialogSheet({ id: sheet.id, action: "approved" });
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ✅ Approve
                        </Button>
                      </div>
                    )}
                    {sheet.reviewer_notes && (
                      <p className="text-xs text-muted-foreground italic">
                        "{sheet.reviewer_notes}"
                      </p>
                    )}
                  </div>
                  {sheet.status === "approved" && (
                    <p className="text-xs text-muted-foreground">
                      Approved hours are now available for payroll aggregation in the pay run flow.
                    </p>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        );
      })}

      {/* Review Dialog */}
      <Dialog open={!!dialogSheet} onOpenChange={(o) => !o && setDialogSheet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogSheet?.action === "approved" ? "Approve Timesheet" : "Reject Timesheet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Add a note for the employee…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSheet(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={review.isPending}
              className={
                dialogSheet?.action === "approved"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }
            >
              {review.isPending
                ? "Processing…"
                : dialogSheet?.action === "approved"
                ? "Confirm Approve"
                : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
