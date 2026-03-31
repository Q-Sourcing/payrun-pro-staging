import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from '@/lib/auth/OrgProvider';
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock } from "lucide-react";

const DEFAULT_PROBATION_DAYS = [15, 7, 1];
const DEFAULT_APPROVAL_DAYS = [1, 2, 3, 7];

const getNumberField = (obj: unknown, key: string): number | null => {
  if (!obj || typeof obj !== "object") return null;
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
};

export function ReminderSettings() {
  const { organizationId } = useOrg();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Probation
  const [probationPeriodDays, setProbationPeriodDays] = useState(90);
  const [enabledProbationDays, setEnabledProbationDays] = useState<number[]>(DEFAULT_PROBATION_DAYS);

  // Approval reminders
  const [approvalReminderEnabled, setApprovalReminderEnabled] = useState(false);
  const [enabledApprovalDays, setEnabledApprovalDays] = useState<number[]>([2]);

  const sortedProbationDays = useMemo(() => [...enabledProbationDays].sort((a, b) => b - a), [enabledProbationDays]);
  const sortedApprovalDays = useMemo(() => [...enabledApprovalDays].sort((a, b) => a - b), [enabledApprovalDays]);

  useEffect(() => {
    const load = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
        // Load probation period
        try {
          const { data: orgSettings, error: orgSettingsError } = await (supabase as any)
            .from("org_settings")
            .select("id, probation_period_days")
            .eq("organization_id", organizationId)
            .limit(1)
            .maybeSingle();

          if (orgSettingsError) throw orgSettingsError;

          const orgValue = getNumberField(orgSettings, "probation_period_days");
          if (orgValue && orgValue > 0) {
            setProbationPeriodDays(orgValue);
          }
        } catch {
          const { data: fallback } = await supabase
            .from("settings")
            .select("value")
            .eq("category", "organization")
            .eq("key", "probation_period_days")
            .limit(1)
            .maybeSingle();

          const fallbackValue = getNumberField(fallback, "value");
          if (fallbackValue && fallbackValue > 0) {
            setProbationPeriodDays(fallbackValue);
          }
        }

        // Load reminder rules
        try {
          const { data: rules } = await (supabase as any)
            .from("reminder_rules")
            .select("rule_type, days_before, days_after, is_active")
            .eq("organization_id", organizationId);

          if (rules && rules.length > 0) {
            const probationRules = rules.filter((r: any) => r.rule_type === "probation_expiry" && r.is_active);
            if (probationRules.length > 0) {
              setEnabledProbationDays(probationRules.map((r: any) => Number(r.days_before)).filter(Boolean));
            }

            const approvalRules = rules.filter((r: any) => r.rule_type === "approval_reminder");
            if (approvalRules.length > 0) {
              const activeApprovalRules = approvalRules.filter((r: any) => r.is_active);
              setApprovalReminderEnabled(activeApprovalRules.length > 0);
              if (activeApprovalRules.length > 0) {
                setEnabledApprovalDays(activeApprovalRules.map((r: any) => Number(r.days_after)).filter(Boolean));
              }
            }
          }
        } catch {
          // table may not exist yet
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organizationId]);

  const toggleProbationDay = (day: number, checked: boolean) => {
    setEnabledProbationDays((prev) =>
      checked ? Array.from(new Set([...prev, day])) : prev.filter((d) => d !== day)
    );
  };

  const toggleApprovalDay = (day: number, checked: boolean) => {
    setEnabledApprovalDays((prev) =>
      checked ? Array.from(new Set([...prev, day])) : prev.filter((d) => d !== day)
    );
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast({ title: "Missing organization", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(probationPeriodDays) || probationPeriodDays <= 0) {
      toast({ title: "Invalid probation period", description: "Must be a positive number of days.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update org_settings probation period
      let savedToOrgSettings = false;
      try {
        const { data: orgSettings, error: orgSettingsError } = await supabase
          .from("org_settings")
          .select("id")
          .eq("organization_id", organizationId)
          .limit(1)
          .maybeSingle();

        if (orgSettingsError) throw orgSettingsError;

        if (orgSettings?.id) {
          const { error: updateError } = await (supabase as any)
            .from("org_settings")
            .update({ probation_period_days: probationPeriodDays })
            .eq("id", orgSettings.id);

          if (!updateError) {
            savedToOrgSettings = true;
          }
        }
      } catch {
        // Fall back to the generic settings table when org_settings is missing the field.
      }

      if (!savedToOrgSettings) {
        await supabase
          .from("settings")
          .upsert({ category: "organization", key: "probation_period_days", value: probationPeriodDays });
      }

      // Save probation reminder rules
      for (const day of DEFAULT_PROBATION_DAYS) {
        await (supabase as any).from("reminder_rules").upsert({
          organization_id: organizationId,
          rule_type: "probation_expiry",
          days_before: day,
          is_active: enabledProbationDays.includes(day),
          notify_roles: ["ORG_HR", "ORG_ADMIN"],
          notification_template: "Probation for {{employee_name}} ends in {{days_before}} day(s).",
        }, { onConflict: "organization_id,rule_type,days_before" });
      }

      // Save approval reminder rules
      for (const day of DEFAULT_APPROVAL_DAYS) {
        await (supabase as any).from("reminder_rules").upsert({
          organization_id: organizationId,
          rule_type: "approval_reminder",
          days_after: day,
          is_active: approvalReminderEnabled && enabledApprovalDays.includes(day),
          notify_roles: ["ORG_ADMIN"],
          notification_template: "Payrun approval has been pending for {{days_after}} day(s). Please review.",
        }, { onConflict: "organization_id,rule_type,days_after" });
      }

      toast({ title: "Reminder settings saved", description: "All notification settings updated." });
    } catch (error: unknown) {
      toast({
        title: "Failed to save reminders",
        description: error instanceof Error ? error.message : "Unable to save reminder settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Probation Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Probation & Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure when reminders are sent for employees nearing probation end.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="probation_period_days">Default Probation Period (Days)</Label>
            <Input
              id="probation_period_days"
              type="number"
              min={1}
              value={probationPeriodDays}
              onChange={(e) => setProbationPeriodDays(Number(e.target.value || 90))}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Used to auto-calculate probation end dates from Date Joined.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Probation Expiry Reminder Days</Label>
            <div className="space-y-2">
              {DEFAULT_PROBATION_DAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={enabledProbationDays.includes(day)}
                    onCheckedChange={(checked) => toggleProbationDay(day, Boolean(checked))}
                  />
                  <span className="text-sm">{day} day(s) before expiry</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Active reminders: {sortedProbationDays.length ? sortedProbationDays.join(", ") : "none"} day(s).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Approval Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval Reminders
          </CardTitle>
          <CardDescription>
            Automatically remind approvers when a payrun has been waiting too long for action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Approval Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Send reminder notifications to pending approvers after a set number of days.
              </p>
            </div>
            <Switch
              checked={approvalReminderEnabled}
              onCheckedChange={setApprovalReminderEnabled}
            />
          </div>

          {approvalReminderEnabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Remind After (Days Without Action)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_APPROVAL_DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={enabledApprovalDays.includes(day)}
                        onCheckedChange={(checked) => toggleApprovalDay(day, Boolean(checked))}
                      />
                      <span className="text-sm">After {day} day{day > 1 ? "s" : ""}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reminders will be sent: {sortedApprovalDays.length ? sortedApprovalDays.map(d => `day ${d}`).join(", ") : "none"} after submission.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Reminder Settings"}
      </Button>
    </div>
  );
}
