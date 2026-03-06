import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, Trash2, Loader2, Send, FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentTimesheetEmployee } from "./useTimesheets";

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
type Meridiem = "AM" | "PM";

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

interface TimeParts {
  hour12: string;
  minute: string;
  meridiem: Meridiem;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyRecord() {
  return {
    work_date: "",
    department: "",
    time_in: "08:00",
    time_out: "17:00",
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

function parseTimeTo12HourParts(value: string): TimeParts {
  const [hourRaw, minuteRaw] = (value || "").split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour12: "08", minute: "00", meridiem: "AM" };
  }

  const meridiem: Meridiem = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

  return {
    hour12: String(normalizedHour).padStart(2, "0"),
    minute: String(Math.max(0, Math.min(59, minute))).padStart(2, "0"),
    meridiem,
  };
}

function to24HourTime(parts: TimeParts): string {
  const hour = Number(parts.hour12);
  const minute = Number(parts.minute);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "08:00";

  let normalizedHour = hour % 12;
  if (parts.meridiem === "PM") normalizedHour += 12;

  return `${String(normalizedHour).padStart(2, "0")}:${String(
    Math.max(0, Math.min(59, minute))
  ).padStart(2, "0")}`;
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
  const [pendingAction, setPendingAction] = useState<"draft" | "submitted" | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      records:
        draftTimesheet?.timesheet_entries && draftTimesheet.timesheet_entries.length > 0
          ? draftTimesheet.timesheet_entries.map((e) => ({
              work_date: e.work_date,
              department: e.department,
              time_in: e.time_in || "08:00",
              time_out: e.time_out || "17:00",
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

  useEffect(() => {
    if (!open) return;

    if (draftTimesheet) {
      const nextRecords =
        draftTimesheet.timesheet_entries && draftTimesheet.timesheet_entries.length > 0
          ? draftTimesheet.timesheet_entries.map((e) => ({
              work_date: e.work_date,
              department: e.department,
              time_in: e.time_in || "08:00",
              time_out: e.time_out || "17:00",
              hours_worked: e.hours_worked,
              employee_sign: e.employee_sign || "",
              task_description: e.task_description,
            }))
          : [emptyRecord()];

      form.reset({ records: nextRecords });
      return;
    }

    // Fresh create mode
    form.reset({ records: [emptyRecord()] });
  }, [open, draftTimesheet, form]);

  // Validate for duplicate dates within the form
  function findDuplicates(records: FormValues["records"]) {
    const dates = records.map((r) => r.work_date).filter(Boolean);
    return dates.filter((d, i) => dates.indexOf(d) !== i);
  }

  async function persist(status: "draft" | "submitted") {
    if (submitting) return;
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
    setPendingAction(status);
    try {
      const emp = await getCurrentTimesheetEmployee();
      if (!emp) throw new Error("No employee record found for your account.");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to submit timesheets.");

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
            ...(status === "submitted"
              ? { submitted_at: new Date().toISOString(), submitted_by: user.id }
              : {}),
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
            ...(status === "submitted"
              ? { submitted_at: new Date().toISOString(), submitted_by: user.id }
              : {}),
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
      setPendingAction(null);
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
            {submitting && pendingAction === "draft" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => persist("submitted")}
            className="w-full sm:w-auto"
          >
            {submitting && pendingAction === "submitted" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit
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

interface Time12SelectProps {
  value?: string;
  onChange: (value: string) => void;
}

function Time12Select({ value, onChange }: Time12SelectProps) {
  const parsed = parseTimeTo12HourParts(value || "08:00");

  const update = (next: Partial<TimeParts>) => {
    onChange(
      to24HourTime({
        hour12: next.hour12 ?? parsed.hour12,
        minute: next.minute ?? parsed.minute,
        meridiem: next.meridiem ?? parsed.meridiem,
      })
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={parsed.hour12} onValueChange={(v) => update({ hour12: v })}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Hour" />
        </SelectTrigger>
        <SelectContent>
          {HOUR_OPTIONS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={parsed.minute} onValueChange={(v) => update({ minute: v })}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Minute" />
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map((minute) => (
            <SelectItem key={minute} value={minute}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={parsed.meridiem} onValueChange={(v: Meridiem) => update({ meridiem: v })}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
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
                  <Time12Select
                    value={f.value}
                    onChange={(value) => onTimeChange(index, "time_in", value)}
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
                  <Time12Select
                    value={f.value}
                    onChange={(value) => onTimeChange(index, "time_out", value)}
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

      </div>
    </div>
  );
}
