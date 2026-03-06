import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
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
import { CalendarIcon, Plus, Trash2, Loader2, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDepartments } from "./useTimesheets";

const recordSchema = z.object({
  work_date: z.string().min(1, "Date is required"),
  department: z.string().min(1, "Department is required"),
  hours_worked: z
    .number({ invalid_type_error: "Enter hours" })
    .min(0.5, "Min 0.5h")
    .max(24, "Max 24h"),
  task_description: z.string().min(5, "Min 5 characters"),
});

const formSchema = z.object({
  records: z.array(recordSchema).min(1, "Add at least one record"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** If provided, pre-fill entries from a draft timesheet for editing */
  draftTimesheet?: {
    id: string;
    period_start: string;
    period_end: string;
    timesheet_entries?: any[];
    organization_id: string;
    employee_id: string;
  } | null;
}

function emptyRecord() {
  return { work_date: "", department: "", hours_worked: 8, task_description: "" };
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

export function CreateTimesheetDialog({ open, onOpenChange, draftTimesheet }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Use first entry's org for departments, or try to load it
  const [orgId, setOrgId] = useState<string | undefined>(
    draftTimesheet?.organization_id
  );
  const { data: departments = [] } = useDepartments(orgId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      records:
        draftTimesheet?.timesheet_entries && draftTimesheet.timesheet_entries.length > 0
          ? draftTimesheet.timesheet_entries.map((e) => ({
              work_date: e.work_date,
              department: e.department,
              hours_worked: e.hours_worked,
              task_description: e.task_description,
            }))
          : [emptyRecord()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "records",
  });

  // Validate for duplicate dates within the form
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
      toast.error(`Duplicate dates detected: ${dupes.join(", ")}`);
      return;
    }

    const totalHours = records.reduce((s, r) => s + (r.hours_worked || 0), 0);
    if (totalHours > 168) {
      toast.error(`Total hours (${totalHours}h) exceed the 168h weekly limit.`);
      return;
    }

    setSubmitting(true);
    try {
      const emp = await fetchMyEmployee();
      if (!emp) throw new Error("No employee record found for your account.");

      if (!orgId) setOrgId(emp.organization_id);

      // Determine period from first/last dates
      const sorted = [...records].sort((a, b) =>
        a.work_date.localeCompare(b.work_date)
      );
      const period_start = sorted[0].work_date;
      const period_end = sorted[sorted.length - 1].work_date;

      let timesheetId = draftTimesheet?.id;

      if (timesheetId) {
        // Update existing draft
        await supabase
          .from("timesheets")
          .update({
            period_start,
            period_end,
            status,
            ...(status === "submitted"
              ? { submitted_at: new Date().toISOString() }
              : {}),
          })
          .eq("id", timesheetId);

        // Delete old entries and re-insert
        await supabase
          .from("timesheet_entries")
          .delete()
          .eq("timesheet_id", timesheetId);
      } else {
        // Create new timesheet
        const { data: sheet, error: sheetErr } = await supabase
          .from("timesheets")
          .insert({
            organization_id: emp.organization_id,
            employee_id: emp.id,
            period_start,
            period_end,
            status,
            ...(status === "submitted"
              ? { submitted_at: new Date().toISOString() }
              : {}),
          })
          .select()
          .single();
        if (sheetErr) throw sheetErr;
        timesheetId = sheet.id;
      }

      // Insert all entries
      const entries = records.map((r) => ({
        timesheet_id: timesheetId!,
        employee_id: emp.id,
        work_date: r.work_date,
        hours_worked: r.hours_worked,
        department: r.department,
        task_description: r.task_description,
      }));

      const { error: entriesErr } = await supabase
        .from("timesheet_entries")
        .insert(entries);
      if (entriesErr) throw entriesErr;

      qc.invalidateQueries({ queryKey: ["my-timesheets"] });

      if (status === "submitted") {
        toast.success("Timesheet submitted for approval!");
      } else {
        toast.success("Timesheet saved as draft.");
      }

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {draftTimesheet ? "Edit Draft Timesheet" : "Create Timesheet"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Record {index + 1}
                  </p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Date */}
                  <FormField
                    control={form.control}
                    name={`records.${index}.work_date`}
                    render={({ field: f }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Date</FormLabel>
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
                                {f.value
                                  ? format(parseISO(f.value), "dd MMM yyyy")
                                  : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={f.value ? parseISO(f.value) : undefined}
                              onSelect={(d) =>
                                f.onChange(d ? format(d, "yyyy-MM-dd") : "")
                              }
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
                        <FormLabel className="text-xs">Department</FormLabel>
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

                  {/* Hours Worked */}
                  <FormField
                    control={form.control}
                    name={`records.${index}.hours_worked`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Hours Worked</FormLabel>
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

                  {/* Task Description */}
                  <FormField
                    control={form.control}
                    name={`records.${index}.task_description`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Description of Work Done</FormLabel>
                        <FormControl>
                          <Textarea
                            className="text-xs min-h-[36px] resize-none"
                            placeholder="Describe the work performed…"
                            rows={2}
                            {...f}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            {/* Add Another Record */}
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
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
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
            {submitting ? (
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
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit All Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
