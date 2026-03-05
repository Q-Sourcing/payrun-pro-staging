// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";

const STATUS_OPTIONS = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "extended", label: "Extended" },
  { value: "failed", label: "Failed" },
];

const STATUS_COLORS: Record<string, string> = {
  not_applicable: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  extended: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface Props {
  employeeId: string;
  initialProbationEndDate: string | null;
  initialProbationStatus: string | null;
  initialProbationNotes: string | null;
  onUpdated: () => void;
}

export function ProbationSection({
  employeeId,
  initialProbationEndDate,
  initialProbationStatus,
  initialProbationNotes,
  onUpdated,
}: Props) {
  const [endDate, setEndDate] = useState(initialProbationEndDate ?? "");
  const [status, setStatus] = useState(initialProbationStatus ?? "not_applicable");
  const [notes, setNotes] = useState(initialProbationNotes ?? "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const daysRemaining = endDate
    ? differenceInDays(parseISO(endDate), new Date())
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          probation_end_date: endDate || null,
          probation_status: status,
          probation_notes: notes || null,
        })
        .eq("id", employeeId);
      if (error) throw error;
      toast({ title: "Probation details saved" });
      onUpdated();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Probation Period
        </CardTitle>
        <Badge className={STATUS_COLORS[status] || ""}>{STATUS_OPTIONS.find((s) => s.value === status)?.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Days remaining alert */}
        {daysRemaining !== null && status === "active" && (
          <Alert variant={daysRemaining <= 7 ? "destructive" : daysRemaining <= 30 ? "default" : "default"}>
            {daysRemaining <= 7 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            <AlertDescription>
              {daysRemaining < 0
                ? `Probation ended ${Math.abs(daysRemaining)} day(s) ago — please update the status.`
                : daysRemaining === 0
                ? "Probation ends today!"
                : `${daysRemaining} day(s) remaining until ${format(parseISO(endDate), "MMM d, yyyy")}`}
            </AlertDescription>
          </Alert>
        )}
        {status === "completed" && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Probation has been successfully completed.</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Probation End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add probation review notes, observations, or outcomes..."
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Probation Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
