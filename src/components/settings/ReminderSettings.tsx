import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_RULE_DAYS = [15, 7, 1];

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
  const [probationPeriodDays, setProbationPeriodDays] = useState(90);
  const [enabledDays, setEnabledDays] = useState<number[]>(DEFAULT_RULE_DAYS);

  const sortedEnabledDays = useMemo(
    () => [...enabledDays].sort((a, b) => b - a),
    [enabledDays],
  );

  useEffect(() => {
    const load = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
        // Load probation period from org_settings when available.
        const { data: orgSettings } = await supabase
          .from("org_settings")
          .select("id, probation_period_days")
          .eq("organization_id", organizationId)
          .limit(1)
          .maybeSingle();

        const orgValue = getNumberField(orgSettings, "probation_period_days");
        if (orgValue && orgValue > 0) {
          setProbationPeriodDays(orgValue);
        } else {
          // Fallback to generic settings key if org_settings row is missing.
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

        // Load active reminder rules for probation expiry.
        try {
          const { data: rules, error: rulesError } = await (supabase as any)
            .from("reminder_rules")
            .select("days_before, is_active")
            .eq("organization_id", organizationId)
            .eq("rule_type", "probation_expiry");

          if (!rulesError && rules && rules.length > 0) {
            const active = (rules as Array<{ days_before: number; is_active: boolean }>)
              .filter((r) => r.is_active)
              .map((r) => Number(r.days_before))
              .filter((n) => !Number.isNaN(n));
            if (active.length > 0) {
              setEnabledDays(Array.from(new Set(active)));
            }
          }
        } catch {
          // reminder_rules table may not exist yet — silently skip
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [organizationId]);

  const toggleDay = (day: number, checked: boolean) => {
    setEnabledDays((prev) => {
      if (checked) return Array.from(new Set([...prev, day]));
      return prev.filter((d) => d !== day);
    });
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast({
        title: "Missing organization",
        description: "No active organization was found.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(probationPeriodDays) || probationPeriodDays <= 0) {
      toast({
        title: "Invalid probation period",
        description: "Probation period must be a positive number of days.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update existing org_settings row (preferred).
      const { data: orgSettings } = await supabase
        .from("org_settings")
        .select("id")
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

      if (orgSettings?.id) {
        const { error } = await (supabase as any)
          .from("org_settings")
          .update({ probation_period_days: probationPeriodDays })
          .eq("id", orgSettings.id);
        if (error) throw error;
      } else {
        // Fallback storage if org_settings row isn't present.
        const { error } = await supabase
          .from("settings")
          .upsert({
            category: "organization",
            key: "probation_period_days",
            value: probationPeriodDays,
          });
        if (error) throw error;
      }

      // Upsert default rule days and toggle active flags according to selection.
      for (const day of DEFAULT_RULE_DAYS) {
        const { error } = await (supabase as any)
          .from("reminder_rules")
          .upsert({
            organization_id: organizationId,
            rule_type: "probation_expiry",
            days_before: day,
            is_active: enabledDays.includes(day),
            notify_roles: ["ORG_HR", "ORG_ADMIN"],
            notification_template: "Probation for {{employee_name}} ends in {{days_before}} day(s).",
          });
        if (error) throw error;
      }

      toast({
        title: "Reminder settings saved",
        description: "Probation tracking and reminder settings were updated.",
      });
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
    <Card>
      <CardHeader>
        <CardTitle>Probation & Reminder Settings</CardTitle>
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
          />
          <p className="text-xs text-muted-foreground">
            Employees on probation use this value to auto-calculate probation end dates from Date Joined.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Probation Expiry Reminder Days</Label>
          <div className="space-y-2">
            {DEFAULT_RULE_DAYS.map((day) => (
              <label key={day} className="flex items-center gap-2">
                <Checkbox
                  checked={enabledDays.includes(day)}
                  onCheckedChange={(checked) => toggleDay(day, Boolean(checked))}
                />
                <span className="text-sm">{day} day(s) before expiry</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Active reminders: {sortedEnabledDays.length ? sortedEnabledDays.join(", ") : "none"} day(s).
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Reminder Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

