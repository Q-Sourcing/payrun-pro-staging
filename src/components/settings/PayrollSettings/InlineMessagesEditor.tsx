// @ts-nocheck
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Settings2, Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { workflowService } from "@/lib/services/workflow.service";
import {
  ApprovalWorkflowMessage,
  MessageEventType,
  MessageFromType,
  MessageToType,
  MESSAGE_EVENT_LABELS,
  MESSAGE_VARIABLES,
} from "@/lib/types/workflow";

const DEFAULT_TEMPLATES: Record<MessageEventType, { subject: string; body_content: string; from_type: MessageFromType; to_type: MessageToType }> = {
  submitted: {
    subject: "Payrun {{pay_period}} requires your approval",
    body_content: "Hi {{approver_name}},\n\nA payrun for {{pay_period}} totaling {{total_gross}} has been submitted for your approval.\n\nPlease review it at: {{action_url}}\n\nThanks,\n{{org_name}}",
    from_type: 'system',
    to_type: 'current_approver',
  },
  approved: {
    subject: "Payrun {{pay_period}} has been approved",
    body_content: "Hi {{submitter_name}},\n\nThe payrun for {{pay_period}} totaling {{total_gross}} has been fully approved.\n\nYou can proceed to finalize it at: {{action_url}}\n\nThanks,\n{{org_name}}",
    from_type: 'system',
    to_type: 'submitter',
  },
  rejected: {
    subject: "Payrun {{pay_period}} was rejected",
    body_content: "Hi {{submitter_name}},\n\nThe payrun for {{pay_period}} was rejected.\n\nReason: {{rejection_reason}}\n\nPlease review and resubmit at: {{action_url}}\n\nThanks,\n{{org_name}}",
    from_type: 'system',
    to_type: 'submitter',
  },
  followup: {
    subject: "Reminder: Payrun {{pay_period}} is awaiting your approval",
    body_content: "Hi {{approver_name}},\n\nA payrun for {{pay_period}} has been waiting for your approval.\n\nPlease take action at: {{action_url}}\n\nThanks,\n{{org_name}}",
    from_type: 'system',
    to_type: 'current_approver',
  },
};

const TAB_LABELS: Record<MessageEventType, string> = {
  submitted: 'On Submission',
  approved: 'On Approval',
  rejected: 'On Rejection',
  followup: 'Reminder',
};

interface InlineMessagesEditorProps {
  workflowId?: string | null;
  messages: Record<string, Partial<ApprovalWorkflowMessage>>;
  onChange: (messages: Record<string, Partial<ApprovalWorkflowMessage>>) => void;
}

export const InlineMessagesEditor = ({
  workflowId,
  messages,
  onChange,
}: InlineMessagesEditorProps) => {
  const [activeEvent, setActiveEvent] = useState<MessageEventType>('submitted');
  const [loading, setLoading] = useState(false);

  // Load persisted messages when workflowId becomes available
  useEffect(() => {
    if (!workflowId) return;
    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await workflowService.getMessages(workflowId);
        if (data.length > 0) {
          const map: Record<string, Partial<ApprovalWorkflowMessage>> = {};
          data.forEach(m => { map[m.event_type] = m; });
          onChange(map);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadMessages();
  }, [workflowId]);

  const getCurrentMessage = (): Partial<ApprovalWorkflowMessage> => {
    return messages[activeEvent] || DEFAULT_TEMPLATES[activeEvent];
  };

  const updateCurrentMessage = (updates: Partial<ApprovalWorkflowMessage>) => {
    onChange({
      ...messages,
      [activeEvent]: { ...getCurrentMessage(), ...updates },
    });
  };

  const handleReset = () => {
    const defaults = DEFAULT_TEMPLATES[activeEvent];
    onChange({ ...messages, [activeEvent]: defaults });
  };

  const insertVariable = (variable: string, field: 'subject' | 'body_content') => {
    const msg = getCurrentMessage();
    const current = msg[field] || '';
    updateCurrentMessage({ [field]: current + ' ' + variable });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
      </div>
    );
  }

  const msg = getCurrentMessage();

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <Tabs value={activeEvent} onValueChange={(v) => setActiveEvent(v as MessageEventType)}>
        <TabsList className="w-full">
          {(Object.keys(TAB_LABELS) as MessageEventType[]).map(evt => (
            <TabsTrigger key={evt} value={evt} className="text-xs flex-1">
              {TAB_LABELS[evt]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Email composer */}
      <div className="space-y-3">
        {/* From */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              From <span className="text-destructive">✱</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-primary cursor-pointer hover:underline">Add: Cc</span>
              <span className="text-[10px] text-primary cursor-pointer hover:underline">Bcc</span>
              <span className="text-[10px] text-primary cursor-pointer hover:underline">Reply To</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={msg.from_type || 'system'} onValueChange={(v) => updateCurrentMessage({ from_type: v as MessageFromType })}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="submitter">Submitter</SelectItem>
                <SelectItem value="approver">Person performing this action</SelectItem>
              </SelectContent>
            </Select>
            <button className="h-8 w-8 flex items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* To */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">
            To <span className="text-destructive">✱</span>
          </Label>
          <Select value={msg.to_type || 'current_approver'} onValueChange={(v) => updateCurrentMessage({ to_type: v as MessageToType })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="System options" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_approver">Current Approver</SelectItem>
              <SelectItem value="all_approvers">All Approvers</SelectItem>
              <SelectItem value="submitter">Submitter</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Subject <span className="text-destructive">✱</span>
            </Label>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Insert variable"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input
            className="h-8 text-xs"
            value={msg.subject || ''}
            onChange={e => updateCurrentMessage({ subject: e.target.value })}
            placeholder="Email subject…"
          />
        </div>

        {/* Body */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Body</Label>
            <span className="text-[10px] text-primary cursor-pointer hover:underline">Edit Email Template →</span>
          </div>
          <Textarea
            className="min-h-[120px] text-xs font-mono"
            value={msg.body_content || ''}
            onChange={e => updateCurrentMessage({ body_content: e.target.value })}
            placeholder="Email body with {{variable}} syntax…"
          />
        </div>

        {/* Variable chips */}
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Insert Variable</Label>
          <div className="flex flex-wrap gap-1">
            {MESSAGE_VARIABLES.map(v => (
              <Badge
                key={v}
                variant="outline"
                className="cursor-pointer text-[10px] hover:bg-primary/10"
                onClick={() => insertVariable(v, 'body_content')}
              >
                {v}
              </Badge>
            ))}
          </div>
        </div>

        {/* Attachments placeholder */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Attachments</Label>
          <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Upload from Desktop / Cloud / Select Templates
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3 mr-1" /> Reset to default
          </Button>
        </div>
      </div>
    </div>
  );
};
