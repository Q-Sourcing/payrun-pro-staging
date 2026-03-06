import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, differenceInMinutes, parse } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Trash2, Loader2, Send, FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// ── Schema ────────────────────────────────────────────────────────────────────

const recordSchema = z.object({
  work_date: z.string().min(1, "Date is required"),
  department: z.string().min(1, "Department is required"),
  time_in: z.string().min(1, "Time In is required"),
  time_out: z.string().min(1, "Time Out is required"),
  hours_worked: z
    .number({ invalid_type_error: "Enter hours" })
    .min(0.5, "Min 0.5h")
    .max(24, "Max 24h"),
  employee_sign: z.string().optional(),
  task_description: z.string().min(5, "Min 5 characters"),
});

const formSchema = z.object({
  records: z.array(recordSchema).min(1, "Add at least one record"),
});

type FormValues = z.infer<typeof formSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyRecord() {
  return {
    work_date: "",
    department: "",
    time_in: "",
    time_out: "",
    hours_worked: 8,
    employee_sign: "",
    task_description: "",
  };
}

/** Calculate decimal hours between two HH:MM strings. Returns null on invalid. */
function calcHours(timeIn: string, timeOut: string): number | null {
  if (!timeIn || !timeOut) return null;
  try {
    const base = new Date(2000, 0, 1);
    const inD = parse(timeIn, "HH:mm", base);
    let outD = parse(timeOut, "HH:mm", base);
    // Handle overnight shifts
    if (outD <= inD) outD = new Date(outD.getTime() + 24 * 60 * 60 * 1000);
    const mins = differenceInMinutes(outD, inD);
    return Math.round((mins / 60) * 2) / 2; // round to nearest 0.5
  } catch {
    return null;
  }
}

async function fetchMyEmployee() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("employees")
    .select("id, organization_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draftTimesheet?: {
    id: string;
    period_start: string;
    period_end: string;
    timesheet_entries?: any[];
    organization_id: string;
    employee_id: string;
  } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateTimesheetDialog({ open, onOpenChange, draftTimesheet }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      records:
        draftTimesheet?.timesheet_entries && draftTimesheet.timesheet_entries.length > 0
          ? draftTimesheet.timesheet_entries.map((e) => ({
              work_date: e.work_date,
              department: e.department,
              time_in: e.time_in || "",
              time_out: e.time_out || "",
              hours_worked: e.hours_worked,
              employee_sign: e.employee_sign || "",
              task_description: e.task_description,
            }))
          : [emptyRecord()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "records",
  });

  // Auto-calculate hours when time changes
  function handleTimeChange(index: number, field: "time_in" | "time_out", value: string) {
    form.setValue(`records.${index}.${field}`, value);
    const records = form.getValues("records");
    const rec = records[index];
    const tin = field === "time_in" ? value : rec.time_in;
    const tout = field === "time_out" ? value : rec.time_out;
    const computed = calcHours(tin, tout);
    if (computed !== null && computed > 0) {
      form.setValue(`records.${index}.hours_worked`, computed, { shouldValidate: false });
    }
  }

  function findDuplicates(records: FormValues["records"]) {
    const dates = records.map((r) => r.work_date).filter(Boolean);
    return dates.filter((d, i) => dates.indexOf(d) !== i);
  }

  async function persist(status: "draft" | "submitted") {
    const valid = await form.trigger();
    if (!valid) return;

    const records = form.getValues("records");
    const dupes = findDuplicates(records);
    if (dupes.length > 0) {
      toast.error(`Duplicate dates: ${dupes.join(", ")}`);
      return;
    }

    const totalHours = records.reduce((s, r) => s + (r.hours_worked || 0), 0);
    if (totalHours > 168) {
      toast.error(`Total hours (${totalHours}h) exceed the 168h limit.`);
      return;
    }

    setSubmitting(true);
    try {
      const emp = await fetchMyEmployee();
      if (!emp) throw new Error("No employee record found for your account.");

      const sorted = [...records].sort((a, b) => a.work_date.localeCompare(b.work_date));
      const period_start = sorted[0].work_date;
      const period_end = sorted[sorted.length - 1].work_date;

      let timesheetId = draftTimesheet?.id;

      if (timesheetId) {
        await supabase
          .from("timesheets")
          .update({
            period_start,
            period_end,
            status,
            ...(status === "submitted" ? { submitted_at: new Date().toISOString() } : {}),
          })
          .eq("id", timesheetId);
        await supabase.from("timesheet_entries").delete().eq("timesheet_id", timesheetId);
      } else {
        const { data: sheet, error: sheetErr } = await supabase
          .from("timesheets")
          .insert({
            organization_id: emp.organization_id,
            employee_id: emp.id,
            period_start,
            period_end,
            status,
            ...(status === "submitted" ? { submitted_at: new Date().toISOString() } : {}),
          })
          .select()
          .single();
        if (sheetErr) throw sheetErr;
        timesheetId = sheet.id;
      }

      const entries = records.map((r) => ({
        timesheet_id: timesheetId!,
        employee_id: emp.id,
        work_date: r.work_date,
        hours_worked: r.hours_worked,
        department: r.department,
        task_description: r.task_description,
        time_in: r.time_in || null,
        time_out: r.time_out || null,
        employee_sign: r.employee_sign || null,
      }));

      const { error: entriesErr } = await supabase.from("timesheet_entries").insert(entries);
      if (entriesErr) throw entriesErr;

      qc.invalidateQueries({ queryKey: ["my-timesheets"] });
      toast.success(status === "submitted" ? "Timesheet submitted!" : "Saved as draft.");
      onOpenChange(false);
      form.reset({ records: [emptyRecord()] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save timesheet");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {draftTimesheet ? "Edit Draft Timesheet" : "Create Timesheet"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-6">
            {fields.map((field, index) => (
              <RecordCard
                key={field.id}
                index={index}
                form={form}
                total={fields.length}
                onRemove={() => remove(index)}
                onTimeChange={handleTimeChange}
              />
            ))}

            {/* Add another */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() => append(emptyRecord())}
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Add Another Record
            </Button>
          </div>

          {/* Summary */}
          {fields.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span>{fields.length} record{fields.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>
                {form
                  .watch("records")
                  .reduce((s, r) => s + (r.hours_worked || 0), 0)
                  .toFixed(1)}h total
              </span>
              <Badge variant="outline" className="text-[10px] py-0">
                Supervisor fields filled during approval
              </Badge>
            </div>
          )}
        </Form>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => persist("draft")}
            className="w-full sm:w-auto"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => persist("submitted")}
            className="w-full sm:w-auto"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit All Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── RecordCard sub-component ──────────────────────────────────────────────────

interface RecordCardProps {
  index: number;
  form: any;
  total: number;
  onRemove: () => void;
  onTimeChange: (index: number, field: "time_in" | "time_out", value: string) => void;
}

function RecordCard({ index, form, total, onRemove, onTimeChange }: RecordCardProps) {
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Record {index + 1}
        </p>
        {total > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Row 1: Date + Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date */}
          <FormField
            control={form.control}
            name={`records.${index}.work_date`}
            render={({ field: f }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs">Date <span className="text-destructive">*</span></FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9 text-xs",
                          !f.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {f.value ? format(parseISO(f.value), "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={f.value ? parseISO(f.value) : undefined}
                      onSelect={(d) => f.onChange(d ? format(d, "yyyy-MM-dd") : "")}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Department */}
          <FormField
            control={form.control}
            name={`records.${index}.department`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className="text-xs">Department <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    className="h-9 text-xs"
                    placeholder="e.g. Engineering, Finance…"
                    {...f}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Time In + Time Out + Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Time In */}
          <FormField
            control={form.control}
            name={`records.${index}.time_in`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className="text-xs">Time In <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    className="h-9 text-xs"
                    value={f.value}
                    onChange={(e) => onTimeChange(index, "time_in", e.target.value)}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Time Out */}
          <FormField
            control={form.control}
            name={`records.${index}.time_out`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className="text-xs">Time Out <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    className="h-9 text-xs"
                    value={f.value}
                    onChange={(e) => onTimeChange(index, "time_out", e.target.value)}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Hours Worked */}
          <FormField
            control={form.control}
            name={`records.${index}.hours_worked`}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Hours{" "}
                  <span className="text-muted-foreground font-normal">(auto-calculated)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    className="h-9 text-xs"
                    {...f}
                    onChange={(e) => f.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Tasks Performed */}
        <FormField
          control={form.control}
          name={`records.${index}.task_description`}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-xs">Tasks Performed <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea
                  className="text-xs min-h-[80px] resize-y"
                  placeholder="Describe all tasks performed during this work period in detail…"
                  rows={3}
                  {...f}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Row 4: Employee Sign */}
        <FormField
          control={form.control}
          name={`records.${index}.employee_sign`}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-xs">Sign (Employee)</FormLabel>
              <FormControl>
                <Input
                  className="h-9 text-xs"
                  placeholder="Type your full name or initials as your signature…"
                  {...f}
                />
              </FormControl>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Your typed name serves as your digital acknowledgment of this record.
              </p>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Row 5: Supervisor fields (read-only info) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Supervisor's Comments</p>
            <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
              Filled by supervisor during approval
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Supervisor's &amp; HR's Sign</p>
            <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
              Confirmed upon approval
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
