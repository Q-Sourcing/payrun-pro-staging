import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, RotateCcw } from "lucide-react";
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

interface ApprovalWorkflowMessagesProps {
  workflowId: string;
}

export const ApprovalWorkflowMessages = ({ workflowId }: ApprovalWorkflowMessagesProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<MessageEventType>('submitted');
  const [messages, setMessages] = useState<Record<string, Partial<ApprovalWorkflowMessage>>>({});

  useEffect(() => {
    loadMessages();
  }, [workflowId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await workflowService.getMessages(workflowId);
      const map: Record<string, Partial<ApprovalWorkflowMessage>> = {};
      data.forEach(m => { map[m.event_type] = m; });
      setMessages(map);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getCurrentMessage = (): Partial<ApprovalWorkflowMessage> => {
    return messages[activeEvent] || DEFAULT_TEMPLATES[activeEvent];
  };

  const updateCurrentMessage = (updates: Partial<ApprovalWorkflowMessage>) => {
    setMessages(prev => ({
      ...prev,
      [activeEvent]: { ...getCurrentMessage(), ...updates },
    }));
  };

  const handleSave = async () => {
    setSaving(activeEvent);
    try {
      const msg = getCurrentMessage();
      await workflowService.saveMessage(workflowId, {
        event_type: activeEvent,
        from_type: (msg.from_type || 'system') as MessageFromType,
        to_type: (msg.to_type || 'current_approver') as MessageToType,
        subject: msg.subject || '',
        body_content: msg.body_content || '',
        is_active: msg.is_active !== false,
      });
      toast({ title: "Message template saved" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
    setSaving(null);
  };

  const handleReset = () => {
    const defaults = DEFAULT_TEMPLATES[activeEvent];
    setMessages(prev => ({ ...prev, [activeEvent]: defaults }));
  };

  const insertVariable = (variable: string) => {
    const msg = getCurrentMessage();
    updateCurrentMessage({ body_content: (msg.body_content || '') + ' ' + variable });
  };

  // Live preview with sample values
  const renderPreview = (template: string) => {
    const sampleValues: Record<string, string> = {
      '{{total_gross}}': 'UGX 12,500,000',
      '{{pay_period}}': '1 Mar 2026 – 31 Mar 2026',
      '{{approver_name}}': 'John Doe',
      '{{submitter_name}}': 'Jane Smith',
      '{{org_name}}': 'Acme Corporation',
      '{{current_level}}': '2',
      '{{total_levels}}': '3',
      '{{rejection_reason}}': 'Salary discrepancy in line 45',
      '{{workflow_name}}': 'Standard Approval',
      '{{due_date}}': '15 Mar 2026',
      '{{action_url}}': 'https://payroll.example.com/my-approvals',
    };
    let result = template;
    Object.entries(sampleValues).forEach(([k, v]) => {
      result = result.split(k).join(v);
    });
    return result;
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const msg = getCurrentMessage();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Email Templates
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customize email notifications for each approval event in this workflow.
        </p>
      </div>

      {/* Event tabs */}
      <Tabs value={activeEvent} onValueChange={(v) => setActiveEvent(v as MessageEventType)}>
        <TabsList className="w-full">
          {(Object.keys(MESSAGE_EVENT_LABELS) as MessageEventType[]).map(evt => (
            <TabsTrigger key={evt} value={evt} className="text-xs flex-1">
              {MESSAGE_EVENT_LABELS[evt]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 space-y-4">
          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">From</Label>
              <Select value={msg.from_type || 'system'} onValueChange={(v) => updateCurrentMessage({ from_type: v as MessageFromType })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="submitter">Submitter</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">To</Label>
              <Select value={msg.to_type || 'current_approver'} onValueChange={(v) => updateCurrentMessage({ to_type: v as MessageToType })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_approver">Current Approver</SelectItem>
                  <SelectItem value="all_approvers">All Approvers</SelectItem>
                  <SelectItem value="submitter">Submitter</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Subject</Label>
            <Input className="h-8 text-xs" value={msg.subject || ''} onChange={e => updateCurrentMessage({ subject: e.target.value })} />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Body</Label>
            <Textarea className="min-h-[120px] text-xs font-mono" value={msg.body_content || ''}
              onChange={e => updateCurrentMessage({ body_content: e.target.value })} />
          </div>

          {/* Variable chips */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Insert Variable</Label>
            <div className="flex flex-wrap gap-1">
              {MESSAGE_VARIABLES.map(v => (
                <Badge key={v} variant="outline" className="cursor-pointer text-[10px] hover:bg-primary/10"
                  onClick={() => insertVariable(v)}>
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Live Preview</Label>
            <div className="p-3 border rounded-md bg-muted/30 space-y-1">
              <p className="text-xs font-semibold">{renderPreview(msg.subject || '')}</p>
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{renderPreview(msg.body_content || '')}</pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset to default
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!!saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Template
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
};
