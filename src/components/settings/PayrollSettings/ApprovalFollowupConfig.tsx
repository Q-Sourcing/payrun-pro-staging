import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { workflowService } from "@/lib/services/workflow.service";
import { ApprovalWorkflowFollowup } from "@/lib/types/workflow";

interface ApprovalFollowupConfigProps {
  workflowId: string;
}

export const ApprovalFollowupConfig = ({ workflowId }: ApprovalFollowupConfigProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(false);
  const [followupType, setFollowupType] = useState<'one_time' | 'repeat'>('one_time');
  const [daysAfter, setDaysAfter] = useState(2);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [sendAt, setSendAt] = useState('09:00');

  useEffect(() => {
    loadFollowup();
  }, [workflowId]);

  const loadFollowup = async () => {
    setLoading(true);
    try {
      const data = await workflowService.getFollowup(workflowId);
      if (data) {
        setIsEnabled(data.is_enabled);
        setFollowupType(data.followup_type);
        setDaysAfter(data.days_after);
        setRepeatInterval(data.repeat_interval_days || 1);
        setSendAt(data.send_at_time || '09:00');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await workflowService.saveFollowup(workflowId, {
        is_enabled: isEnabled,
        followup_type: followupType,
        days_after: daysAfter,
        repeat_interval_days: followupType === 'repeat' ? repeatInterval : undefined,
        send_at_time: sendAt,
      });
      toast({ title: "Follow-up settings saved" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save follow-up settings", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const previewText = isEnabled
    ? followupType === 'repeat'
      ? `Approvers will be reminded after ${daysAfter} day(s), then every ${repeatInterval} day(s) until actioned.`
      : `Approvers will receive a one-time reminder after ${daysAfter} day(s) of inactivity.`
    : 'Follow-up reminders are disabled for this workflow.';

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Follow-up Settings
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure automatic reminders for approvers who haven't actioned their step.
        </p>
      </div>

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <div>
          <Label className="text-sm font-medium">Send follow-up to approvers</Label>
          <p className="text-xs text-muted-foreground">Enable automatic follow-up reminders</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
      </div>

      {isEnabled && (
        <div className="space-y-4 pl-1">
          {/* Type */}
          <RadioGroup value={followupType} onValueChange={(v) => setFollowupType(v as 'one_time' | 'repeat')} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="one_time" id="ft-once" />
              <Label htmlFor="ft-once" className="cursor-pointer text-sm">One time</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="repeat" id="ft-repeat" />
              <Label htmlFor="ft-repeat" className="cursor-pointer text-sm">Repeat</Label>
            </div>
          </RadioGroup>

          {/* Days after */}
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Send after</Label>
            <Input type="number" min={1} max={30} value={daysAfter} onChange={e => setDaysAfter(Number(e.target.value))}
              className="w-20 h-8" />
            <span className="text-sm text-muted-foreground">day(s) of inactivity</span>
          </div>

          {/* Repeat interval */}
          {followupType === 'repeat' && (
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Repeat every</Label>
              <Input type="number" min={1} max={30} value={repeatInterval} onChange={e => setRepeatInterval(Number(e.target.value))}
                className="w-20 h-8" />
              <span className="text-sm text-muted-foreground">day(s)</span>
            </div>
          )}

          {/* Send at time */}
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Send at</Label>
            <Input type="time" value={sendAt} onChange={e => setSendAt(e.target.value)} className="w-32 h-8" />
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="p-3 bg-muted rounded-md border">
        <p className="text-xs text-muted-foreground italic">{previewText}</p>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save Follow-up
        </Button>
      </div>
    </div>
  );
};
