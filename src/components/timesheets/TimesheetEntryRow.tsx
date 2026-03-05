import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Save, Trash2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  work_date: z.string().min(1, "Date is required"),
  hours_worked: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0.5, "Min 0.5 hours")
    .max(24, "Max 24 hours per day"),
  department: z.string().min(1, "Department is required"),
  task_description: z.string().min(5, "Describe the task (min 5 chars)"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  entry?: {
    id?: string;
    work_date: string;
    hours_worked: number;
    department: string;
    task_description: string;
  };
  departments: string[];
  disabledDates: string[]; // dates already used in other rows
  periodStart: string;
  periodEnd: string;
  onSave: (data: FormData & { id?: string }) => void;
  onDelete?: (id: string) => void;
  saving?: boolean;
  isNew?: boolean;
}

export function TimesheetEntryRow({
  entry,
  departments,
  disabledDates,
  periodStart,
  periodEnd,
  onSave,
  onDelete,
  saving,
  isNew,
}: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      work_date: entry?.work_date ?? "",
      hours_worked: entry?.hours_worked ?? 8,
      department: entry?.department ?? "",
      task_description: entry?.task_description ?? "",
    },
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        work_date: entry.work_date,
        hours_worked: entry.hours_worked,
        department: entry.department,
        task_description: entry.task_description,
      });
    }
  }, [entry]);

  const periodStartDate = parseISO(periodStart);
  const periodEndDate = parseISO(periodEnd);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((d) => onSave({ ...d, id: entry?.id }))}
        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-border rounded-lg bg-card"
      >
        {/* Date Picker */}
        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="work_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs h-9",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {field.value
                          ? format(parseISO(field.value), "dd MMM yyyy")
                          : "Pick date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : "")}
                      disabled={(d) => {
                        const ds = format(d, "yyyy-MM-dd");
                        return (
                          d < periodStartDate ||
                          d > periodEndDate ||
                          (disabledDates.includes(ds) && ds !== field.value)
                        );
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Hours */}
        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="hours_worked"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    className="h-9 text-xs"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Department */}
        <div className="md:col-span-3">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select dept." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Task Description */}
        <div className="md:col-span-4">
          <FormField
            control={form.control}
            name="task_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Task Description</FormLabel>
                <FormControl>
                  <Textarea
                    className="text-xs min-h-[36px] resize-none"
                    placeholder="Describe the work performed..."
                    rows={1}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="md:col-span-1 flex items-end gap-1 pb-0.5">
          <Button type="submit" size="sm" className="h-9 px-2" disabled={saving}>
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
          </Button>
          {entry?.id && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-destructive hover:text-destructive"
              onClick={() => onDelete(entry.id!)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
